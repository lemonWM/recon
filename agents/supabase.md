# Recon — Supabase i model danych

Gdzie leżą dane, jak są powiązane, struktura tabel. Pliki SQL w `sql/`.
Kręgosłup projektu i historia decyzji są w `agent.md`.

---

### Gdzie leżą dane [PROPOZYCJA]

Wszystko w Supabase, w trzech osobnych miejscach:
- **Supabase Storage** — oryginalne PDF-y umów (żeby dało się otworzyć źródło).
- **Tabela z pgvector** — fragmenty umów: tekst, embedding, metadane (która umowa, który
  klient, który paragraf, od kiedy do kiedy obowiązuje).
- **Zwykłe tabele Postgresa** — klienci, umowy, faktury, pozycje, niezgodności, ewaluacja.

Dwie zasady:
- **Faktury nie idą do RAG-a.** Faktura to liczby i pola, więc ląduje w tabelach. RAG jest
  dla tekstu umów.
- **Faktur nie ma w HubSpocie.** Tabele Supabase udają system księgowy. Tak jest w prawdziwych
  firmach: klient i umowa w CRM, faktury w księgowości, Recon łączy oba światy.

---

### Powiązania: faktura → umowa → deal

```
HubSpot                          Supabase
-------                          --------
Firma (klient)          <->      customers
  └─ Deal (umowa)       <->      contracts
       │                           ├─ fragmenty umowy (do RAG-a)
       │                           └─ faktury → pozycje faktur
       └─ Ticket        <->      findings (niezgodności)
```

- **Jeden deal = jedna umowa** z konkretnym klientem. Klient może mieć kilka deali, czyli
  kilka umów. [USTALONE]
- **Faktury leżą tylko w Supabase**, pod umową. Jedna umowa ma ich wiele (np. jedną na
  miesiąc). Do HubSpota wraca tylko wynik: ticket przy dealu. [USTALONE]
- **RAG nie zgaduje, która to umowa.** Powiązanie faktury z umową to zwykła relacja
  w tabelach (`contract_id`). RAG szuka tylko właściwego paragrafu w umowie, którą już znamy,
  wśród fragmentów obowiązujących w dniu faktury.
- **Na start generator wpisuje `contract_id` wprost na fakturze.** [USTALONE] Trudniejszy
  wariant na później: faktura ma tylko klienta, klient ma kilka umów i system sam dopasowuje.

Przykład: faktura z marca 2026 na 5000 zł ma `contract_id = 12`. Wyszukiwanie w umowie 12
trafia na §4.2 "od stycznia każdego roku stawka rośnie o inflację". Ocena: powinno być
5200 zł, brakuje 200 zł, cytat §4.2.

---

### Status faktury

Pole w tabeli faktur od pierwszego dnia (nazwy robocze):
- `niesprawdzona`
- `zgodna`
- `niezgodna`
- `brak podstawy` — uczciwe "nie wiem", umowa tego nie reguluje
- `błąd` — sprawdzenie się nie udało, do ponowienia

Ten status mówi, co jeszcze trzeba zeskanować, i jest podstawą znaczników w aplikacji
(sekcja 7).


---

## Projekt Supabase [USTALONE 13.10]

- Projekt `recon`, region **West EU (Irlandia), eu-west-1** (poprawione 27.10: wcześniej
  błędnie zapisany Frankfurt; potwierdza to host poolera `aws-0-eu-west-1`). Darmowy plan.
- Rozszerzenie **`vector` (pgvector 0.8.2)** włączone, schemat `extensions`.
- Przy zakładaniu: **Data API wyłączone**, automatyczne wystawianie nowych tabel wyłączone,
  **automatyczne RLS włączone**. Powód: panel nie rozmawia z Supabase po dane (tylko
  logowanie), a n8n łączy się wprost do Postgresa i pisze SQL — wyszukiwanie wektorowe to
  zapytanie z sortowaniem po odległości, czego REST API i tak dobrze nie obsłuży.
  RLS nie przeszkadza, bo n8n łączy się jako właściciel bazy.
