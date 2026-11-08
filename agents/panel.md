# Recon — panel Vue, wygląd i infrastruktura

Panel na Mikrusie: ekrany, statusy w interfejsie, zasady wyglądu, budowa kodu, HTTPS.
Kręgosłup projektu i historia decyzji są w `agent.md`.

---

### Skąd ekran aplikacji bierze dane [USTALONE 10.10]

**Ekran czyta wszystko z Supabase, nie bezpośrednio z CRM.** Aplikacja robi zapytanie
do n8n, n8n czyta Supabase i oddaje gotową listę. CRM jest źródłem tylko części danych,
a synchronizacja (niżej, "Synchronizacja danych przy starcie") to moment, w którym są one
kopiowane do Supabase.

| Co widać na ekranie | Skąd pochodzi | Skąd czyta ekran |
|---|---|---|
| Deal, Company | CRM | Supabase (kopia z synchronizacji) |
| Contract (plik PDF) | załącznik na dealu w CRM | Supabase (przetworzona kopia) |
| Faktury, Invoices scanned, To recover | tylko Supabase | Supabase |
| Status faktury i deala | wyliczany z faktur w Supabase | Supabase |
| Numer ticketu przy niezgodności | ticket powstaje w CRM | Supabase (zapisany numer) |

Dlaczego tak:
- **Jedno źródło dla ekranu.** Aplikacja nie skleja pół wiersza z CRM i pół z Supabase.
- **Wymienny CRM.** Ekran nie wie, z jakiego CRM-u pochodzi deal. Przy przepince na
  Salesforce zmienia się tylko synchronizacja w n8n.
- Minus: lista jest tak świeża jak ostatnia synchronizacja. Dlatego synchronizacja jest
  przy każdym otwarciu aplikacji.

**Frontend niczego nie liczy** [USTALONE 10.10]. Aplikacja dostaje gotowe dane: statusy,
"Invoices scanned", "To recover", liczbę niezgodności. Za ich przygotowanie odpowiada n8n
i baza. Aplikacja tylko wyświetla.

Po otwarciu aplikacji idą dwa zapytania, oba do n8n [PROPOZYCJA]:
1. **Lista:** n8n czyta Supabase i od razu oddaje listę deali z gotowymi liczbami.
   Ekran pokazuje się bez czekania.
2. **Synchronizacja:** n8n pyta CRM, dopisuje nowe deale, odczytuje nowe umowy. Gdy
   skończy, aplikacja pobiera listę jeszcze raz.

Panel nie pobiera danych z Supabase bezpośrednio (z Supabase korzysta tylko do
logowania). Powód: jeden adres do pilnowania (n8n sprawdza token logowania), a klucz
do bazy nie trafia do kodu panelu.

Skąd biorą się sumy [PROPOZYCJA]: w wierszach zapisujemy tylko fakty (faktura, jej status,
kwota różnicy). Sumy i status deala baza wylicza z faktur w chwili pytania (widok albo
zapytanie SQL), nie trzymamy ich w osobnych kolumnach. Powód: zapisana suma potrafi się
rozjechać z fakturami, wyliczana zawsze się zgadza.

---

### Statusy i nazwy w interfejsie [USTALONE 10.10, wersja po uporządkowaniu]

Jedno słownictwo wszędzie. Akcja to **scan**. Nie używamy słów "check", "verify", "index".

**Statusy faktury** (pięć, każda faktura ma dokładnie jeden):

| Status w bazie | Nazwa w interfejsie | Co znaczy | Wygląd |
|---|---|---|---|
| `niesprawdzona` | Ready to scan | Jeszcze nie skanowana | sama ramka |
| w trakcie | Scanning… | Właśnie teraz sprawdzana przez AI | zielony |
| `zgodna` | Compliant | Sprawdzona, zgadza się z umową | niebieski |
| `niezgodna` | Mismatch | Sprawdzona, nie zgadza się z umową | czerwono-pomarańczowy |
| `brak podstawy` | No contract basis | Sprawdzona, umowa tego nie reguluje | szary |

Status techniczny `błąd` (skan faktury się nie udał) dostanie nazwę przy budowie.

