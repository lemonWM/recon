# Recon — notatka dla agenta (kręgosłup)

Stan na: 7 listopada 2026. **Ten plik jest punktem startowym każdej sesji.** Trzyma to,
co stałe i przekrojowe: cel, zasady pracy, architekturę w skrócie, plan etapów, otwarte
pytania i historię decyzji. Szczegóły obszarowe leżą w `agents/`.

**Gdzie skończyliśmy 7.11 i od czego zacząć następną sesję:**
- **Projekt przeniesiony na nowego Maca przez pendrive (7.11)**, dalej w `Desktop/recon`.
  Bez `node_modules` — przed lokalnym uruchomieniem `npm install` w danym podfolderze.
  Repozytorium git dalej nie założone.
- **`RECON - CONTRACT - READ` działa end-to-end (7.11):** umowy `attached` → PDF ze
  Storage → czytnik → `contract_chunks` → status `read`. W bazie **137 fragmentów**,
  cztery umowy `read`, Kessler `no_contract`. Przetestowane: pierwszy odczyt, ponowny
  odczyt bez dubli, ręczna zmiana jednej umowy na `attached` (`agents/n8n.md`).
- **`RECON - SUPABASE - KEEPALIVE` (7.11):** codzienny ping bazy o 00:01, żeby darmowy
  Supabase nie usnął (`agents/n8n.md`).
- **Mikrus po restarcie (sprawdzone 7.11):** `n8n`, `recon_contract_reader`
  i `pagespeed_panel` wstały same. Czytnik bez wystawionego portu (`3000/tcp`).
  Logowanie: `ssh root@srv71.mikr.us -p 10295`.
- **Do zrobienia przy okazji:** eksport JSON `SUPABASE - KEEPALIVE` do `n8n/` (`DEALS - SYNC` i `CONTRACT - READ`
  wyeksportowane 7.11 do `n8n/recon-hs-deals-sync.json` i `n8n/recon-contract-read.json`), najlepiej
  razem z założeniem gita;
  decyzja o polu `section_no` (czytnik je zwraca, tabela nie ma).
- **Następny krok:** embeddingi w Voyage (`voyage-4-lite`, `vector(1024)`) dla 137
  fragmentów — kolumny `embedding` i `embedding_model`.

**Gdzie skończyliśmy 27.10 i od czego zacząć następną sesję:**
- **Cięcie umów działa (27.10):** usługa `recon-contract-reader/` (Node, `pdfjs-dist`)
  przyjmuje PDF na `POST /chunk` i oddaje fragmenty na poziomie klauzul z metadanymi.
  Cztery umowy → 137 fragmentów (Halden 34, Brightwater 32, Ostrava 38, Lumen 33)
  (`agents/rag.md`).
- **Tabela `contract_chunks` stoi (27.10)**, `sql/005`. Jeszcze pusta. Dopisany też
  brakujący plik `sql/004` (`agents/supabase.md`).
- **Mikrus przebudowany (27.10):** n8n wyjęty z projektu PageSpeeda do `/root/n8n` jako
  wspólna instancja dla wszystkich projektów. Recon ma własny compose w `/root/recon`,
  czytnik umów działa tam bez otwartego portu, n8n widzi go po sieci Dockera `shared`
  (`agents/n8n.md`, `agents/panel.md` sekcja 10).
- **Umowy w Supabase Storage (27.10):** synchronizacja pobiera PDF z HubSpota i kładzie
  go w prywatnym buckecie `contracts_files` pod ścieżką `{crm_id}/{fileMd5}.pdf`.
  `contracts.file_path` wskazuje teraz na tę kopię, nie na HubSpota. Cztery umowy
  `attached`, Kessler `no_contract` (`agents/n8n.md`, `agents/supabase.md`).
- **Następny krok:** przepływ `RECON - CONTRACT - READ` w n8n: umowy `attached` → PDF ze
  Storage → `http://recon-contract-reader:3000/chunk` → zapis do `contract_chunks` →
  status `read`. Przepływ nie zna HubSpota. Potem embeddingi (Voyage).

**Stan 26.10:**
- **Dane testowe kompletne (26.10):** pięć deali pokrywa pięć różnych stanów — trzy umowy
  z fakturami i podłożonymi błędami, Kessler z fakturami bez umowy, Lumen z umową i bez
  faktur. W bazie **83 faktury**, 16 z podłożonym błędem.
- **PDF-y umów (26.10):** `npm run pdfs` składa cztery dokumenty z tekstu umowy
  (`agents/rag.md`). Wszystkie cztery wrzucone na deale w HubSpocie; Kessler celowo pusty.
- **Klucz odpowiedzi na dysku (26.10):** `out/expected-findings.json` i `.md`,
  16 findings, netto 3 422 €. Nigdy nie trafia do bazy.
- **Mechanizm załączników rozpoznany (26.10):** załącznik na dealu to notatka z polem
  `hs_attachment_ids` (`agents/hubspot.md`).
- **Odczyt załączników działa (26.10):** `RECON - HS - DEALS - SYNC` zapisuje `file_name`,
  `file_path` i status umowy. Przetestowane w obie strony — usunięcie pliku z deala cofa
  stan na `no_contract`, ponowne wrzucenie ustawia `attached` (`agents/n8n.md`).
- **Nowy stan `attached`** w `contracts.status`: plik jest, jeszcze nieprzeczytany.
  Migracja `sql/004` (`agents/supabase.md`).
- **Następny krok:** chunkowanie umów i embeddingi. Lista wejściowa to umowy ze statusem
  `attached` — dziś cztery.

**Stan wcześniejszy (13–14.10):**
- **HubSpot:** model danych skończony, Service Key działa, pięć deali testowych
  (`agents/hubspot.md`).
- **n8n:** przepływ `RECON - HS - DEALS - SYNC` **działa end-to-end**: pobiera deale
  Recona z firmami jednym zapytaniem GraphQL i zapisuje je do Supabase (`agents/n8n.md`).
- **Panel:** oba widoki na danych wpisanych na sztywno. Brak logowania, połączenia z n8n,
  Dockera i repozytorium git (`agents/panel.md`).
- **Supabase:** projekt `recon` założony, rozszerzenie `vector` włączone, tabele
  `customers` i `contracts` stoją i mają w sobie pięć deali z HubSpota
  (`agents/supabase.md`, pliki w `sql/`).
- **Archiwizacja umów działa (14.10):** deal usunięty z CRM albo z odznaczonym
  `deal_recon` dostaje `archived_at` i znika z panelu, a po powrocie odżywa
  (`agents/n8n.md`).