- **Struktura powstaje jako pliki SQL w `sql/`**, numerowane w kolejności zakładania
  (tabela faktur odwołuje się do umów, więc musi powstać później). Dzięki temu bazę da się
  odtworzyć od zera jedną komendą, a zmiany widać w historii gita.
- Darmowy projekt usypia po okresie bezczynności — podtrzymuje go przepływ
  `RECON - KEEPALIVE` (sekcja 7, `agents/hubspot.md`).

## Tabele

### `customers` i `contracts` — `sql/001_customers_contracts.sql` [13.10]

Lustro danych z CRM, wypełniane przez synchronizację. Nazwy neutralne, żeby Salesforce
trafił do tych samych tabel (sekcja 5).

- **`crm_source` + `crm_id` zamiast `hubspot_id`.** `crm_source` wpisuje n8n jako stałą
  (`hubspot` w przepływie HS, `salesforce` w przepływie SF) — CRM sam się nie przedstawia.
  Ograniczenie `check` na dozwolone wartości, bo literówka (`HubSpot` zamiast `hubspot`)
  omijałaby warunek unikalności i robiła duplikaty wszystkich deali.
- **`crm_id` jako tekst**, bo HubSpot daje liczby, a Salesforce ciągi w rodzaju
  `006Qy00000A1bC2IAJ`.
- **`unique (crm_source, crm_id)`** to serce synchronizacji: jeden deal z jednego CRM-u
  może być w bazie raz. Dzięki temu n8n robi zapis typu „jak istnieje, to zaktualizuj",
  zamiast sprawdzać przed każdym wstawieniem.
- **`crm_url`** — gotowy link do rekordu, który HubSpot oddaje w polu `url`
  (`agents/hubspot.md`). Panel go tylko wyświetla, nie zna formatu adresów żadnego CRM-u.
- **`status`** z `check`: `no_contract` (brak PDF-a), `unreadable` (PDF bez tekstu),
  `read` (umowa odczytana). Odpowiada stanom z makiety. Świadomie `check`, a nie typ
  wyliczeniowy — dopisanie wartości to jedna linijka.
- **`file_name` / `file_path`** — nazwa pokazywana w panelu i ścieżka pliku w Storage.
- **Czego tu nie ma:** liczby faktur, kwot, liczby niezgodności. Wyliczamy je z faktur
  w chwili pytania (sekcja 4), żeby zapisana suma nie rozjechała się z rzeczywistością.


### `invoices` i `invoice_lines` — `sql/003_invoices.sql` [14.10]

Faktury istnieją **tylko w Supabase**; generator udaje system księgowy. Nie idą do RAG-a —
faktura to liczby i pola, więc zwykłe tabele i zwykły SQL (sekcja 4).

Łańcuch powiązań: `customers ← contracts ← invoices ← invoice_lines`.

- **Faktura wskazuje na umowę, nie na klienta.** Klienta da się wyliczyć przez umowę, więc
  go nie kopiujemy — ta sama zasada co z sumami: nie zapisujemy tego, co da się wyprowadzić.
- **`invoices.contract_id` wskazuje na wewnętrzny `contracts.id`**, nie na `crm_id`
  [USTALONE 14.10, po rozważeniu alternatyw]. Dzięki temu faktury nic nie wiedzą o CRM-ie
  i przy dojściu Salesforce ich tabela się nie zmienia.
  - Rozważone i odrzucone: powiązanie po parze `crm_source` + `crm_id` (poprawne, ale
    wciąga CRM do tabeli faktur) oraz po samym `crm_id` (wymagałoby osobnego warunku
    unikalności, czyli założenia, że identyfikatory z różnych CRM-ów nigdy się nie zrównają).
  - Obawa Arta — że po skasowaniu wierszy numery wewnętrzne się zmieniają i faktury
    osierocą — znika dzięki `references`: Postgres nie pozwoli usunąć umowy, która ma
    faktury. Do tego umów i tak nie kasujemy, tylko archiwizujemy.
  - Art zaznaczył, że nie w pełni się z tym zgadza (woli widzieć deal wprost przy
    fakturze). Powstał był widok `invoices_with_deal` jako kompromis, ale **usunięty
    14.10** — po przejściu przez łańcuch powiązań okazał się zbędny. Gdyby wrócił:
    widok niczego nie przechowuje, więc nie może się rozjechać z tabelami.
