# Recon — n8n

Przepływy, wyzwalacze, nazewnictwo, credentiale, zapytania panelu.
Kręgosłup projektu i historia decyzji są w `agent.md`.

---

## 6. PRZEPŁYWY I WYZWALACZE [PROPOZYCJA]

Trzy osobne przepływy w n8n:

1. **Indeksowanie umów.** Nowa umowa → pobranie PDF → tekst → podział na klauzule →
   embeddingi → pgvector. Na start źródłem jest plik w Supabase Storage, w tygodniu CRM
   podmieniamy na deal "wygrany" w HubSpocie.
   **Jak umowa trafia do systemu z HubSpota** [USTALONE]: handlowiec przypina PDF do deala
   zwykłym, natywnym załącznikiem HubSpota. n8n zauważa nowy plik przy najbliższej
   synchronizacji (przepływ 4), pobiera go i odczytuje.
   Nowy rekord powstaje w Supabase (`contracts` z ID deala + fragmenty), w HubSpocie nic
   nowego się nie tworzy, bo deal już jest umową.
   Zasada na start [USTALONE]: **jeden PDF na deal i to on jest umową.** Bez rozpoznawania,
   który plik jest umową, dopóki nie będzie to potrzebne.
   Aneksy dołożymy później jako
   kolejne pliki z datą obowiązywania. Dane testowe wgrywa skrypt przez API, ręcznie
   najwyżej kilka umów do demo.
2. **Skan faktur.** Faktura ze statusem `niesprawdzona` → wyszukanie właściwych zapisów umowy →
   ocena Claude'a z cytatem → zapis `finding` → ticket w HubSpocie.
3. **Pętla zwrotna (później).** Ticket zamknięty jako "fałszywy alarm" → informacja wraca
   do Recona.
4. **Synchronizacja** [PROPOZYCJA, doszła przy makiecie 10.10]. n8n pyta CRM o deale
   oznaczone polem `deal_recon` i porównuje je z Supabase. Nowy deal dopisuje. Nowy
   lub podmieniony PDF umowy oddaje do przepływu 1. Synchronizacja nie skanuje faktur
   i nie pyta AI o zgodność. To jedyne miejsce, w którym Recon czyta z CRM.
   - **Nowy deal** to deal, który jest w CRM, a nie ma go jeszcze w Supabase (brak wiersza
     z jego `crm_id`). Czy ma umowę, to osobna sprawa: z PDF-em idzie do odczytu umowy,
     bez PDF-a dostaje status "No contract".
   - **Które deale wchodzą do Recona** [USTALONE 11.10]: tylko deale z własnym polem
     na dealu. W HubSpocie pole już istnieje: etykieta `DEAL_RECON`, nazwa wewnętrzna
     **`deal_recon`** (założył Art na koncie `recon`). n8n przy synchronizacji pyta
     tylko o deale, w których to pole jest zaznaczone. **Typ potwierdzony 12.10:
     pojedynczy checkbox.** Uwaga: API oddaje jego wartość jako tekst `"true"`,
     a nie jako wartość logiczną, więc filtr w n8n porównuje do napisu. W Salesforce odpowiednikiem
     będzie takie samo pole checkbox (`Deal_Recon__c`) na obiekcie, który zagra rolę
     deala (Opportunity albo Contract, do decyzji w etapie 3). Odrzucona alternatywa:
     wszystkie deale na etapie "wygrany".

**Jak zbierają się dane, krok po kroku** [PROPOZYCJA 10.10]. Trzy osobne rzeczy, każda
z własnym wyzwalaczem:
1. **Synchronizacja** (otwarcie aplikacji): lista deali z CRM → porównanie z Supabase →
   dopisanie nowych → aplikacja dostaje aktualną listę z Supabase. Szybkie.
2. **Odczyt umowy** (deal ma PDF, którego Recon jeszcze nie czytał): pobranie PDF-a →
   tekst → klauzule → embeddingi → pgvector. Wolniejsze niż sama lista. Uruchamia go
   synchronizacja i na start czeka na jego koniec (sekcja 4), a dla jednego deala także
   przycisk na ekranie "No contract".
3. **Faktury:** nie są skądkolwiek dociągane w chwili kliknięcia. Leżą już w Supabase
   (generator udaje system księgowy). Po odczycie umowy jej faktury pokazują się jako
   "Ready to scan". Skan dalej tylko po kliknięciu przycisku.