**Status deala** (jeden, wyliczany z faktur, ten sam na liście i w nagłówku szczegółów),
według pierwszeństwa:
1. Scanning… — któraś faktura tego deala jest właśnie skanowana
2. N mismatches — są niezgodności
3. Ready to scan — są faktury do zeskanowania
4. All compliant — wszystko sprawdzone i zgodne

Plus dwa stany, gdy nie da się skanować, bo problem jest z umową, a nie z fakturami:
- No contract — przy dealu nie ma PDF-a umowy (szary)
- Contract unreadable — PDF jest, ale nie da się z niego wyciągnąć tekstu, np. skan
  (ciemne tło). Wcześniejsza nazwa "Indexing failed" odrzucona jako niezrozumiała.

Osobnych plakietek "Contract indexed" i "Verifying" nie ma.

**Jak działa skan** [USTALONE 10.10]:
- Skan startuje **tylko po kliknięciu przycisku**. Wejście na deal niczego nie uruchamia.
- Faktury skanują się **po kolei, jedna naraz**, od najstarszej. Aktualna ma "Scanning…",
  pozostałe czekają jako "Ready to scan".
- Przycisk pokazuje liczbę: "Scan 6 invoices" / "Scan 1 invoice". W trakcie "Scanning…"
  z pulsującą ikoną. Gdy nie ma nic do zeskanowania: wyszarzony "Nothing to scan".
- Przycisk w szczegółach skanuje faktury jednego deala, przycisk na liście wszystkie.
- Bez paska postępu i bez komunikatów nad tabelą: postęp widać po statusach i liczniku
  "Invoices scanned".
- **Skan jest wyłącznie ręczny** [USTALONE 10.10]. Nie ma harmonogramu ani żadnego
  przepływu "co jakiś czas". W etapie 1 przepływ skanu uruchamiamy ręcznie w n8n (testy),
  w etapie 2 uruchamiają go przyciski aplikacji przez webhook.

Pozostałe napisy: licznik "Invoices scanned", box "Contracts ready".

**Synchronizacja danych przy starcie** [wygląd USTALONY 10.10, mechanizm PROPOZYCJA]:
- Na liście deali, po lewej stronie przycisku skanu, jest mały status. Po otwarciu
  aplikacji pokazuje "Syncing data…" z pulsującą niebieską ikoną strzałek, po zakończeniu
  szare "Up to date" z ikoną ptaszka. "Up to date" po 2 sekundach znika (krótkie
  wygaszenie) i nie wraca przy powrocie na listę. Pulsowanie tej ikony jest delikatne,
  słabsze niż iskierek na przyciskach AI. W makiecie synchronizacja trwa 4 sekundy.
- W trakcie synchronizacji przycisk skanu na liście jest wyszarzony, bo lista deali
  i liczba faktur mogą się jeszcze zmienić.
- Co dzieje się pod spodem (propozycja): aplikacja po otwarciu woła webhook n8n, n8n pyta
  CRM o wygrane deale i porównuje je z tym, co jest w Supabase. Nowy deal dopisuje, nowy
  lub podmieniony PDF umowy oddaje do odczytu. To jest zgodne z zasadą "Recon sam pyta
  CRM" i ze skanem bez harmonogramu.
- Synchronizacja to nie skan. Nie sprawdza faktur i nie pyta AI o zgodność. Tylko
  odświeża listę deali i umów.
- **Synchronizacja czeka na odczyt nowych umów** [USTALONE 10.10 na start]. "Syncing
  data…" pulsuje dłużej, gdy jest nowa umowa, a po zakończeniu wszystko jest gotowe.
  Dzięki temu nie ma osobnego statusu "umowa w trakcie odczytu". Po synchronizacji deal
  z PDF-em jest odczytany albo ma "Contract unreadable", deal bez PDF-a ma "No contract".
- Do sprawdzenia w etapie 1: ile trwa odczyt jednej umowy. Limit czasu HubSpota już nas
  nie dotyczy (panel jest własny), ale długie czekanie na jedno zapytanie jest kruche.
  Ryzyko jest przy pierwszym uruchomieniu, gdy wszystkie umowy są nowe naraz. Jeśli
  wyjdzie za długo: odczyt w tle i dodatkowy status, np. "Reading contract…".