- **Supabase:** doszły `invoices`, `invoice_lines` i widok `invoices_with_deal` (`sql/003`).
- **Generator (`recon-contracts-generator/`):** warunki pięciu umów, tekst umowy po
  angielsku, wyliczanie faktur z kluczem odpowiedzi **i zapis do Supabase**. W bazie leży
  66 faktur, 16 z podłożonym błędem (`agents/rag.md`).
- **Następny krok:** PDF z tekstu umowy, plik ground truth na dysk, wrzucenie PDF-ów
  na deale w HubSpocie.

## Gdzie czego szukać

Numeracja sekcji została zachowana przy przeprowadzce, więc odsyłacze w stylu „sekcja 7"
w dalszym tekście nadal są ważne — poniższa tabela mówi, w którym pliku ich szukać.

| Sekcja | Temat | Plik |
|---|---|---|
| 1–3 | tryb pracy, cel, historia pomysłu | ten plik |
| 4 | architektura: kto co robi | ten plik |
| 4 (gdzie leżą dane, powiązania, status faktury) | model danych | `agents/supabase.md` |
| 4 (statusy i nazwy w interfejsie, zasady wyglądu) | wygląd panelu | `agents/panel.md` |
| 4 (skąd ekran bierze dane) | przepływ danych do panelu | `agents/panel.md` |
| 5 | zasady pod wymienny CRM | ten plik |
| 5 (mapa obiektów) | odpowiedniki HubSpot / Salesforce | `agents/hubspot.md` |
| 6 | przepływy i wyzwalacze | `agents/n8n.md` |
| 7 | panel Vue: ekrany, budowa kodu | `agents/panel.md` |
| 7 (konto, dostęp, wersja API, GraphQL) | HubSpot | `agents/hubspot.md` |
| 7 (pierwszy przepływ, zapytania panelu) | n8n | `agents/n8n.md` |
| 8 | plan etapów | ten plik |
| 9 | kryteria „solidnego mida", ewaluacja | `agents/rag.md` |
| 10 | infrastruktura i HTTPS | `agents/panel.md` |
| 11 | stack | ten plik |
| 11a | embeddingi, umowy testowe, generator | `agents/rag.md` |
| 12 | otwarte pytania | ten plik |
| 13 | widoczność | ten plik |
| 13a | wideo | `agents/video.md` |
| 14 | historia decyzji | ten plik |

**Zasada:** decyzje zapisujemy w historii w tym pliku, a ich rozwinięcie w pliku
obszarowym. Nie dublujemy treści między plikami.

W folderze projektu (`Desktop/recon`) są poza tym: `recon-panel/` (panel w Vue),
`recon_panel_demo/` (klikalna makieta, wzór wyglądu i tekstów), `recon_video/` (skrypty
do nagrywania scen) oraz `sql/` (struktura bazy).

Oznaczenia: **[USTALONE]** — decyzja Arta, nie zmieniać bez jego wyraźnej zgody.
**[PROPOZYCJA]** — wypracowane w rozmowach, jeszcze niezatwierdzone; potwierdzamy
na starcie danego etapu.

---

## 1. ZASADA NADRZĘDNA — TRYB PRACY [USTALONE]

- Pracujemy **krok po kroku**. Art chce się nauczyć, a nie dostać gotowca.
- Nic nie kodować i nie zmieniać w n8n bez wcześniejszego wyjaśnienia "co i dlaczego" oraz
  wyraźnej zgody.
- Tłumaczyć **prostym językiem**, bez zbędnego żargonu, z analogiami. Sprawdzać zrozumienie
  przed przejściem dalej.
- **Nie wysyłać gotowych paczek, zipów ani scaffoldu.** Jeden plik / jedna komenda na raz.
  Przy dłuższych zmianach podawać cały plik do podmiany i zawsze mówić, do którego pliku
  należy zmiana.
- Decyzje architektoniczne podejmujemy razem, na starcie danego etapu, nie z góry.
- Język pracy: polski.
- Komentarze w kodzie w języku angielski.
- **Wcięcia w kodzie: tabulatory, jeden tab = 4 spacje.** [USTALONE 11.10] Dotyczy
  każdego pliku z kodem w projekcie. W panelu pilnują tego `.editorconfig` i Prettier
  (`useTabs`, `tabWidth: 4`).
- **Connectory HubSpot i Supabase — tylko odczyt.** [USTALONE 25.10] Agent ma dostęp do
  connectorów HubSpot i Supabase, czyli może sam zajrzeć do CRM-u i do bazy: sprawdzić
  tabele, rekordy, pola, stan danych po operacji. Może z tego korzystać swobodnie, bo to
  zastępuje wklejanie wydruków do czatu. **Nigdy nie modyfikuje danych** — żadnego
  `insert`, `update`, `delete`, migracji, zmiany pól w HubSpocie ani zapisu rekordów —
  dopóki Art wyraźnie nie poleci takiej operacji. Zapisy i klikanie robi Art, między
  innymi dlatego, że to jest część nauki.

---

---

## 2. CEL PROJEKTU [USTALONE]

- **Nauczyć się porządnie RAG i n8n.** RAG jest dziś w prawie każdej ofercie AI engineering.
- Projekt portfolio: CV, Upwork, LinkedIn.
- Poprzeczka: **solidny poziom mid** w części RAG (kryteria w sekcji 9), poziom seniorski
  w integracjach i architekturze, bo to Art robi od lat.
- Wyróżnik: **RAG + CRM**. RAG umie wielu, połączenie RAG z CRM mało kto.
- Czas: ok. **2 miesiące**, równolegle z dwoma klientami (6Minded, Unravel).
- Po Reconie: aktualizacja portfolio/CV, potem Upwork (PageSpeed Monitor + Recon).
  Cel: być blisko pracy w AI automation do końca roku.
- Zasada: **solidność = głębia + dowód w liczbach, a nie liczba funkcji.**

### 2a. ZAŁOŻENIE — PLATFORMA NIE JEST RDZENIEM [USTALONE 25.10]

Punkt widzenia Arta, z którego wynikają decyzje w całym projekcie. **Założenie
świadome od pierwszego dnia, nie wniosek z perspektywy czasu** — wyciągnięcie
architektury poza platformę było celem od początku. Odrzucenie Reacta w CRM-ie,
serverlessu HubSpota i workflowów po stronie CRM-a (10.10) to konsekwentne trzymanie
się tego założenia, nie osobne decyzje.

- Platforma daje **dane, logowanie, uprawnienia i podstawowy proces**. Nic więcej.
  Rdzeniem nie jest i nie ma być.