- **`numeric`, nigdy `float`** na kwoty. Liczby zmiennoprzecinkowe nie zapisują dokładnie
  nawet 0,10, a narzędzie, którego wartością jest znalezienie brakujących 200, nie może
  samo produkować groszy znikąd. `unit_price` ma cztery miejsca (stawki bywają
  dokładniejsze niż kwota końcowa), kwoty dwa.
- **Sześć statusów faktury** zgodnie z makietą: `ready`, `scanning`, `compliant`,
  `mismatch`, `no_basis`, `error`. `scanning` trzymamy w bazie, bo panel czyta wszystko
  z Supabase i musi wiedzieć, która faktura jest właśnie sprawdzana.
- **`unique (contract_id, number)`** — generator można puścić dwa razy bez duplikatów.
- **`on delete cascade` przy pozycjach** (inaczej niż przy umowach): pozycja bez faktury
  nie ma sensu, a umowy chronimy archiwizacją.
- **Pozycje w osobnej tabeli, nie w kolumnie JSON.** Zasada: jeden wiersz na jedną rzecz.
  Faktura ma zmienną liczbę pozycji, a kolumn nie da się mnożyć. Przy osobnej tabeli każda
  pozycja jest pełnoprawnym wierszem, po którym da się filtrować i liczyć — potrzebne przy
  typach błędów 2 i 3 (rabat po terminie, pozycja spoza umowy).
- **`invoice_lines` nie ma znaczników czasu** — pozycji faktury się nie edytuje,
  od tego jest korekta.

## `file_name` i `file_path` — co tam trafia [USTALONE 26.10]

Obie kolumny stoją w `contracts` od `sql/001` i do 26.10 były puste. Wypełnia je
synchronizacja, czytając załącznik deala (droga opisana w `agents/hubspot.md`).

- **`file_name`** — nazwa pliku z rozszerzeniem, np. `MSA-2025-014.pdf`. API plików zwraca
  nazwę **bez** rozszerzenia, więc trzeba ją skleić.
- **`file_path`** — **adres do pobrania pliku przez przepływ**, czyli `url` z API plików.
  Nie jest to link dla użytkownika.

**Dlaczego tak.** Plik jest prywatny, więc każdy działający adres wymaga klucza. Panel
klucza nie ma i nie ma go dostawać, więc nie linkuje do pliku — pokazuje nazwę i odsyła do
deala w CRM-ie. Gdyby kiedyś trzeba było pokazać sam dokument, n8n musiałby generować
podpisany adres na żądanie.

**Pusty `file_path` jest jedyną prawdą o braku umowy.** Recon nie zna żadnej flagi
z generatora — patrzy wyłącznie na to, czy ma plik. Pole `fileName` w `terms.js` mówi
tylko generatorowi, czy ma wyprodukować PDF, i nigdzie nie wychodzi poza generator.

**Stan 26.10:** 83 faktury (Halden 22, Brightwater 20, Ostrava 24, Kessler 17, Lumen 0),
pięć umów, pięć klientów.

**Status `unreadable` w `contracts.status` przestał być używany** — decyzja z 26.10
ogranicza stany umowy do dwóch: jest albo jej nie ma. Wartość zostaje w ograniczeniu
kolumny do czasu sprzątania; osobna migracja dla samego porządku nie ma sensu.

## `sql/004` — stan `attached` [26.10]

Kolumna `status` miała trzy wartości i **żadna nie opisywała sytuacji „plik jest, ale
jeszcze go nie przeczytaliśmy"**. Po dołożeniu odczytu załączników wszystkie pięć umów
siedziało na `no_contract`, co dla czterech z nich było nieprawdą.

Po zmianie dozwolone są trzy wartości: `no_contract`, `attached`, `read`.
`unreadable` usunięty zgodnie z decyzją z 26.10.

**Kto ustawia co:**

- **synchronizacja** — `no_contract` gdy nie ma pliku, `attached` gdy plik jest nowy lub
  podmieniony
- **krok czytający umowę** (jeszcze nie istnieje) — przesuwa `attached` na `read`