Wyzwalacze [USTALONE 10.10]:
- **Etap 1: ręcznie w n8n.** Każdy przepływ odpalamy przyciskiem "uruchom" podczas budowy
  i testów.
- **Etap 2: webhook z panelu.** Przycisk skanu woła webhook n8n. Synchronizację
  uruchamia samo otwarcie aplikacji (też przez webhook).
- **Bez harmonogramu.** Żaden przepływ nie działa "co jakiś czas".

Co uruchamia odczyt umowy, skoro nic nie dzieje się samo: synchronizacja przy otwarciu
aplikacji (przepływ 4). Powiadomienie z HubSpota przy przypięciu pliku odpada, bo wymaga
automatyzacji po stronie CRM (zasada 6 w sekcji 5). W etapie 1 synchronizację uruchamiamy
ręcznie w n8n.

Zostało do decyzji: na ekranach "No contract" i "Contract unreadable" makieta mówi jeszcze
"Recon reads it on its own" i ma przycisk "Look for an attachment now". Propozycja: tekst
"Recon reads it at the next sync", przycisk "Sync now".

Do rozstrzygnięcia na starcie etapu: w wersji z dostawcami SQL najpierw wyłapywał "podejrzane"
pozycje (np. skok ceny). Po stronie sprzedażowej niedofakturowanie wygląda jak zwykła faktura,
więc pewnie sprawdzamy **każdą fakturę / każdy okres rozliczeniowy**, a nie tylko podejrzane.
Zmienia to koszt i liczbę wywołań modelu.

---

---

### Zapytania panelu do n8n [PROPOZYCJA]

Lista deali, szczegóły deala (faktury), synchronizacja, skan, pytanie do AI. Każde to
osobny webhook w n8n. Dłuższa praca (skan wielu faktur, odczyt umowy): albo jedno
zapytanie na fakturę, albo n8n od razu odpowiada "przyjąłem" i panel co kilka sekund pyta,
czy gotowe. Decyzja po zmierzeniu czasów w etapie 1. Limity `hubspot.fetch()` (15/120
sekund) już nas nie dotyczą; obowiązują zwykłe limity przeglądarki i n8n.

---

### n8n — pierwszy przepływ [12.10]

`RECON - HS - DEALS - SYNC`. Konwencja nazw: znacznik CRM (`HS` / `SF`) dostają tylko
przepływy rozmawiające z CRM-em, czyli synchronizacja i zakładanie ticketu. Przepływy
silnika (odczyt umowy, skan faktur) są bez niego.

- Przepływy Recona mieszkają w **wspólnej instancji n8n na Mikrusie**, tej samej co
  PageSpeed Monitor. Od 27.10 n8n nie należy do żadnego projektu, stoi osobno
  w `/root/n8n` (szczegóły niżej, „n8n jako wspólna infrastruktura”). Osobnej instancji
  dla Recona nie stawiamy. Do repozytorium idą eksporty JSON — nie
  zawierają danych logowania, więc token nie trafi do gita.
- Credential w n8n: typ **HubSpot Service Key**, pole "Allowed HTTP Request Domains"
  ustawione na `api.hubapi.com` (token nie poleci pod inny adres przy literówce).
- Węzły: Manual Trigger → HTTP Request. Świadomie **nie** używamy gotowego węzła HubSpot,
  bo słabo radzi sobie z filtrowaniem po własnych polach, a filtr jest tu sednem. HTTP
  Request z "Predefined Credential Type" daje pełną kontrolę nad zapytaniem, a autoryzacją
  nadal zajmuje się n8n. Ta sama wiedza przeniesie się na Salesforce.
- Zapytanie (działające, sprawdzone 12.10): `POST
  https://api.hubapi.com/crm/objects/2026-09/deals/search`, treść:

```json
{
	"filterGroups": [
		{
			"filters": [
				{ "propertyName": "deal_recon", "operator": "EQ", "value": "true" }
			]
		}
	],
	"properties": ["dealname", "deal_recon", "recon_contract_start_date", "recon_last_checked"],
	"limit": 100
}
```

- Dlaczego `search` (POST), a nie zwykła lista (GET): endpoint listy nie umie filtrować po
  własnych polach. To decyzja projektowa HubSpota, nie ograniczenie metody GET. Wyszukiwanie
  jest POST-em, bo filtry to zagnieżdżona struktura, która nie mieści się w adresie.