- Silnik, czyli to, co rozumie, liczy i decyduje, stoi **poza platformą**. To jest to,
  co budujemy.
- HubSpot, Salesforce, SAP — żadna z nich nie jest tematem. Tematem jest to, co da się
  wokół nich zbudować. "Nie interesuje mnie SAP sam w sobie, interesuje mnie, jak
  z niego zedrzeć dane i obrobić je w AI."
- Dlatego produktem Recona nie jest sprawdzanie faktur, a **silnik plus adaptery**.
  Sprawdzanie faktur to pierwszy przypadek użycia, kolejne źródło to dowód, nie nowy projekt.
- Specjalizacja leży tam, gdzie nie ma nazwy dostawcy: jakość wyszukiwania, wyciąganie
  danych z dokumentów, deterministyczne porównanie, mierzenie skuteczności i rzemiosło
  integracyjne.

---

---

## 3. HISTORIA PROJEKTU W JEDNYM ZDANIU [USTALONE]

> **Recon sprawdza, czy firma fakturuje klientów zgodnie z umowami, i znajduje pieniądze,
> których nie policzyła.**

Kierunek **sprzedażowy**: umowy z klientami kontra faktury, które firma im wystawia.
Typowy błąd: ktoś zapomniał o corocznej podwyżce, nie doliczył dodatkowych użytkowników,
dalej nalicza rabat, który się skończył. Firma zarabia mniej, niż powinna, i nikt tego nie
widzi, bo umowy to dziesiątki stron tekstu.

Dlaczego sprzedaż, a nie dostawcy: klient, deal i umowa naturalnie żyją w CRM, więc CRM jest
częścią procesu od początku do końca, a nie doklejonym wyjściem.

### Jak zmieniał się pomysł

| Wersja | Kiedy | Co to było | Dlaczego odeszliśmy |
|---|---|---|---|
| 1 (PDF "opis projektu") | lato 2026 | Szeroka analityka faktur: erozja marży, luka gotówkowa, martwy zapas, 14 typów problemów, dashboard w Vue | Głównie liczenie w SQL, RAG nie miał tam miejsca; ryzyko setek godzin |
| 2 (notatka 27.09) | wrzesień 2026 | Odchudzenie + mocny RAG: faktury od dostawców kontra umowy z dostawcami | Umowy zakupowe leżą w księgowości, CRM byłby naciągany |
| 3 (ten plik) | 9–10.10.2026 | Strona sprzedażowa + CRM (HubSpot, potem Salesforce) | obowiązuje |

---

---

## 4. ARCHITEKTURA — KTO CO ROBI

Podział ról [USTALONE]:

| Element | Rola | Gdzie działa |
|---|---|---|
| **HubSpot CRM** | Proces i organizacja: klienci, umowy, zgłoszenia, statusy, ludzie | chmura HubSpota |
| **Supabase** | Pamięć, która zasila AI: pliki, fragmenty umów, faktury, wyniki | chmura Supabase |
| **Claude API** | Myślenie: ocena faktury względem znalezionych zapisów umowy, z cytatem | usługa, nic nie hostujemy |
| **n8n** | Dyrygent: spina wszystko i pilnuje kolejności | Docker na VPS (Mikrus) |
| **Panel Recon** | Interfejs: lista deali, szczegóły, skan, pytania do AI. Rozmawia tylko z n8n | Vue.js, Docker na VPS (Mikrus) |
| **Node.js** | To, z czym n8n radzi sobie słabo: generator danych (skrypty lokalne) oraz czytanie i cięcie PDF-ów umów (usługa `recon-contract-reader` w Dockerze, wołana przez n8n) | skrypty + usługa |

Twarde decyzje [USTALONE]:
- **Zero HubSpot serverless i zero interfejsu w HubSpocie.** Backendem jest n8n,
  interfejsem własny panel. W HubSpocie nie budujemy żadnej aplikacji ani karty.
- **Najpierw HubSpot**, bo to znany teren. Salesforce jako łatwa przepinka później.
- **Dane w pełni syntetyczne**, z własnego generatora. Nic nie zależy od danych klientów.
- **Umowy po angielsku.** Mocniejsze pod CV i oferty zagraniczne, a RAG po angielsku działa
  zwykle lepiej niż po polsku. Sesje robocze i ten plik zostają po polsku.
  Interfejs aplikacji też jest po angielsku [USTALONE na makiecie 10.10].
  [PROPOZYCJA] Konsekwentnie po angielsku także reszta danych: faktury, nazwy klientów,
  treść ticketów, nazwy pól.

---

## 5. ZASADY POD WYMIENNY CRM [PROPOZYCJA]

Cel [USTALONE]: budujemy pod HubSpota, ale tak, żeby dało się przepiąć źródło danych na
Salesforce bez przerabiania silnika.

1. **Neutralny format w Supabase.** Tabele nazywają się `customers`, `contracts`, `findings`,
   a nie "companies" czy "deals". Każdy rekord ma `crm_source` (hubspot / salesforce)
   i `crm_id` (ID rekordu w tym systemie).
2. **CRM tylko w dwóch miejscach.** Jeden pod-przepływ n8n pobiera deale i umowy
   (synchronizacja), drugi zakłada
   zgłoszenie. Reszta (cięcie umów, wyszukiwanie, Claude, porównanie) rozmawia wyłącznie
   z Supabase.
3. **Własna lista statusów.** Recon ma swoje: `nowe`, `wyjaśniane`, `odzyskane`,
   `fałszywy alarm`. Każdy CRM dostaje tłumaczenie na swoje etapy.
4. **Zero logiki w CRM.** HubSpot tylko przechowuje i pokazuje. Nic nie liczymy w jego
   workflowach, bo tego nie da się przenieść.
5. **Jeden przełącznik.** Jedna zmienna w konfiguracji decyduje, który pod-przepływ się
   uruchamia.
6. **Recon sam pyta CRM, CRM nigdy nie woła Recona.** Żadnych workflowów w HubSpocie ani
   triggerów w Salesforce, które uruchamiają Recona. Kierunek od Arta (10.10): automatyzacji
   po stronie CRM raczej nie chcemy, bo każdą trzeba by budować osobno w każdym CRM-ie.
   Zamiast tego jest synchronizacja przy otwarciu aplikacji (sekcja 6).

---

## 8. PLAN — ETAPY

Zasada [PROPOZYCJA]: każdy etap kończy się czymś, co można pokazać. Jeśli w grudniu zabraknie
czasu, jest skończony projekt, a nie pięć zaczętych.

### Etap 1 — to jest Recon (silnik RAG z liczbami + tickety w HubSpocie)