Synchronizacja nigdy nie ustawia `read`, bo nie wie, czy dokument został przetworzony.
Gdyby ustawiała, kłamałaby.

**Reguła w `on conflict`, która chroni pracę kroku czytającego:**

```sql
status = case
	when excluded.file_path is null then 'no_contract'
	when contracts.file_path is distinct from excluded.file_path then 'attached'
	else contracts.status
end
```

Nie ma pliku — brak umowy. Plik się zmienił albo doszedł — do przeczytania. **Ten sam plik
co wcześniej — nie ruszaj**, bo inaczej każde uruchomienie synchronizacji kasowałoby wynik
przetwarzania i dokument byłby czytany w kółko.

Przy okazji rozwiązuje to podmianę umowy: nowy PDF na dealu to nowy adres, więc status sam
wraca na `attached` i dokument idzie do ponownego przeczytania.

**Pułapka przy wdrażaniu [26.10].** Wiersze zapisane przed istnieniem tego stanu miały już
`file_path`, więc warunek „plik się nie zmienił" trzymał je na `no_contract` w nieskończoność.
Potrzebne było jednorazowe wyrównanie:

```sql
update contracts
set status = 'attached', updated_at = now()
where file_path is not null and status = 'no_contract';
```

Błąd tego rodzaju nie wychodzi na świeżej bazie — tylko na danych, które mają historię.

**Plik `sql/004` dopisany 27.10.** Migracja była wykonana 26.10 wprost w Supabase i pliku
w repozytorium brakowało. `004_contracts_status_attached.sql` odtwarza ją z ograniczenia,
które faktycznie siedzi w bazie. Nie uruchamiać ponownie.

## `contract_chunks` — `sql/005_contract_chunks.sql` [27.10]

Fragmenty umów do wyszukiwania. Jeden wiersz = jedna klauzula z metadanymi.

```
customers ← contracts ← invoices ← invoice_lines
                     ← contract_chunks
```

- **`contract_id` → `contracts.id`**, tak jak faktury. Wyszukiwanie zawsze najpierw
  filtruje po umowie, więc stawka Haldena nigdy nie trafi do oceny faktury Ostravy,
  nawet jeśli brzmi tak samo. Indeks na `contract_id`.
- Kolumny: `chunk_index`, `part`, `section_title`, `clause_no`, `valid_from`,
  `page_start`, `page_end`, `text`, `embedding vector(1024)`, `embedding_model`.
- **`embedding` puste do kroku embeddingów.** Liczby opisują znaczenie, nie kodują
  tekstu; Claude czyta kolumnę `text`.
- **`on delete cascade`**: pod fragmentem nic nie wisi. Przy ponownym odczycie umowy stare
  fragmenty kasujemy i wstawiamy nowe.
- **`unique (contract_id, chunk_index)`.**
- Bez indeksu wektorowego (decyzja 13.10): przy ~137 fragmentach wynik dokładny.

## Storage — bucket `contracts_files` [27.10]

- **Prywatny**, limit 10 MB, tylko `application/pdf`.
- Ścieżka: `{crm_id}/{fileMd5}.pdf`, np. `525864985795/0e5b64d4d9ff07678a58706b4b44fb97.pdf`.
  Folder = deal, nazwa = odcisk treści z HubSpota.
- Wgrywa synchronizacja, czyta `RECON - CONTRACT - READ`. Dostęp z n8n przez credential
  `Supabase Recon Storage` (typ Supabase API, klucz secret), osobno od `Supabase Recon`
  (Postgres).
- **Zmiana znaczenia `contracts.file_path` [27.10]:** zamiast adresu API plików HubSpota
  (opis z 26.10 wyżej jest nieaktualny) trzyma **ścieżkę w buckecie**. Zmiana ścieżki
  = zmiana treści pliku → reguła z `sql/004` ustawia `attached`. Przejście nie wymagało
  ręcznej zmiany w bazie: pierwsza synchronizacja po zmianie przepisała ścieżki.
- **Stan 27.10:** 4 pliki, rozmiary zgodne z HubSpotem (7050, 6635, 6487, 6307 B).