- **Wyszukiwanie nie oddaje powiązań** (firma przy dealu), w odróżnieniu od zwykłego GET
  z parametrem `associations`. Do rozstrzygnięcia przy budowie synchronizacji, skąd panel
  weźmie nazwę firmy: drugie zapytanie po ID deali czy inny układ.
- **Keepalive [do zrobienia przed końcem projektu, pomysł Arta 12.10]:** jeden przepływ
  `RECON - KEEPALIVE` **dla obu systemów naraz**, z wyzwalaczem czasowym **raz w tygodniu**
  i dwoma prostymi zapytaniami: `GET` o jednego deala w HubSpocie i jedno lekkie zapytanie
  do Supabase. Powód: konto testowe HubSpota wygasa po 90 dniach bezczynności, a darmowy
  projekt Supabase usypia dużo szybciej (ok. tygodnia — do potwierdzenia przy zakładaniu).
  Rytm tygodniowy z zapasem pokrywa oba progi, a 52 wywołania rocznie to dla HubSpota nic.
  Chodzi o to, żeby po skończeniu projektu demo stało gotowe dla rekruterów, a nie
  wymagało odmrażania. W trakcie budowy niepotrzebny, bo wywołań jest codziennie
  pod dostatkiem.
  **Świadomy wyjątek od zasady "bez harmonogramu"** (sekcja 6): to nie jest logika Recona,
  tylko podtrzymanie infrastruktury przy życiu. Nie czyta danych, nie skanuje, nie zapisuje.
- Zasady kont testowych (dokumentacja HubSpota, sprawdzone 10.10): wygasają po 90 dniach
bez wywołań API, każde wywołanie zeruje licznik; ręczne odnowienie w Development →
Testing → Test Accounts → Actions → "Renew trials"; do 10 kont testowych na konto.
Nie potwierdzone, czy dla kont zakładanych z CLI zasady są identyczne.
- Plik `hubspot.config.yml` z kluczem dostępu CLI: 11.10 nie ma go już w folderze
  projektu (zniknął razem z próbnym projektem). Gdyby wrócił po `hs auth`: nie czytać,
  nie wysyłać. Jest wpisany w `.gitignore`.


---

## `RECON - HS - DEALS - SYNC` — stan 13.10

Przepływ czyta deale z HubSpota i **zapisuje je do Supabase**. Działa end-to-end.

Węzły, z nazwami jak w n8n:

| Węzeł | Typ | Co robi |
|---|---|---|
| `When clicking 'Execute workflow'` | Manual Trigger | uruchomienie ręczne (w etapie 2 zastąpi go webhook) |
| `GET DEALS & CUSTOMERS - HubSpot` | HTTP Request | POST do GraphQL HubSpota, deale z firmami |
| `DATA - Split Out` | Split Out | jedna odpowiedź → pięć osobnych deali |
| `DEALS & CUSTOMERS upsert to base` | Postgres (Execute Query) | zapis klienta i umowy jednym zapytaniem |

Split Out sam niczego nie wykonuje — tylko zamienia tablicę na osobne pozycje. Wykonywanie
po kolei to ogólna zasada n8n: każdy węzeł uruchamia się raz na pozycję wejściową. Dlatego
Postgres wykonał pięć zapytań, a na wyjściu pokazuje jedną pozycję (`insert` nie zwraca
wierszy). Odwrotnością Split Out jest **Aggregate**, który zbierze pozycje z powrotem
w jedną tablicę — przyda się, gdy panel ma dostać gotową listę jednym kawałkiem.

- **Split Out** rozbija jedną odpowiedź GraphQL na osobne pozycje:
  pole `data.CRM.deal_collection.items`.
- **Postgres**, credential `Supabase Recon` (typ Postgres, nie Supabase — Data API jest
  wyłączone, a my potrzebujemy prawdziwego SQL-a; `agents/supabase.md`).
  Połączenie przez **Session pooler**, host `aws-0-eu-west-1.pooler.supabase.com`,
  port 5432, SSL `require`. Nie przez połączenie bezpośrednie, bo to na darmowym planie
  działa po IPv6, a Mikrus ma IPv4.
- **Jedno zapytanie zapisuje klienta i umowę** (`with c as (...)`): najpierw klient, jego
  `id` idzie od razu do umowy. Atomowo, bez pamiętania wartości między węzłami.