0. Rozstrzygnąć otwarte pytania (sekcja 12).
1. **HubSpot, pół dnia:** konto testowe, firmy, deale, własne pola, pipeline ticketów.
   Wejście od znanej strony, od razu ustala model danych pod generator. [USTALONE: zaczynamy
   od HubSpot CRM]
   **ZROBIONE 12.10.** Decyzja Arta: wszystko zakładane **ręcznie** w ustawieniach
   HubSpota (odrzucony skrypt przez API). Powstały: pola na dealu i tickecie, pipeline
   ticketów, Service Key dla n8n, pięć firm i pięć deali testowych. Sprawdzone dwoma
   zapytaniami do API (lista deali z polami i powiązaniami oraz pipeline'y ticketów);
   ID i szczegóły w sekcji 7. Przy okazji rozstrzygnięty link do CRM i typ pola
   `deal_recon`.
2. **Model danych w Supabase:** klienci, umowy, aneksy (wersje umów), fragmenty umów,
   faktury, pozycje faktur, niezgodności, tabele ewaluacji.
   Faktura ma od początku `contract_id` i pole statusu (sekcja 4).
3. **Generator (Node.js):** umowy z klientami w PDF + aneksy, faktury z celowo wstawionymi
   błędami, wabiki, plik ground truth.
4. **Zestaw testowy i sposób mierzenia** — przed budową RAG-a.
5. **Wczytanie umów:** tekst z PDF → podział po klauzulach + metadane → embeddingi → pgvector.
6. **Wyszukiwanie:** wektorowe + tekstowe + filtr metadanych (wersja umowy na dzień faktury).
   Pomiar wersji prostej, potem poprawki i pomiar ponownie.
7. **Ocena przez Claude'a** z cytatem paragrafu + uczciwe "nie wiem".
8. **Wyjście do CRM:** `finding` → ticket w HubSpocie przy właściwym dealu.
9. **Wejście z CRM:** umowy pobierane z deali oznaczonych polem `deal_recon` zamiast
   prosto ze Storage.
   To jest przepływ synchronizacji (sekcja 6), w etapie 1 uruchamiany ręcznie w n8n.
10. **Pełna ewaluacja end-to-end**, liczby do CV i LinkedIn.

### Etap 2 — panel Recon w Vue na Mikrusie (lista deali + szczegóły)

- Najpierw **HTTPS dla n8n i panelu** (sekcja 10).
- ~~Projekt Vue + SCSS: zmienne i klocki według makiety (`recon_panel_demo/`).~~
  **Zrobione 11.10**, wcześniej niż w planie.
- ~~Ekrany: synchronizacja i lista deali → szczegóły deala → przycisk skanu → pytania
  do AI.~~ **Zrobione 11.10 na danych wpisanych na sztywno.** Zostaje podmiana danych
  na prawdziwe z n8n.
- Logowanie przez Supabase Auth i sprawdzanie tokenu w n8n.
- Webhooki n8n dla panelu (lista, szczegóły, synchronizacja, skan, pytanie do AI) i pętla
  zwrotna z ticketów.
- Docker i wdrożenie na Mikrusie obok n8n.

### Etap 3 — Salesforce i wideo

- **Salesforce jako drugie źródło danych dla tego samego panelu** [USTALONE jako kierunek
  10.10]. n8n zaciąga z Salesforce to samo, co z HubSpota (Account / Contract / pliki),
  i zakłada tam Case zamiast ticketu. Panel się nie zmienia. Cel: pokazać, że Recon działa
  na wielu CRM-ach naraz ("multi-CRM source").
  Darmowe konto Salesforce Developer Edition. Po stronie Salesforce nie budujemy ekranu
  (LWC) ani triggera Apex: Recon sam pyta CRM przy synchronizacji (zasada 6, sekcja 5).
  Wcześniejszy plan "karta w LWC + Apex" powstał, gdy interfejs miał być w CRM, i jest
  zastąpiony. Art kodował kiedyś w Apex, więc można do tego wrócić jako dodatku.
  **Jak to pokazać** [do przemyślenia, kierunek Arta 10.10]: NIE mieszać źródeł na
  jednej liście. Rozwiązań może być kilka. Na makiecie jest pierwsze z nich:
  **przełącznik "HubSpot / Salesforce" w górnym pasku, po prawej**. Pokazuje deale tylko
  z wybranego CRM-u, po przełączeniu wraca na listę i synchronizuje od nowa. Liczby
  w boxach dotyczą wybranego źródła. Inne możliwości: osobny adres panelu dla każdego
  CRM-u (robocze nazwy subdomen `hs-recon` i `sf-recon`; myślnik, bo podkreślenie nie
  jest dozwolone w nazwach domen) albo sama pokazówka "zaczytujemy z Salesforce".
  Technicznie w każdym wariancie: jeden kod panelu, a n8n filtruje dane po `crm_source`.
  Odrzucone: kolumna albo filtr "Source" na wspólnej liście.
- **Wideo promo na LinkedIn** z nagrań ekranu: najpierw HubSpot w ciepłych pomarańczach,
  potem ten sam przepływ w niebieskiej scenerii Salesforce. [USTALONE jako plan]
  Po zmianie 10.10 do przemyślenia: bohaterem nagrania jest własny panel, a CRM-y
  pokazują, skąd biorą się deale i gdzie lądują tickety.
  Przy nagrywaniu: krótkie klipy na scenę, te same kroki i te same dane testowe w obu CRM-ach,
  1080p, ukryte zakładki i powiadomienia. Montaż w osobnym czacie, z briefem scen.

Orientacyjny rozkład 8 tygodni [PROPOZYCJA]: tyg. 1–2 dane i pierwsza działająca ścieżka,
tyg. 3–6 właściwy RAG i pomiary, tyg. 7 HubSpot jako źródło i wyjście, tyg. 8 demo i opis.
Etapy 2 i 3 są dobrze odcięte, można je dorobić po tych 8 tygodniach bez przerabiania silnika.

**Główne ryzyko:** 9.10 projekt urósł z odchudzonego RAG-a do silnika + HubSpota + karty
z czatem + Salesforce + wideo. Każdy element jest dobry, razem to więcej niż 2 miesiące
po godzinach. Pilnować granicy etapu 1. Przy braku czasu **nie ucinać pomiaru jakości** —
karta i Salesforce robią wrażenie, ale to liczby pokazują, że Art rozumie RAG.

---

---

## 11. STACK

| Warstwa | Technologia | Status |
|---|---|---|
| Orkiestracja | n8n (self-hosted, Docker, Mikrus), **wspólna instancja** w `/root/n8n` | [USTALONE, układ 27.10] |
| Baza, pliki, wektory | Supabase: Postgres + pgvector + Storage | [USTALONE] |
| Model | Claude API (ocena z cytatem, odpowiedzi na pytania) | [USTALONE], konkretny model do wyboru |
| Embeddingi | osobny dostawca, np. Voyage albo OpenAI | **do wyboru**; według notatki z 27.09 Claude API nie ma własnych — potwierdzić w dokumentacji przy wyborze |
| Generator danych | Node.js | [USTALONE] |
| Tekst z PDF | Node.js, `pdfjs-dist`, usługa `recon-contract-reader` | [USTALONE 27.10] |
| CRM (pierwszy) | HubSpot, konto testowe `recon` (149521488), tylko dane, bez aplikacji | [USTALONE] |
| Panel (interfejs) | Vue.js + SCSS, własna aplikacja na Mikrusie, rozmawia tylko z n8n | [USTALONE 10.10] |
| Logowanie | Supabase Auth, jedno konto | [USTALONE 10.10] |
| CRM (drugi) | Salesforce Developer Edition, tylko jako źródło danych przez API (bez LWC i Apex) | etap 3 |
| Deploy | Docker + VPS | [USTALONE] |

Nie używamy: HubSpot serverless, HubSpot UI extensions (React w HubSpocie), Astro, osobnej bazy wektorowej (Pinecone, Qdrant) — przy tej skali
to tylko kolejne narzędzie do utrzymania.

---

---

## 12. OTWARTE PYTANIA — rozstrzygnąć przed pierwszą linijką kodu

- ~~Pierwszy typ błędu (MVP)~~ **Rozstrzygnięte 12.10 [USTALONE]: stawka na fakturze
  kontra stawka z umowy obowiązująca w dniu faktury.** Obejmuje niezrobioną coroczną
  podwyżkę i zmiany z aneksów, czyli od razu ćwiczy wersje umów w czasie.
- ~~Czy limit jednego typu dalej obowiązuje?~~ **Tak, na start jeden typ** (ten wyżej).
  Kolejne dopiero gdy rdzeń działa i jest zmierzony. Projektujemy jednak pod wiele typów
  od pierwszego dnia: tabela niezgodności ma kolumnę z rodzajem błędu, a w HubSpocie jest
  już lista `recon_error_type`. Dołożenie typu to wtedy nowa opcja plus kawałek logiki,
  nie przebudowa. Realnie do końca roku: jeden typ zrobiony porządnie. Przy braku czasu
  bronimy pomiaru, nie liczby typów.
- ~~Sprawdzamy każdą fakturę czy tylko wytypowane?~~ **Rozstrzygnięte 13.10 [USTALONE]:
  każdą.** Panel pokazuje wszystkie faktury ze statusem, więc inaczej się nie da.
  Zostaje policzyć koszt w kroku 10.
- **Kto jest użytkownikiem?** Handlowiec / opiekun klienta, dział finansów czy właściciel?
  Od tego zależy wygląd ticketa i karty.
- ~~Format umów~~ **Rozstrzygnięte 13.10 [USTALONE]: PDF od początku.** Wyciąganie tekstu
  z PDF-a to część prawdziwej roboty, więc nie udajemy, że umowy są plikami tekstowymi.
- ~~Granica n8n vs Node.js~~ **Rozstrzygnięte 27.10:** n8n dyryguje, pobiera pliki,
  woła API (Voyage, Claude) i pisze SQL. Node robi to, czego w węźle Code nie da się
  wygodnie pisać i testować: czytanie i cięcie PDF-ów (`recon-contract-reader`).
- ~~Model do embeddingów~~ **Rozstrzygnięte 13.10 [USTALONE]: rodzina Voyage 4, start
  od `voyage-4-lite`, kolumna `vector(1024)`.** Szczegóły i uzasadnienie w sekcji 11a.
- **Konkretny model Claude'a** do oceny (koszt kontra jakość).
- **HTTPS:** która opcja z sekcji 10.
- **Nazwa:** "Recon" jest robocza. Hasło z makiety: "Bill what you signed."

Doszło przy makiecie (10.10):
- **Teksty na ekranach "No contract" i "Contract unreadable"** oraz przycisk "Look for an
  attachment now" (sekcja 6).
- **Salesforce: osobny adres panelu (subdomena) czy tylko pokazówka zaczytania danych.**
  Bez mieszania źródeł na jednej liście (sekcja 8, etap 3).
- **Nazwa w interfejsie dla statusu `błąd`** (skan faktury się nie udał).
- ~~Po czym faktura łączy się z umową~~ **Rozstrzygnięte 11.10 [USTALONE]: po unikalnym
  ID deala z CRM.** Każdy CRM ma własne unikalne ID rekordu (HubSpot: ID deala, Salesforce:
  ID rekordu). Faktura w Supabase niesie `crm_source` i ID deala. Bez osobnego pola
  "numer umowy" na dealu. Kolejność w generatorze: najpierw deal w CRM (API oddaje ID),
  potem faktury z tym ID. Źródła się nie mieszają, więc każdy CRM ma własny zestaw faktur.
  Pomysł ze wspólnym numerem umowy wraca tylko, gdyby faktury miały przyjść z zewnętrznego
  systemu (np. Stripe).
- ~~Typ pola `deal_recon` w HubSpocie~~ **Rozstrzygnięte 12.10: pojedynczy checkbox,
  w API wartość tekstowa `"true"`.**
- ~~Pola i pipeline ticketów w HubSpocie: ręcznie czy skryptem przez API~~
  **Rozstrzygnięte 12.10: ręcznie.**
- **Jedno zapytanie na fakturę czy praca w tle z dopytywaniem** (sekcja 7).
  Decyzja po zmierzeniu w etapie 1, ile trwa skan jednej faktury i odczyt umowy.

Doszło 12.10:
- **Jakim uprawnieniem czyta się notatki (załączniki) w HubSpocie.** Scope'a
  `crm.objects.notes.read` nie ma na liście w kluczu, a dokumentacja HubSpota tego nie
  opisuje spójnie; w dyskusjach deweloperów przewija się, że notatki chodzą pod
  uprawnieniem do kontaktów. Świadomie odłożone: potrzebne dopiero w kroku 9 etapu 1,
  przy pierwszym PDF-ie na dealu. Wtedy jedno zapytanie testowe pokaże, czego brakuje,
  a scope dodaje się do istniejącego klucza bez zakładania go od nowa. Materiał na wpis
  "build in public": dokumentacja mówiła jedno, API drugie.
- ~~Sprawdzić, czy filtr `deal_recon` naprawdę działa~~ **Sprawdzone 12.10: działa.**
  Po odznaczeniu pola na jednym dealu wyszukiwanie oddało cztery zamiast pięciu.
  Uwaga na przyszłość: przy danych, gdzie wszystkie rekordy spełniają warunek, wynik
  wygląda tak samo jak przy zignorowanym filtrze — test wymaga rekordu spoza filtra.
- ~~Skąd synchronizacja weźmie nazwę firmy~~ i ~~czy użyć GraphQL~~ **Rozstrzygnięte 12.10
  testem na żywo: odczyt w synchronizacji idzie przez GraphQL** (szczegóły w sekcji 7).
  Zostaje do obserwacji koszt zapytania przy większej liczbie deali oraz status GraphQL-a
  wobec wrześniowych zapowiedzi wygaszania — nie udało się go ustalić.
- **Opcje listy `recon_error_type`.** Na start jedna ("Rate mismatch"), reszta dojdzie
  razem z decyzją o pierwszym typie błędu. Pole jest listą wyboru celowo — API przyjmuje
  tylko zdefiniowane opcje, a pola tekstowego nie da się potem zamienić na listę.

---

---

## 13. WIDOCZNOŚĆ — JEDEN WPIS I WIDEO [USTALONE 12.10]

Bez bieżących postów z budowy, bez notatek "build in public", bez rozbudowanej promocji.
Odrzucone wcześniejsze plany: posty co 2–3 tygodnie i zbieranie zdań do szuflady.

Na koniec projektu powstaje:
- **Jeden wpis na LinkedInie.** Dwa, najwyżej trzy markery z ewaluacji, w formie "wartość
  początkowa wynosiła X, po poprawieniu tego i tego w RAG-u wyszło Y". Bez wyliczanki.
- **Wideo** (sekcja 13a): HubSpot → Salesforce, jeden silnik i jeden panel, dwa CRM-y.
- **Reszta liczb i szczegółów trafia do CV**, nie do posta.

W CV uczciwie: PageSpeed Monitor to n8n + AI bez RAG-a, Recon to pierwszy projekt z RAG-iem.

Po etapie 1 warto poszukać choć jednego małego pilotażu u prawdziwego użytkownika.
"Wdrożyłem u klienta" robi większą różnicę niż trzeci własny projekt.

Uwaga: to dotyczy **publikacji**, nie pomiarów. Ewaluacja z sekcji 9 zostaje bez zmian —
bez niej nie byłoby czego wpisać ani w post, ani w CV.

---

---

## 14. HISTORIA DECYZJI

- **7.11.2026** — upsert w `RECON - HS - DEALS - SYNC` dostaje parametry jako tablicę
  (`{{ [ ... ] }}` w Query Parameters) zamiast napisu z przecinkami. Powód: n8n tnie napis
  po przecinkach, więc nazwa z przecinkiem przesuwała wartości. Przetestowane na żywo
  nazwą firmy i deala z przecinkiem. Znany problem na później: `DEAL + FILE` i
  `DEAL - NO FILE` składają JSON z tekstu, więc cudzysłów w nazwie go rozbije.

- **7.11.2026** — `RECON - CONTRACT - READ` zbudowany. Kasowanie starych fragmentów
  przeniesione na początek przepływu (za listą umów), zapytaniem `with … delete …
  returning` oddającym zawsze jeden wiersz z danymi umowy. Powód: Split Out bierze pole
  tylko z węzła tuż przed nim. Przed `SET CONTRACT READ` Remove Duplicates po
  `contract_id`, żeby `update` szedł raz na umowę, nie raz na fragment.
- **7.11.2026** — pole `section_no` z czytnika na razie pomijane przy zapisie; decyzja
  (kolumna czy usunięcie z czytnika) odłożona.
- **7.11.2026** — codzienny ping Supabase w n8n (`RECON - SUPABASE - KEEPALIVE`) zamiast
  ręcznego pilnowania aktywności projektu.

- **27.10.2026** — PDF-y umów kopiowane do **Supabase Storage** przez synchronizację.
  Powód: odczyt umowy jest silnikiem i nie może znać CRM-u (sekcja 5, zasada 2). Przy
  Salesforce zmienia się tylko synchronizacja. Odrzucone: pobieranie z HubSpota wprost
  w odczycie umowy.
- **27.10.2026** — ścieżka w Storage `{crm_id}/{fileMd5}.pdf`, nie z `id` pliku.
  `fileMd5` zmienia się tylko przy zmianie treści, więc ponowne wrzucenie tego samego
  PDF-a (przypadek Lumena `-1`) nie wywołuje ponownego odczytu. Reguła statusu z 26.10
  działa bez zmian.
- **27.10.2026** — synchronizacja na start wysyła PDF do Storage przy każdym przebiegu
  (nadpisuje, `x-upsert`). Pomijanie niezmienionych plików — gdy umów będzie dużo.
- **27.10.2026** — **skan faktur bierze wyłącznie umowy ze statusem `read`.** Po usunięciu
  pliku z deala fragmenty i kopia w Storage zostają, ale status `no_contract` wyłącza je
  z wyszukiwania. Sprzątanie osieroconych plików i fragmentów — później, jeśli potrzebne.
- **27.10.2026** — odczyt umowy to osobny przepływ, wołany na końcu synchronizacji jako
  pod-przepływ (Execute Workflow). Na etapie budowy uruchamiany ręcznie.

- **27.10.2026** — cięcie umów w Node, nie w n8n. n8n woła usługę po HTTP. Powód: logika
  na wyrażeniach regularnych, którą trzeba testować na wydrukach, a nie w węźle Code.
- **27.10.2026** — biblioteka `pdfjs-dist`, nie `pdf-parse`: oddaje pozycję tekstu na
  stronie, więc stopkę wycina się po położeniu (`y < 60`), a nie po treści.
- **27.10.2026** — cięcie po klauzulach (`4.1`, `A.1`), nagłówek sekcji trafia do
  metadanych, aneks to osobna część dokumentu z własną datą `valid_from`.
- **27.10.2026** — **wariant A**: fragment ma tylko `valid_from`, bez `valid_to`. To, że
  A.1 zastępuje 4.1, rozstrzyga Claude z treści fragmentów. Wariant B (skrypt wyłapuje
  „Section X is replaced” i ustawia `valid_to`) jest planowaną poprawką do pomiaru
  przed/po.
- **27.10.2026** — klasyczny RAG (wyszukiwanie wybiera fragmenty, Claude ocenia) zamiast
  agentic retrieval (AI dostaje spis i sam prosi o fragmenty). Powód: da się mierzyć
  osobno wyszukiwanie i ocenę. Agentic retrieval zostaje jako możliwe porównanie.
- **27.10.2026** — przy ponownym odczycie umowy stare fragmenty kasujemy i wstawiamy nowe.
  Ponowny skan faktur po podmianie umowy do przemyślenia przy kroku skanu.
- **27.10.2026** — usługa nazywa się `recon-contract-reader` (odrzucone `recon-ingest`:
  nic nie mówi). Spójne ze statusem `read` i przepływem `RECON - CONTRACT - READ`.
- **27.10.2026** — n8n jako **wspólna infrastruktura serwera**, nie część PageSpeeda ani
  Recona. Odrzucone: osobny n8n dla Recona (dubel ~500 MB RAM na 2 GB serwera, drugi port)
  i n8n w compose PageSpeeda z doklejoną siecią (mieszanie projektów).
- **27.10.2026** — czytnik umów bez otwartego portu, dostępny tylko w sieci Dockera.
  Wystawienie go na zewnątrz wymagałoby tokenu, HTTPS i zabrałoby ostatni wolny port.

- **14.10.2026** — tabele faktur (`sql/003`) i generator danych w Node
  (`recon-contracts-generator/`). Warunki umów jako dane, z których wyliczane są tekst,
  faktury i ground truth. Faktury powiązane z umową po wewnętrznym `contracts.id`.

- **14.10.2026** — pusta lista deali obsługiwana w panelu (stan pusty z odświeżeniem),
  nie pętlą ponawiania w n8n. Błędy API łapie wbudowane „Retry On Fail".

- **14.10.2026** — archiwizacja miękka (`archived_at`) zamiast usuwania wierszy; działa
  i jest przetestowana w obie strony.

- **13.10.2026** — notatka rozbita na kręgosłup (`agent.md`) i pliki obszarowe
  w `agents/`; struktura bazy jako pliki SQL w `sql/`.
- **13.10.2026** — Supabase: projekt `recon`, pgvector, Data API wyłączone, n8n łączy się
  wprost do Postgresa przez Session pooler. Tabele `customers` i `contracts`.
- **13.10.2026** — synchronizacja działa end-to-end: HubSpot (GraphQL) → n8n → Supabase,
  z zapisem typu upsert, odporna na wielokrotne uruchomienie.

- **13.10.2026** — embeddingi: rodzina Voyage 4, start od `voyage-4-lite`, `vector(1024)`,
  bez indeksu wektorowego na starcie. Porównanie modeli wchodzi do pomiarów kroku 6
  (sekcja 11a).
- **13.10.2026** — skanujemy każdą fakturę, nie tylko wytypowane. Umowy w PDF od początku.

- **12.10.2026** — odczyt w synchronizacji przez **GraphQL** (deale + firmy jednym
  zapytaniem), zapisy dalej przez REST `2026-09`. Sprawdzone na żywo (sekcja 7).
- **12.10.2026** — pierwszy typ błędu: **stawka na fakturze kontra stawka z umowy
  obowiązująca w dniu faktury**. Na start tylko ten jeden typ, ale model danych
  projektowany pod wiele typów.

- **12.10.2026** — promocja Recona to jeden wpis na LinkedInie (2–3 markery z ewaluacji)
  plus wideo. Bez postów z budowy i bez notatek "build in public"; szczegóły idą do CV.

- **12.10.2026** — Recon korzysta z API HubSpota w wersji **`2026-09`** (date-based
  versioning), nie z `v3`, które idzie do niewspieranych we wrześniu 2027. Sprawdzone
  na żywo, działa. Szczegóły w sekcji 7.
- **12.10.2026** — pierwszy przepływ w n8n: `RECON - HS - DEALS - SYNC`, Manual Trigger +
  HTTP Request, w istniejącej instancji n8n na Mikrusie. Bez gotowego węzła HubSpot.

- **12.10.2026** — model danych w HubSpocie skończony (etap 1, krok 1). Pola na dealu
  i tickecie, pipeline `Recon ticket pipeline`, Service Key `Recon platform n8n`, pięć
  firm i pięć deali testowych. Wszystko zakładane ręcznie, decyzja Arta.
- **12.10.2026** — dostęp dla n8n to **Service Key**, nie Private App ani aplikacja
  OAuth. Private Apps są legacy, OAuth to przesada przy jednym koncie.
- **12.10.2026** — link do deala w panelu bierzemy z pola `url`, które HubSpot oddaje
  przy dealu; n8n nie składa adresu samodzielnie.
- **12.10.2026** — etapy deali zostają domyślne (Sales Pipeline). Recon nie patrzy na
  etap deala, tylko na pole `deal_recon`, więc osobny pipeline deali byłby pracą,
  którą i tak trzeba by powtarzać w Salesforce.

- **11.10.2026 (wieczór)** — panel: gotowe oba widoki na danych wpisanych na sztywno.
  Układ kodu: widok → moduły (`<section>`) → małe klocki. Docker odłożony, praca
  przeszła do modelu danych w HubSpocie.
- **11.10.2026** — wcięcia w kodzie tabulatorami, jeden tab = 4 spacje (sekcja 1).
- **11.10.2026** — do Recona wchodzą tylko deale z zaznaczonym polem `deal_recon`
  (etykieta `DEAL_RECON`), pole założone w HubSpocie na koncie `recon`.

- **11.10.2026** — deal i jego faktury łączy unikalne ID deala z CRM, bez osobnego pola
  z numerem umowy.

- **11.10.2026** — start budowy panelu: JavaScript, Vue 3 + Vite, Pinia (4 store'y),
  folder `recon-panel/`, jedno repozytorium na cały projekt. Szkielet panelu przed
  etapem 1, z ustaloną granicą (sekcja 7).

- **10.10.2026 (wieczór)** — test natywnej aplikacji w HubSpocie i rezygnacja z niej:
  brak własnego HTML i CSS. Recon dostaje własny panel poza interfejsem HubSpota. Konto
  HubSpot `recon` (149521488) zostaje jako CRM z danymi testowymi, bez aplikacji.
- **10.10.2026 (noc)** — wideo: sceny z zoomem i dymkiem komentarza nagrywane skryptem
  (sekcja 13a, folder `recon_video/`).
- **10.10.2026 (noc)** — Salesforce: drugie źródło danych dla tego samego panelu
  (multi-CRM source), bez ekranu LWC i bez triggera Apex.
- **10.10.2026 (noc)** — panel: czyste Vue.js + SCSS na Mikrusie, rozmawia tylko z n8n,
  logowanie przez Supabase Auth z jednym kontem. Bez Astro.

- **9.10.2026** — kierunek sprzedażowy zamiast dostawców. CRM jako część projektu.
- **26.10.2026** — synchronizacja nigdy nie ustawia statusu `read`. Odpowiada tylko na
  pytanie „czy jest plik"; o tym, czy dokument został przeczytany, decyduje krok czytający.
  Przy niezmienionym pliku status zostaje nietknięty, żeby kolejne przebiegi nie kasowały
  wyniku przetwarzania.
- **26.10.2026** — piąty deal nie jest wyjątkiem, tylko innym stanem: Kessler ma faktury
  bez umowy, Lumen umowę bez faktur. Oba wynikają z danych, nie z rozgałęzień w kodzie —
  u Lumena z daty wejścia w życie w przyszłości, u Kesslera z `fileName: null`.
- **26.10.2026** — odrzucony stan `unreadable` (umowa dodana, ale nieczytelna). Uzasadnienie
  Arta: proces w firmie i tak narzuca standard wrzucanego pliku, więc obsługa „dodano byle
  co" to problem, którego się nie ma, jeśli się go nie stworzy. Zostają dwa stany: umowa
  jest albo jej nie ma. Kolumna `contracts.status` zachowuje wartość `unreadable` jako
  nieużywaną — do usunięcia przy sprzątaniu, nie osobną migracją.
- **26.10.2026** — PDF-y generuje `pdfkit`, nie przeglądarka. Powód praktyczny: powłoka na
  komputerze Arta to maszyna linuksowa bez przeglądarki, więc Playwright oznaczałby
  ściąganie ~300 MB do sandboksa. Główna zaleta Playwrighta — realistyczne łamanie stron
  w środku klauzuli — jest w pdfkit osiągana i tak, bo tekst wlewa się strumieniem.
- **26.10.2026** — `contracts.file_path` trzyma **adres do pobrania pliku przez przepływ**
  (`url` z API plików), nie link dla użytkownika. Panel pokazuje nazwę pliku i odsyła do
  deala w CRM-ie; przeglądarka nie dostaje klucza i nie ma go dostawać.
- **26.10.2026** — klucz odpowiedzi nazwany `expected-findings`, nie `ground truth`.
  Wiąże się ze słownictwem reszty projektu: Recon produkuje findings (pipeline ticketów
  w HubSpocie nazywa się „Recon findings"), więc klucz to findings oczekiwane.
- **26.10.2026** — rozważone i odłożone: faktury jako obiekt `INVOICE` w HubSpocie zamiast
  w Supabase. Odczyt jest dostępny, zapis wymaga rozszerzenia uprawnień. Wariant dobry, ale
  nie przybliża do RAG-a, a decyzja z 10.10 (faktury tylko w Supabase) ma swoje powody.
- **25.10.2026** — connectory HubSpot i Supabase dostępne dla agenta w trybie
  **czytam, nie piszę**: swobodny odczyt CRM-u i bazy, modyfikacje danych tylko na
  wyraźne polecenie Arta (zasada w sekcji 1).
- **9.10.2026** — HubSpot pierwszy, Salesforce jako przepinka. Bez HubSpot serverless.
- **9.10.2026** — karta React w CRM jako dashboard (podgląd, wyzwalanie, pytania do AI).
- **9.10.2026** — poprzeczka: solidny mid.
- **10.10.2026** — start budowy.
- **10.10.2026** — skan wyłącznie ręczny: bez harmonogramu w n8n, najpierw testy ręczne,
  potem webhook z przycisków aplikacji.
- **10.10.2026** — gotowa makieta aplikacji (`recon_panel_demo/`). Ustalone przy niej:
  jedno słownictwo ("scan"), pięć statusów faktury i status deala według pierwszeństwa,
  jeden wspólny układ szczegółów deala, skan po kolei i tylko po kliknięciu, niebieski
  kolor główny zamiast pomarańczowego, ciemne przyciski AI z pulsującymi iskierkami.
- **10.10.2026** — status synchronizacji danych obok przycisku skanu na liście deali
  ("Syncing data…" → "Up to date", znika po 2 sekundach). Mechanizm pod spodem jeszcze
  jako propozycja.
- **10.10.2026** — ekran aplikacji czyta wszystko z Supabase (przez n8n), nie bezpośrednio
  z CRM. CRM jest źródłem deali i umów, kopiowanych przy synchronizacji.
- **10.10.2026** — frontend niczego nie liczy, dostaje gotowe dane z n8n. Synchronizacja
  na start czeka na odczyt nowych umów, bez dodatkowego statusu.
- **10.10.2026** — poprawka: limit czasu `hubspot.fetch()` to domyślnie 15 sekund,
  najwyżej 120 sekund (wcześniej zapisane jako sztywne 15).
- **10.10.2026** — usunięty przycisk "Re-index contract". Zbędny na teraz: n8n sam zauważa
  nowy lub podmieniony plik umowy przy synchronizacji. Do powrotu, jeśli dojdą aneksy albo zajdzie
  potrzeba ręcznego wymuszenia.
- **10.10.2026** — (zastąpione tego samego dnia przez własny panel) interfejs w całości
  na stronie aplikacji (app pages): lista deali →
  szczegóły deala. Bez własnej karty na rekordzie deala.
- **10.10.2026** — język umów: angielski.
- **10.10.2026** — jeden deal = jedna umowa z konkretnym klientem; faktury tylko w Supabase.
- **10.10.2026** — karta pokazuje wszystkie faktury umowy ze znacznikiem statusu, nie tylko
  niezgodne.
- **10.10.2026** — umowy trafiają do systemu przez natywny załącznik przy dealu, bez własnego
  uploadu w karcie.
- **10.10.2026** — na start generator wpisuje `contract_id` wprost na fakturze.
- **10.10.2026** — na start jeden PDF na deal i to on jest umową. Nie komplikujemy tego
  na zapas.
- **27.09.2026** — odchudzenie scope'u i RAG w centrum (wtedy jeszcze strona zakupowa).
- Odrzucone wcześniej: RAG nad kodem OKI Portal (kod należy do 6Minded/klienta).
- Odłożone: rozwijanie PageSpeed Monitora o RAG (projekt zamknięty).
- Pomysł "asystent obsługi klienta z bazą wiedzy + zgłoszenie w HubSpocie" z notatki 27.09:
  częściowo wchłonięty przez pole "Zapytaj o tę umowę" w karcie. Jako osobny projekt
  dopiero po Reconie.