Zasady wyglądu ustalone na makiecie [USTALONE 10.10]:
- **Linki bez podkreślenia**, nigdzie. Link wyróżnia kolor i pogrubienie.
- **Kolor główny to niebieski (#1F6FD6), globalnie.** Pomarańczowy jako akcent odrzucony.
  Niebieski mają: kwota "To recover" w boxie podsumowania i kwoty różnic przy fakturach.
  W tabeli deali kwoty "To recover" są w zwykłym kolorze tekstu. W kodzie jedna zmienna
  koloru, nie wartości wpisane w wielu miejscach.
- **Ikona Recona jest ciemna** (ten sam kolor co przyciski AI i górny pasek, #1D2730). Wyjątek:
  środkowa gwiazdka jest niebieska (kolor główny) i obraca się wokół pionowej osi, jak moneta.
  Górny pasek (przyklejony do góry przy przewijaniu) pokazuje "Recon" i hasło
  "Bill what you signed.".
- **Kolory plakietek statusu:** patrz tabela statusów w sekcji 4.
- **Fokus pola** to zmiana koloru obramowania na niebieski, bez dodatkowej obwódki.
- **Numer faktury to zwykły tekst, nie link.** Faktura nie ma dokumentu (to dane w tabeli),
  więc nie ma do czego linkować. Szczegóły otwiera kliknięcie w cały wiersz: najechanie
  podświetla wiersz, kliknięty wiersz zostaje podświetlony jako aktywny. Bez ikon na końcu
  wiersza, bo przy przewijaniu tabeli w bok ich nie widać.
- **Lista faktur: najwyżej 10 na stronę**, pod tabelą paginacja (licznik "Showing 1–10
  of 22", strzałki i numery stron). Paginacja pojawia się dopiero powyżej 10 faktur.
  Zmiana strony zamyka box szczegółów, tak jak zmiana filtra.
- **Wyszukiwanie faktur w dealu:** pole "Search invoices" po prawej stronie rzędu zakładek
  (zakładki po lewej, pole po prawej). Szuka po numerze, okresie, kwotach i statusie.
  Liczniki przy filtrach pokazują wynik wyszukiwania. Widoczne tylko na zakładce "Invoices".
- **Box szczegółów faktury jest domyślnie zamknięty.** Otwiera go dopiero kliknięcie
  w fakturę. Zmiana filtra zawsze go zamyka. Ponowne kliknięcie w aktywną fakturę też.
- Przyciski małe: akcje 36 px wysokości i tekst 13 px, filtry i podpowiedzi 32 px i 12 px.
- **Tabele:** jeden rozmiar tekstu w całym wierszu (13 px), niskie wiersze. Pierwsza kolumna
  (nazwa deala, numer faktury) w kolorze niebieskim jak linki, bez podkreślenia.
- **Boxy z liczbami** (To recover itd.) małe: liczba 17 px, podpis 11 px.
- **Kolumna "Status" jest zawsze ostatnia z prawej i wyrównana do prawej**, w każdej
  tabeli. Na liście deali kolejność to: Deal, Company, Invoices scanned, To recover,
  Contract, Status.
- **Tabele przewijane w bok bez widocznego paska przewijania.** Długie teksty w komórkach
  ucinane wielokropkiem, w jednej linii. Między kolumną z kwotą (wyrównaną do prawej)
  a statusem wyraźny odstęp.
- Funkcje AI oznaczamy ikoną iskierek: zakładka "Ask the contract", przycisk skanu
  ("Scan N invoices"), przycisk "Ask AI", plakietka "AI answer".
- **Przyciski AI są ciemne**, wszystkie ("Ask AI" i przycisk skanu), w tym samym małym
  rozmiarze co pozostałe przyciski akcji, z ikoną iskierek.
- **Czekanie na odpowiedź AI:** iskierki w ikonie wypełniają się i pulsują na zmianę, napis
  zmienia się na "Thinking", a plakietka przy odpowiedzi na "AI is thinking". W makiecie
  czekanie jest symulowane na 10 sekund. Odrzucone: jasny przycisk z animowanym obramowaniem.
- **Jeden globalny przycisk AI.** "Ask AI" i przycisk skanu (na liście deali
  i w szczegółach) to ten sam przycisk: ten sam wygląd, rozmiar i to samo zachowanie
  w trakcie pracy (pulsujące iskierki, napis "Thinking" / "Scanning"). W kodzie ma to być
  jeden komponent, np. `AiButton`, a nie trzy osobne przyciski. W makiecie skan jednej
  faktury trwa 3 sekundy.
- **Jeden wspólny układ szczegółów deala** [USTALONE 10.10] dla każdej odczytanej
  umowy, niezależnie od stanu: nagłówek, przycisk skanu ("Scan N invoices"), trzy boxy z liczbami,
  zakładki "Invoices" i "Ask the contract", tabela faktur. Trwający skan nie ma osobnego
  ekranu ani paska postępu: widać go po statusach faktur ("Scanning…", "Ready to scan")
  i po przycisku w stanie "Scanning".
- **Stany przycisku skanu:** aktywny, gdy są faktury do zeskanowania;
  "Scanning" z pulsującą ikoną, gdy skan trwa; wyszarzony i nieklikalny, gdy nie ma nic
  do zeskanowania ("Nothing to scan") oraz, na liście deali, w trakcie synchronizacji.
- Osobne ekrany zostają tylko dla dwóch sytuacji bez odczytanej umowy: brak PDF-a
  przy dealu i plik nie do odczytania.
- **Przełącznik źródła w górnym pasku, po prawej:** dwa segmenty "HubSpot" i "Salesforce",
  aktywny biały z ciemnym tekstem, nieaktywny przezroczysty z szarym tekstem. W makiecie
  Salesforce ma trzy przykładowe deale. Wariant do przemyślenia (sekcja 8, etap 3).
- **Układ strony:** ciemny górny pasek i ciemna, niższa stopka "Created by arturchochla"
  (tekst 11 px). Pasek, treść i stopka mają ten sam kontener: szerokość do 1180 px,
  marginesy boczne 16 px.
- **Nagłówek listy deali:** logo i "Recon" obok siebie (odstęp 2 px), pod spodem zdanie
  "Scans the invoices you issue against the contract on each won deal." z odstępem 20 px
  pod nim. Po prawej status synchronizacji i przycisk skanu.
- **Boxy na liście deali:** To recover, Mismatches, Invoices scanned, Contracts ready.
- **Wiersze listy deali** zachowują się jak wiersze faktur: podświetlenie po najechaniu,
  kliknięcie w cały wiersz otwiera szczegóły.
- **Przycisk na ekranie "No contract"** ("Look for an attachment now") jest ciemny
  i w tym samym małym rozmiarze co pozostałe przyciski akcji (36 px, tekst 13 px).
  Bez ikony iskierek, bo to nie jest funkcja AI.
- **Pola wyszukiwania** ("Search deals", "Search invoices") są małe: 130 px szerokości.
- **Szczegóły deala to osobne boxy jeden pod drugim**, z odstępem 20 px: najpierw lekki,
  mały przycisk powrotu "All deals", potem box z nagłówkiem deala (nazwa, status, firma
  i plik umowy, link do CRM, przycisk skanu, trzy boxy z liczbami), potem box z zakładkami
  i fakturami.
- **Uwaga do wdrożenia:** panel jest nasz (Vue + SCSS), więc wszystkie powyższe zasady
  wyglądu, kolory i animacje da się odtworzyć jeden do jednego. Makieta jest wzorem.

---

---

## 7. PANEL RECON — WŁASNA APLIKACJA VUE NA MIKRUSIE [USTALONE 10.10]

**Interfejsem Recona jest własny panel**, a nie aplikacja w HubSpocie. Jedno miejsce
zarządzania: lista deali → szczegóły deala.

```
Panel Vue (Mikrus)  →  n8n (Mikrus)  →  HubSpot / Salesforce
                                     →  Supabase
                                     →  Claude
```

Ustalone:
- **Stack:** czyste Vue.js + SCSS. Bez Astro, bez warstwy pośredniej, bez Reacta.
- **Hosting:** Mikrus, Docker, obok n8n, pod adresem z HTTPS (sekcja 10).
- **Panel rozmawia tylko z n8n.** Z CRM-ami, Supabase i Claude'em rozmawia n8n. Powody:
  tokeny do CRM i klucz do bazy nie mogą leżeć w kodzie działającym w przeglądarce,
  a panel nie musi wiedzieć, jaki CRM jest pod spodem (sekcja 5).
- **Frontend niczego nie liczy**, dostaje gotowe dane (sekcja 4).
- **Logowanie:** Supabase Auth, jedno konto założone ręcznie, bez rejestracji i ról.
  Panelu używa tylko Art. Panel dostaje token, dokleja go do każdego zapytania do n8n,
  n8n sprawdza token na początku każdego przepływu. Adres webhooka n8n jest widoczny
  w przeglądarce, ale bez ważnego tokenu nic nie zwraca.
- **Style:** zmienne SCSS (kolory, rozmiary, odstępy, szerokość kontenera) i klasy na
  klocki: przycisk AI, plakietka statusu, box z liczbą, tabela, pole wyszukiwania,
  zakładki, paginacja. Animacje w osobnym pliku. Budowane od razu w docelowym projekcie,
  z makietą jako wzorem, a nie przez przepisywanie makiety w miejscu.

**Decyzje na starcie budowy panelu** [USTALONE 11.10]:
- **JavaScript**, nie TypeScript. Panel to znany teren, czas ma iść na RAG i n8n.
- **Vue 3 + Vite**, Vue Router ("lista → szczegóły"), SCSS.
- **Pinia, cztery store'y:** `auth` (użytkownik i token), `deals` (lista, liczby w boxach,
  synchronizacja, wybrane źródło), `scan` (kolejka skanu), `deal` (szczegóły otwartego
  deala: faktury, filtr, strona, wyszukiwanie). Pytanie do AI zostaje lokalnie
  w komponencie zakładki. Zasada: komponenty wyświetlają i wołają akcje, rozmowa z n8n
  siedzi w store'ach. Na start store'y oddają dane wpisane na sztywno.
- **Folder:** `recon-panel/` w `Desktop/recon`.
- **Jedno repozytorium git na cały projekt** (`Desktop/recon`): `agent.md`, makieta,
  panel, później generator i eksporty z n8n.
- **Kolejność:** szkielet panelu przed etapem 1, z granicą: projekt działa lokalnie,
  zmienne SCSS i pierwsze klocki, lista deali na sztywnych danych, uruchomienie
  w Dockerze. Potem powrót do etapu 1 (model danych, generator).
  Jak wyszło 11.10: powstały od razu oba widoki, Docker został odłożony, a praca
  wróciła do etapu 1, kroku 1 (model danych w HubSpocie).

**Stan panelu po 11.10** (`recon-panel/`): oba widoki działają na danych wpisanych na
sztywno, zbudowane i przeklikane w przeglądarce (synchronizacja, skan z listy i z deala,
wyszukiwanie, filtry, paginacja, box szczegółów faktury, zakładka pytań, stany bez
umowy, wejście prosto pod adres deala, przełącznik źródła). Brakuje: logowania i store'a
`auth`, połączenia z n8n, Dockera, repozytorium git (ustalone, jeszcze niezałożone).

Jak uruchomić: w folderze `recon-panel/` komendy `npm run dev` (podgląd na żywo),
`npm run build` (wersja do wdrożenia), `npm run format` (Prettier). Node 22, w nvm
ustawiony jako domyślny. Wersje: Vue 3.5, Vue Router 5, Pinia 4, Vite 8, `sass-embedded`.

Co jest na razie udawane i zniknie przy podłączaniu n8n:
- synchronizacja: trwa 4 sekundy, potem "Up to date" na 2 sekundy;
- skan: jedna faktura co 3 sekundy, wynik każdej jest z góry wpisany w danych; skan
  z listy czeka na koniec synchronizacji;
- odpowiedź AI w zakładce pytań: po 10 sekundach, z gotowych przykładów;
- przycisk "Look for an attachment now" uruchamia synchronizację;
- przełącznik HubSpot / Salesforce przełącza między dwoma zestawami danych
  w `src/mocks/`.

Zasady budowy panelu [USTALONE 11.10]:
- **Dwa widoki:** `PanelListingView` (adres `/`) i `PanelSingleView` (`/deals/:id`).
  "No contract" i "Contract unreadable" to stany widoku single, nie osobne strony.
- **Widok układa moduły, moduł zaczyna się od `<section>`.** Odstępy między modułami
  ustawia widok (`gap`), moduł nie ma marginesów zewnętrznych.
- **`src/modules/`** to duże sekcje widoku: `ListingIntro`, `ListingStats`, `ListingDeals`,
  `SingleSummary`, `SingleWorkspace` (zakładki) z `SingleInvoices` i `SingleAsk`.
- **`src/components/`** to małe klocki wielokrotnego użytku: `AiButton`, `AppButton`,
  `StatusTag`, `StatTile`, `SearchInput`, `SyncStatus`, `SourceSwitch`, `AppPagination`,
  `InvoiceDetail`, `ClauseQuote`, `BackLink`, `AppIcon`, `IconAi`, `AppLogo`.
- **Grafiki w `src/assets/`:** `logo.svg` i `icons/*.svg`. `AppIcon` czyta ikony prosto
  z folderu (nowa ikona = nowy plik). Ikona karty przeglądarki to `public/favicon.svg`.
- **Style:** zmienne w `src/styles/_variables.scss` (dostępne w każdym komponencie bez
  importu), style klocka w jego pliku (`<style scoped lang="scss">`), kolory statusów
  z mapy `$status-colors`.
- **Dane na sztywno w `src/mocks/`** w kształcie, jaki ma oddawać n8n (gotowe liczby).
  Symulacja skanu i odpowiedzi AI też tam siedzi i jest tymczasowa.
- **Store'y:** `deals`, `scan`, `deal` (opis wyżej). `auth` dojdzie z logowaniem.
- **Trasy:** `deals` (lista) i `deal` (szczegóły, z `id` deala). Wiersz listy jest
  linkiem. Wejście prosto pod adres deala z drugiego CRM-u samo przełącza źródło.
  Nieznane `id` pokazuje komunikat "This deal does not exist in the panel."
- **Zakładki** w `SingleWorkspace` mają identyfikatory `invoices` i `reactiveAI`
  (nazwy nadane przez Arta, nie zmieniać).
- **Pomocnicze funkcje w `src/utils/`:** `format.js` (zapis kwot i różnic), `status.js`
  (nazwy statusów i filtry faktur).
- **Logo i ikona AI są wstawiane jako kod SVG**, nie jako obrazek, żeby dało się je
  animować (pulsujące iskierki).
- **Pliki Arta są źródłem prawdy.** Art sam zmienia kod panelu, więc przed nadpisaniem
  pliku agent sprawdza, czy nie zmienił się od ostatniego odczytu.
- W panelu (znany teren Arta) Art zwykle sam zleca napisanie kodu wprost ("lecisz").
  Zasada z sekcji 1 się nie zmienia: bez takiego zlecenia najpierw wyjaśnienie i zgoda.
- Przycisk AI w trakcie pracy nie zmienia kursora.
- Sprawdzanie zmian: agent buduje kopię panelu u siebie (`vite build`) i przeklikuje ją
  w przeglądarce przed zapisaniem plików w folderze Arta.

**Wzorem jest makieta** (10.10.2026): folder `recon_panel_demo/` (`index.html` +
`support.js`, otwiera się w przeglądarce bez instalacji). Ta sama makieta jest na płótnie
projektowym "Recon – aplikacja w CRM". Interfejs po angielsku, dane przykładowe.
Słownictwo, statusy, zasady skanu, synchronizacja i zasady wyglądu są w sekcji 4.

### Ekran 1: lista deali

- U góry: logo i nazwa, jedno zdanie opisu, po prawej status synchronizacji i przycisk
  skanu wszystkich faktur ("Scan N invoices").
- Cztery boxy z liczbami dla całości: To recover, Mismatches, Invoices scanned,
  Contracts ready.
- Tabela "Deals list" z polem "Search deals" (filtruje po nazwie deala, firmie, pliku umowy
  i statusie). Kolumny: Deal, Company, Invoices scanned, To recover, Contract, Status.
  Bez osobnej kolumny z liczbą niezgodności, bo pokazuje ją status.
- Kliknięcie w wiersz otwiera szczegóły deala.

### Ekran 2: szczegóły deala

- Przycisk powrotu "All deals".
- Box pierwszy: nazwa deala i status, pod nią firma, plik umowy i liczba klauzul, link
  "View this deal in CRM" (z ikoną wyjścia na zewnątrz), przycisk skanu faktur tego deala
  i trzy boxy z liczbami (Invoices scanned, Mismatches, To recover).
- Box drugi, dwie zakładki:
  - **Invoices** — tabela wszystkich faktur tej umowy ze statusem [USTALONE]. Filtry po
    statusie z licznikami, pole "Search invoices", 10 faktur na stronę. Kliknięcie
    w fakturę otwiera box szczegółów. Przy niezgodności jest tam: opis, kwoty (Invoiced,
    Expected under the contract, Difference), cytaty z umowy z numerem paragrafu oraz
    numer i status ticketu.
  - **Ask the contract** — pole "Ask AI about this contract", przycisk "Ask AI", gotowe
    przykładowe pytania, odpowiedź ze wskazaniem paragrafu. Tylko ta umowa (filtr po ID
    deala), tylko odpowiedzi, żadnych akcji w CRM.
- Dwa osobne ekrany zamiast powyższego, gdy umowy nie da się użyć: "No contract"
  (przy dealu nie ma PDF-a) i "Contract unreadable" (PDF bez tekstu, np. skan).

Po co lista wszystkich faktur, a nie tylko niezgodnych: handlowiec widzi, że system
sprawdził wszystko, a nie tylko to, co zgłosił. "No contract basis" jest widoczne wprost.
Na demo od razu widać skalę (np. 22 faktury, 3 niezgodne).

Ponowny skan już zeskanowanych faktur: tylko po zmianie umowy i tylko dla faktur tej umowy.

Widok zbiorczy ("ile łącznie do odzyskania") to ekran listy deali. Raport HubSpota na
ticketach zostaje jako darmowy dodatek, nie jako główny widok.

Po co lista wszystkich faktur, a nie tylko niezgodnych: widać, że system sprawdził
wszystko, a nie tylko to, co zgłosił. "No contract basis" jest widoczne wprost.

Ponowny skan już zeskanowanych faktur: tylko po zmianie umowy i tylko dla faktur tej umowy.

---

### Link do CRM [PROPOZYCJA]

"View this deal in CRM" to zwykły link otwierany w nowej karcie. Panel dostaje gotowy
adres razem z danymi deala i nie zna formatu adresów żadnego CRM-u.
**Rozstrzygnięte 12.10 [USTALONE]: n8n nie składa adresu, tylko przepisuje pole `url`,
które HubSpot oddaje przy każdym dealu.** Jeszcze lepiej pod wymienny CRM — Salesforce
odda swój własny adres i nic w kodzie się nie zmieni.
Format HubSpota (konto w EU, potwierdzony na żywo 12.10):
`https://app-eu1.hubspot.com/contacts/149521488/record/0-3/{ID deala}`. Możliwe też wejście w drugą
stronę: własne pole z linkiem do panelu na dealu w HubSpocie (zwykłe pole, bez Reacta).

---

### Czego nie ma

- **Żadnej aplikacji, karty ani kodu w HubSpocie.** Niezgodności są tam widoczne natywnie
  jako tickety przypięte do deala.
- **Wgrywania umowy w panelu.** [USTALONE] Umowę przypina się natywnym załącznikiem na
  dealu w HubSpocie (sekcja 6).
- **Przycisku ponownego odczytu umowy** ("Re-index contract" usunięty 10.10).

---

### Do ustalenia na starcie pracy nad panelem

- Adres panelu i n8n (domena, HTTPS), sekcja 10.
- Czy z HubSpota ma prowadzić do panelu wejście (link na dealu), czy panel jest osobny.

---

---

## 10. INFRASTRUKTURA I HTTPS

**Stan 27.10:** n8n jest wspólny w `/root/n8n`, Recon ma własny compose w `/root/recon`
(na razie tylko `recon-contract-reader`), oba połączone siecią Dockera `shared`. Panel
Recona dołączy do compose w `/root/recon`. Szczegóły w `agents/n8n.md`. Wolne porty
Mikrusa: `30295` (`20295` zajmuje n8n). Pliki wgrywane z Maca przez `rsync`, bez gita
na serwerze. RAM: 2 GB bez swapu, n8n ~500 MB, czytnik z limitem 256 MB.

- VPS: **Mikrus**, ten sam, na którym działa n8n i panel PageSpeed Monitora
  (wspólny docker-compose). [USTALONE]
- n8n działa tam najpewniej **bez HTTPS** (adres z numerem serwera i portem). W PageSpeedzie
  to nie przeszkadzało. Panel Recona musi stać pod HTTPS (logowanie, tokeny), a strona
  pod HTTPS nie może wołać n8n bez HTTPS, więc HTTPS jest potrzebny dla obu.
- **Nie blokuje etapu 1** (generator, Supabase i silnik uruchamiany ręcznie w n8n działają bez tego).
  Jest warunkiem etapu 2. Warto zrobić wcześniej, bo bez HTTPS hasło do n8n idzie otwartym
  tekstem.
- Stary adres z portem może zostać, panel PageSpeeda dalej działa.
- Panel Recona stoi na tym samym VPS, w tym samym docker-compose. Wygodny układ:
  jedna domena, dwie subdomeny (panel i n8n). [PROPOZYCJA]

Opcje, w kolejności prób [PROPOZYCJA]:
1. Darmowa subdomena Mikrusa z HTTPS — **niepotwierdzone**, sprawdzić w panelu Mikrusa.
2. Osobna tania domena pod Recona na Cloudflare + Cloudflare Tunnel (ładny adres do demo,
   zero ryzyka dla innych stron).
3. Subdomena domeny, którą Art już ma — działa, ale wymaga ostrożności przy DNS.

HubSpot nie daje darmowej domeny, którą dałoby się skierować na własny serwer.
Po zmianie adresu ustawić w n8n zmienną `WEBHOOK_URL` na nowy adres z HTTPS.

---


---

## Pusta lista deali [USTALONE 14.10]

Gdy synchronizacja zwróci pustą listę, panel **nie pokazuje pustej tabeli**, tylko stan
z ikoną, przyciskiem odświeżenia i odnośnikiem do kontaktu ze wsparciem (na demo
odnośnik pozorny).

Powód: pusta lista zwykle znaczy, że coś nie zadziałało po stronie CRM-u, a nie że klient
nie ma umów. Ponowienie zapytania jest wtedy jednym kliknięciem użytkownika, zamiast pętli
w n8n. Przy okazji naprawia dane: ponowna synchronizacja odarchiwizowuje umowy, które
fałszywie pusta odpowiedź zdążyła zarchiwizować (`agents/n8n.md`).

## Stan po aktualizacji danych [26.10]

Panel nadal stoi **w całości na `src/mocks/deals.js`** — w `src/` nie ma ani jednego
zapytania sieciowego. Mocki zaktualizowano 26.10, żeby pokazywały te same stany co dane:

| Deal | Faktury | Umowa | Status |
|---|---|---|---|
| Halden | 21 z 22 | `MSA-2025-014.pdf` | 6 mismatches, €1 350,00 |
| Brightwater | 20 z 20 | `SA-2024-031.pdf` | All compliant |
| Ostrava | 18 z 24 | `LA-2026-002.pdf` | Ready to scan |
| Kessler | 0 z 17 | brak | No contract |
| Lumen | 0 z 0 | `LRG-2026-118.pdf` | Nothing billed yet |

**Dwie zmiany w komponentach, nie tylko w danych:**

1. **Deal bez umowy pokazuje swoje faktury.** Wcześniej `PanelSingleView.vue` renderował
   blok roboczy tylko przy statusie `read`, więc Kessler był pustym ekranem z komunikatem.
   Teraz warunek brzmi: umowa przeczytana **albo** deal ma jakiekolwiek faktury. Komunikat
   o braku umowy zostaje na górze, lista faktur pojawia się pod nim ze statusem
   `No contract basis`.
2. **Zakładka „Ask the contract" znika, gdy nie ma umowy** (`SingleWorkspace.vue`). Nie ma
   czego pytać, więc nie pokazujemy martwego przycisku. Dodatkowo zakładka wybrana na innym
   dealu nie przenosi się na ten bez umowy.

**Nowy status wyświetlany: `Nothing billed yet`** — umowa jest, faktur jeszcze nie ma.
Przycisk skanowania sam się wyłącza i mówi „Nothing to scan".

**Status `Contract unreadable` usunięty z mocków** zgodnie z decyzją z 26.10.

**Linki do CRM** prowadzą teraz na prawdziwe deale (`525865702598` i pozostałe), a nie na
wymyślone numery.

**Drobiazg do poprawy kiedyś:** pusta tabela faktur mówi „No invoices with this status",
co pasuje po odfiltrowaniu, ale nie wtedy, gdy deal po prostu nie ma jeszcze żadnej
faktury (Lumen). Tam lepiej brzmiałoby „No invoices on this deal yet".