- **`do update`, nie `do nothing`.** Przy `do nothing` zapytanie nie zwróciłoby `id`
  istniejącego klienta i umowa nie miałaby się do czego podpiąć. Dlatego nawet przy
  niezmienionej nazwie robimy aktualizację.
- **`status` celowo nie jest ruszany przy aktualizacji.** Synchronizacja nie wie, czy
  umowa została odczytana; nadpisanie cofałoby deale do `no_contract` przy każdym przebiegu.
- **Link do deala składa ten przepływ** z identyfikatora
  (`https://app-eu1.hubspot.com/contacts/149521488/record/0-3/{id}`), bo GraphQL nie oddaje
  pola `url`, które jest w REST. To jedyne miejsce znające format adresów HubSpota i siedzi
  w przepływie oznaczonym `HS`, czyli zgodnie z zasadą 2 z sekcji 5.
- **Pułapka z pustą datą [13.10]:** n8n zamienia wartości parametrów na tekst, więc `null`
  z JSON-a dociera jako napis `"null"` i `::date` się wywala. Stąd
  `nullif(nullif($6::text, ''), 'null')::date`. Ten sam problem wróci przy każdym polu
  z datą, które bywa puste.

Czego jeszcze nie ma: usuwania deali, którym odznaczono `deal_recon`, odczytu umów
(przepływ 1 z sekcji 6) i zapisu `recon_last_checked` z powrotem do HubSpota.


### Zwalnianie rekordów przy synchronizacji [ZROBIONE 14.10]

Problem znaleziony testem 13.10: deal skasowany w HubSpocie albo z odznaczonym
`deal_recon` **zostaje w Supabase na zawsze**, bo synchronizacja umie tylko dodawać
i aktualizować.

Rozwiązanie:
- **Kolumna `archived_at` w `contracts`, nie usuwanie wierszy.** Pod umową wiszą faktury
  i niezgodności, więc kasowanie pociągnęłoby je za sobą albo wywaliło się na powiązaniach.
  Zarchiwizowana umowa znika z listy w panelu, ale zostaje z całą historią.
- **Odwracalne:** gdy deal wróci albo ktoś z powrotem zaznaczy `deal_recon`,
  synchronizacja czyści `archived_at` i umowa wraca.
- **Na końcu przepływu jedno zapytanie** archiwizuje umowy ze źródła `hubspot`, których
  identyfikatorów nie było w tym przebiegu. Potrzebna do tego pełna lista id, czyli węzeł
  **Aggregate** przed tym zapytaniem.
- **Deal skasowany i deal z odznaczonym `deal_recon` to dla nas ten sam przypadek.**
  Zapytanie filtruje po `deal_recon = true`, więc odznaczony deal po prostu nie wraca
  w wyniku, tak jak skasowany. Reguła jest jedna: „nie było go w tym przebiegu".
- **Ponawianie [USTALONE 14.10]**, w dwóch różnych miejscach:
  - **błąd API** — wbudowane „Retry On Fail" w ustawieniach węzła HTTP Request. Jeden
    przełącznik, łapie potknięcia sieci i brak odpowiedzi.
  - **pusta lista** — **obsługiwana w panelu, nie w n8n** (decyzja Arta 14.10). Pętli
    ponawiania w n8n nie budujemy. Przy pustej odpowiedzi panel pokazuje w miejscu listy
    stan pusty z przyciskiem odświeżenia i odnośnikiem do wsparcia; szczegóły
    w `agents/panel.md`.
    Świadomie przyjęty skutek uboczny: archiwizacja **i tak się wykona**, więc przy
    fałszywie pustej odpowiedzi wszystkie umowy zostaną na chwilę zarchiwizowane.
    Jest to do przyjęcia wyłącznie dlatego, że archiwizacja jest miękka i odwracalna —
    kliknięcie odświeżenia przywraca stan. Przy twardym usuwaniu ten plan byłby nie do
    przyjęcia.
  - **Odrzucone 14.10: próg bezpieczeństwa** („nie archiwizuj więcej niż połowy umów
    w jednym przebiegu"). Powód odrzucenia, argument Arta: **stan częściowy jest gorszy
    od całkowitego, bo jest cichy.** Pusta lista od razu sygnalizuje awarię, a lista
    skrócona o połowę wygląda jak prawdziwe dane i nikt się nie zorientuje, że obraz jest
    niekompletny. Dodatkowo każdy taki próg byłby wzięty z sufitu.
  - **Przyjęte założenie [USTALONE 14.10]:** Recon zakłada, że HubSpot odpowiada
    wiarygodnie, i traktuje pustą listę jako prawdę o stanie CRM-u, a nie jako awarię.
    Lepszego rozwiązania przy tej skali nie mamy: pętla ponawiania w n8n robi dokładnie
    to samo co kliknięcie odświeżenia przez użytkownika, tylko bez jego wiedzy.
- To samo będzie potrzebne po stronie Salesforce.

**Potwierdzone przy okazji 13.10:** upsert działa — po dodaniu szóstego deala w HubSpocie
poprzednie się nie zdublowały.

**Jak to zbudowane (14.10).** Przepływ: … → `DEALS & CUSTOMERS upsert to base` →
`DEALS Aggregate` → `DEALS - archive missing`.

- **Upsert oddaje `returning crm_id`** i w części `do update` ustawia `archived_at = null`.
  Dzięki temu powrót deala odarchiwizowuje go sam, bez osobnego zapytania.
- **Aggregate** (tryb `Individual Fields`, pole `crm_id`) zbiera identyfikatory z przebiegu
  w jedną tablicę.
- **`DEALS - archive missing`**:

```sql
update contracts
set archived_at = now(),
	updated_at  = now()
where crm_source = 'hubspot'
	and archived_at is null
	and crm_id <> all (string_to_array($1, ' '));
```

  parametr: `{{ $json.crm_id.join(' ') }}`.
  `archived_at is null` pilnuje, żeby data mówiła, **kiedy** deal zniknął, a nie kiedy
  ostatnio sprawdzaliśmy.

**Dwie pułapki n8n, obie kosztowały po kilkanaście minut [14.10]:**

1. **`Execute Once` w ustawieniach węzła.** Włączone każe przetworzyć tylko pierwszą
  pozycję. Objaw: upsert dostaje 5 pozycji, oddaje 1, a archiwizacja kasuje resztę.
  Poznać po małej „1" w rogu węzła na płótnie.
2. **Pole `Query Parameters` to lista rozdzielona przecinkami.** Wysłanie tam jednego
  ciągu, który sam zawiera przecinki (`id1,id2,id3`), powoduje, że n8n rozbija go na
  osobne parametry i do `$1` trafia **tylko pierwszy identyfikator**. Dlatego sklejamy
  **spacją** i rozbijamy `string_to_array($1, ' ')`.

Obie, razem z wczorajszym `"null"` w dacie, to ten sam wzorzec: **n8n przepuszcza parametry
przez własną obróbkę, zanim dojdą do bazy.** Przy każdym nowym typie parametru warto
zajrzeć w sekcję z wysłanym zapytaniem i sprawdzić, co faktycznie poszło.

**Sposób diagnozy wart zapamiętania:** przyczynę pokazały znaczniki czasu w bazie. Wiersze
ruszone tylko archiwizacją miały `updated_at` **co do mikrosekundy równy** `archived_at`,
a ten jeden przetworzony przez upsert miał wcześniejszy. Stąd od razu było wiadomo, że
upsert wykonał się raz, a nie pięć razy.

**Potwierdzone testem 14.10:** deal z odznaczonym `deal_recon` dostaje `archived_at`,
pozostałe zostają nietknięte; ponowne zaznaczenie flagi przywraca go do życia.

## Odczyt załączników umowy [ZROBIONE 26.10, przetestowane end-to-end]

Rozszerzenie `RECON - HS - DEALS - SYNC`. Do tej pory przepływ wiedział, że deal istnieje;
teraz wie też, czy ma przypiętą umowę.

**Kształt po zmianie:**

```
When clicking Execute
      ↓
GET DEALS & CUSTOMERS - HubSpot   (GraphQL, teraz także notatki)
      ↓
DATA - Split Out
      ↓
HAS CONTRACT FILE                 (IF: lista notatek nie jest pusta)
   ├─ true  → HTTP Request (files/v3) → Set „DEAL + FILE"
   └─ false →                           Set „DEAL - NO FILE"
                      ↓
                    Merge (Append)      ← musi wyjść 5 elementów
                      ↓
      DEALS & CUSTOMERS upsert to base
                      ↓
             DEALS Aggregate
                      ↓
          DEALS - archive missing
```

**Dlaczego gałąź dla deala bez umowy jest obowiązkowa, a nie wygodna.** Archiwizacja na
końcu porównuje listę identyfikatorów z bazą. Gdyby Kessler wypadł z przepływu przy braku
załącznika, archiwizacja uznałaby, że zniknął z CRM-a, i oznaczyła jego umowę jako
zarchiwizowaną. To ten sam mechanizm, który 14.10 wyczyścił cztery deale.

**Dlaczego Merge w trybie Append.** Gałęzie zawierają różne deale, nie dwie wersje tych
samych — chodzi o zsypanie ich z powrotem do jednej listy. Liczba elementów po Merge jest
najtańszym testem poprawności całego rozgałęzienia.

**Oba węzły Set wypluwają ten sam komplet dziewięciu pól**, w kolejności parametrów
zapytania. Dzięki temu po Merge nic nie trzeba przestawiać, a upsert jest jeden.

### Trzy pułapki, które kosztowały czas [26.10]

1. **Ciało zapytania GraphQL to JSON, nie surowy GraphQL.** Node wysyła `{"query":"..."}`,
   a zapytanie musi być w jednej linii — surowe znaki nowej linii rozwalają JSON.
2. **Pole JSON w węźle Set bywa w trybie Fixed.** Wtedy `{{ }}` przechodzi jako zwykły
   tekst i do bazy trafiają nawiasy klamrowe zamiast wartości. Przełącznik Fixed/Expression
   pokazuje się dopiero po najechaniu nad pole.
3. **Puste wartości na końcu listy Query Parameters znikają.** Kessler miał `file_name`
   i `file_path` jako puste napisy i Postgres zgłaszał brak parametru `$7`. Rozwiązanie
   spójne z resztą: w gałęzi bez pliku wysyłamy napis `"null"`, a zapytanie zamienia go na
   `NULL` przez `nullif`. To samo zabezpieczenie, które od 14.10 obsługuje pustą datę.

**Węzeł HTTP podmienia zawartość elementu** na odpowiedź z API plików — po nim nie ma już
danych deala. Set sięga po nie wprost, przez `$('DATA - Split Out').item.json...`, co
opiera się na powiązaniu elementów w n8n, a nie na ich kolejności.

### Test odwracalności [26.10]

Sprawdzone na żywo, w obie strony: usunięcie pliku z deala w HubSpocie czyści `file_path`
i cofa status na `no_contract`; ponowne wrzucenie pliku ustawia `attached`. Nic nie
wymaga ręcznej interwencji w bazie. Ta sama własność co przy archiwizacji umów.

## n8n jako wspólna infrastruktura [ZROBIONE 27.10]

Do 27.10 n8n siedział w `docker-compose.yml` PageSpeeda (`/root/pagespeed-monitor`,
kontener `pagespeed_n8n`). Przeniesiony do osobnego folderu, żeby żaden projekt go nie
„posiadał”.

**Układ na serwerze:**

```
/root/n8n/                 → n8n (kontener `n8n`), port 20295, sieć shared
/root/pagespeed-monitor/   → panel PageSpeeda (już bez n8n)
/root/recon/               → recon-contract-reader (bez portu), później panel Recona
```

- **Adres bez zmian:** `http://srv71.mikr.us:20295`, wersja n8n `2.35.7`.
- **Dane:** `n8n_data` przeniesiony w całości do `/root/n8n/n8n_data`.
- **Klucz szyfrowania:** `N8N_ENCRYPTION_KEY` skopiowany linią z `.env` PageSpeeda do
  `/root/n8n/.env` (chmod 600), bez wyświetlania. Z innym kluczem n8n nie odczyta
  credentiali — to był jedyny realny punkt ryzyka.
- **Sieć `shared`** (`docker network create shared`, jako `external` w compose): łączy
  n8n z usługami projektów. Każdy projekt ma poza tym własną sieć domyślną.
- **Sprawdzone po przenosinach:** trzy aktywne przepływy PageSpeeda wstały, węzły
  Postgres zwracają dane (credentiale odszyfrowane), `RECON - HS - DEALS - SYNC` jest.
- **Kopia zapasowa:** `/root/n8n-backup-2026-10-27.tar.gz` (87 MB: `n8n_data`, stary
  compose i `.env`). Do usunięcia po pierwszym udanym cotygodniowym skanie PageSpeeda.
- Nowy projekt = własny folder i compose, usługi podpięte do `shared`. W compose n8n
  nic się nie zmienia.
- Na serwerze wisi „System restart required” — restart zatrzyma wszystkie kontenery
  (wstaną same dzięki `restart: unless-stopped`), do zrobienia w spokojnym momencie.

## Synchronizacja kopiuje PDF do Storage [ZROBIONE 27.10, przetestowane]

Gałąź `true` w `RECON - HS - DEALS - SYNC` po zmianie:

```
HAS CONTRACT FILE (true)
  → GET DEAL FILES                     files/v3: id, nazwa, fileMd5
  → GET CONTRACT PDF URL - HubSpot     files/v3/{id}/signed-url → podpisany link
  → GET CONTRACT PDF FILE - HubSpot    pobiera PDF z linku (bez klucza), binary `data`
  → UPLOAD CONTRACT PDF - Storage      POST do bucketu contracts_files
  → DEAL + FILE                        file_name, file_path = ścieżka w Storage
```

- **Pobranie pliku to dwa kroki.** Najpierw
  `GET https://api.hubapi.com/files/v3/files/{id}/signed-url` (Service Key) oddaje
  podpisany link, potem zwykły `GET` tego linku z Authentication: None, Response Format:
  File. Link jest ważny ok. doby — nie wklejać go nigdzie poza n8n.
- **Pułapka [27.10]: pole `url` z odpowiedzi files/v3 nie nadaje się do pobierania.**
  `api-eu1.hubspot.com/filemanager/api/v2/…/signed-url-redirect` to endpoint dla
  przeglądarki z sesją użytkownika. Service Key ignoruje i zwraca stronę HTML aplikacji
  zamiast PDF-a.
- **Upload:** `POST https://evuwwsctamuyktvcjtgl.supabase.co/storage/v1/object/contracts_files/{crm_id}/{fileMd5}.pdf`,
  credential `Supabase Recon Storage` (typ Supabase API, klucz secret), nagłówki
  `x-upsert: true` i `Content-Type: application/pdf`, Body Content Type **n8n Binary
  File**, pole `data`.
- **Dwie pułapki uploadu [27.10]:**
  1. Bez nagłówka `Content-Type` Supabase odpowiada `invalid_mime_type` — bucket przyjmuje
     tylko `application/pdf`, a n8n sam typu nie dokleja.
  2. Body ustawione inaczej niż „n8n Binary File” wysyła napis zamiast pliku. Objaw:
     pliki w Storage po **26 bajtów** i pusty podgląd. Najszybszy test: rozmiar w Storage
     musi się zgadzać z `size` z HubSpota.
- **`DEAL + FILE`** bierze dane z `$('GET DEAL FILES')` i `$('DATA - Split Out')`, bo
  bezpośrednio przed nim stoi upload, który oddaje tylko `{"Key": …}`.
- **Credential HubSpota ma „Allowed HTTP Request Domains: All”** (sprawdzone 27.10;
  notatka z 12.10 mówiła o `api.hubapi.com`, ale nie było to ustawione). Po przejściu na
  `files/v3/…/signed-url` wszystkie wywołania z kluczem idą na `api.hubapi.com`, a
  pobranie pliku jest bez klucza — można wrócić do ograniczenia do jednej domeny.

## `RECON - CONTRACT - READ` [ZROBIONE 7.11, przetestowane]

Osobny przepływ silnika, bez znacznika CRM. Docelowo wołany na końcu synchronizacji jako
pod-przepływ (Execute Workflow), na etapie budowy ręcznie.

| # | Węzeł | Co robi |
|---|---|---|
| 1 | Manual Trigger | ręczne uruchomienie |
| 2 | `Get contracts to read` (Postgres) | umowy `attached`, niezarchiwizowane, z `file_path` |
| 3 | `DELETE OLD CHUNKS` (Postgres) | kasuje stare fragmenty tej umowy, oddaje `id`, `file_path`, `deleted_chunks` |
| 4 | `GET CONTRACT PDF - Storage` (HTTP) | `GET .../storage/v1/object/contracts_files/{{ $json.file_path }}`, credential `RECON Files Storage`, Response Format: File |
| 5 | `CHUNK CONTRACT - Reader` (HTTP) | `POST http://recon-contract-reader:3000/chunk`, Body: n8n Binary File `data`, nagłówek `Content-Type: application/pdf` |
| 6 | Split Out | pole `chunks` → jeden item na fragment |
| 7 | `INSERT CHUNKS` (Postgres Insert) | 9 kolumn mapowanych ręcznie, `contract_id` = `$('DELETE OLD CHUNKS').item.json.id` |
| 8 | Remove Duplicates | po `contract_id` → z powrotem jeden item na umowę |
| 9 | `SET CONTRACT READ` (Postgres) | `update contracts set status = 'read' where id = … and status = 'attached'` |

Zapytanie w kroku 3 (zawsze oddaje jeden wiersz, więc dalsze węzły dostają dane umowy
i nie trzeba „Always Output Data”):

```sql
with deleted as (
	delete from contract_chunks
	where contract_id = {{ $json.id }}
	returning 1
)
select
	{{ $json.id }} as id,
	'{{ $json.file_path }}' as file_path,
	(select count(*) from deleted) as deleted_chunks;
```

- **Kasowanie na początku, nie przed insertem** [7.11]: Split Out bierze pole tylko
  z węzła bezpośrednio przed nim, więc między czytnikiem a Split Outem nie może stać nic
  innego. Pierwotny plan (kasowanie jako krok 5) by to blokował.
- **Bez transakcji, ale bezpiecznie:** `read` ustawiany na końcu. Przy awarii w środku
  umowa zostaje `attached`, następny przebieg kasuje niepełne fragmenty i wstawia od nowa.
- **Insert zamiast własnego SQL** w kroku 7: tekst fragmentów zawiera przecinki, a pole
  Query Parameters rozbija po przecinkach (pułapka z 14.10).
- **W mapowaniu insertu tylko 9 pól.** `id`, `created_at`, `embedding`, `embedding_model`
  usunięte z węzła (ikoną kosza), nie zostawione puste — puste pole n8n może wysłać
  jako `null`, a `id` jest `generated always`.
- **Pułapka [7.11]:** uruchomienie samego węzła czytnika („Execute step”) skończyło się
  błędem `Converting circular structure to JSON`. To n8n wykłada się na obiekcie błędu
  i zasłania prawdziwą przyczynę. Pełny przebieg przeszedł bez problemu. Diagnoza sieci
  w razie potrzeby: `docker exec n8n wget -qO- http://recon-contract-reader:3000/health`.
- **Testy 7.11:** pierwszy odczyt — 4 umowy, 137 fragmentów (Ostrava 38, Halden 34,
  Lumen 33, Brightwater 32), zgodnie z testem lokalnym z 27.10; ponowny odczyt — bez
  dubli (stare fragmenty wymienione); ręczna zmiana jednej umowy na `attached` —
  przeczytana tylko ona, reszta nietknięta; po przebiegu wszystkie cztery `read`.
- **Otwarte:** czytnik zwraca pole `section_no`, którego nie ma w `contract_chunks`.
  Dziś pomijane w mapowaniu. Do decyzji: dodać kolumnę albo usunąć pole z czytnika.
  W komentarzu w `recon-contract-reader/src/server.js` została stara nazwa `recon-ingest`.

- **Credentiale w tym przepływie (z eksportu 7.11):** Postgres `RECON Supabase`,
  Storage `RECON Files Storage`. Eksport: `n8n/recon-contract-read.json`.

## `RECON - SUPABASE - KEEPALIVE` [ZROBIONE 7.11]

Darmowy Supabase usypia projekt po 7 dniach bez aktywności. Przepływ: Schedule Trigger
raz dziennie o 00:01 (strefa `Europe/Warsaw`) → Postgres `select count(*) from contracts;`
(credential z synchronizacji). Opublikowany przyciskiem Publish (ta wersja n8n nie ma
przełącznika Active). Kontrola: `select calls, query from pg_stat_statements where query
ilike '%count(*) from contracts%';` — `calls` rośnie o 1 dziennie; pierwszy udany przebieg 8.11 o 00:01. Licznik zeruje się
przy restarcie bazy. Niepotwierdzone, czy Supabase liczy bezpośrednie zapytania przez
pooler jako aktywność (Data API wyłączone) — wracamy, jeśli projekt mimo to uśnie.
