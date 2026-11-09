# Recon — RAG, embeddingi i ewaluacja

Serce projektu: cięcie umów, embeddingi, wyszukiwanie, ocena Claude'em, pomiary.
Kręgosłup projektu i historia decyzji są w `agent.md`.

---

## 9. KRYTERIA "SOLIDNEGO MIDA" — definicja ukończenia etapu 1 [PROPOZYCJA]

1. **Zbiór testowy.** Ok. 50 faktur: część z oznaczonymi błędami, część czystych. Po każdej
   zmianie dwie liczby: ile błędów wykrył, ile fałszywych alarmów.
2. **Świadome cięcie umów.** Po paragrafach i punktach, nie co N znaków. Każdy fragment wie,
   z której umowy i paragrafu pochodzi.
3. **Wyszukiwanie lepsze niż podstawowe.** Filtr po umowie + szukanie po słowach i po
   znaczeniu. Porównanie na liczbach, np. "wersja prosta 70%, po poprawkach 88%".
4. **Cytaty.** Każda niezgodność pokazuje dokładny fragment umowy.
5. **Uczciwe "nie wiem".** Gdy umowa czegoś nie reguluje, system mówi "brak podstawy".
6. **Odporność.** Uszkodzony PDF albo padnięte API nie wywracają całości: ponowienie,
   status, wpis w logu.
7. **Koszt i czas** jednego sprawdzenia zapisane.
8. **Krótki opis decyzji:** co próbowaliśmy, co nie zadziałało, dlaczego wybraliśmy to,
   co wybraliśmy.

Najważniejsze są punkty 1 i 3. Działający RAG to poziom juniora, mid zaczyna się tam, gdzie
umiesz pokazać na liczbach, że go poprawiłeś.

### Ewaluacja (przeniesione z notatki 27.09, nadal obowiązuje)

Dane są syntetyczne i to my wstawiamy błędy, więc **wiemy dokładnie, co system powinien
znaleźć** (plik ground truth z generatora). Mierzymy:
- **trafność wyszukiwania** — czy właściwa klauzula jest wśród znalezionych fragmentów,
- **wykrywalność** — ile z wstawionych błędów system znalazł,
- **fałszywe alarmy** — ile razy zgłosił problem tam, gdzie go nie ma,
- **poprawne "nie wiem"** — czy odmawia, gdy w umowie nie ma pasującego zapisu.

Zasada startowa: **najpierw dane testowe i sposób mierzenia, potem budowa RAG-a.**

### Warte przeniesienia z wersji 1 (PDF) [PROPOZYCJA]

- **Wabiki:** sytuacje, które wyglądają na błąd, ale są w porządku (np. niższa kwota, bo
  aneks obniżył stawkę; brak podwyżki, bo umowa jej w tym roku nie przewiduje). Bez wabików
  mierzymy tylko, czy system coś znalazł. Z wabikami mierzymy, czy nie zmyśla.
- **Precyzja przed kompletnością:** system zgłaszający nieistniejące problemy jest gorszy
  niż system, który nie zgłasza nic.
- **Człowiek w pętli:** żadna niezgodność nie jest "prawdą", dopóki ktoś jej nie potwierdzi.
  W nowej wersji robi to pipeline ticketów (odzyskane / fałszywy alarm).
- **Historia przebiegów:** tabele `eval_cases` i `eval_runs`, każdy przebieg zapisany
  z kosztem i czasem. Wykres skuteczności w funkcji zmian to materiał do portfolio.
- **Ryzyko przeuczenia na własnych danych:** część zestawu testowego trzymana z boku.

Wycięte na stałe z wersji 1: marża, luka gotówkowa, martwy zapas, trzy metody wyceny kosztu,
ekstrakcja faktur z PDF/skanów, KSeF, dashboard w Vue z wersji 1 (szeroka analityka; obecny panel Vue to co innego).

---

---

## 11a. EMBEDDINGI [USTALONE 13.10]

**Model na start: `voyage-4-lite`. Wymiar wektora: 1024.**

Dlaczego Voyage, a nie OpenAI:
- **Cała rodzina Voyage 4 dzieli jedną przestrzeń wektorów** (lite / zwykły / large,
  domyślnie 1024 wymiary). Można przesiąść się na mocniejszy model **bez przeliczania
  fragmentów od nowa**. To zdejmuje główne ryzyko tej decyzji, bo zmiana wymiaru kolumny
  oznaczałaby reindeks wszystkiego.
- Voyage robi wyłącznie embeddingi i jest polecany przez Anthropic do pracy z Claude'em.
- Ceny za milion tokenów (zestawienie branżowe, do potwierdzenia w dokumentacji Voyage
  przed założeniem konta): voyage-4-lite 0,02 USD, voyage-4 0,06, voyage-4-large 0,12;
  OpenAI text-embedding-3-small 0,02 (1536 wymiarów), -3-large 0,13 (3072).

**Porównanie modeli jest jednym z pomiarów w kroku 6**, nie osobnym zadaniem. Kolejność:
lite → voyage-4-large (bez reindeksu) → opcjonalnie **Voyage Law 2**, model wyszkolony pod
teksty prawnicze, czyli nasze umowy (inna generacja, inna przestrzeń, więc osobna tabela).
To jest wprost materiał na te dwa lub trzy markery do wpisu na LinkedInie (sekcja 13).

Dlatego **tabela fragmentów ma kolumnę z nazwą modelu** — żeby wyniki dało się porównywać
i żeby było wiadomo, czym policzono który wektor.

**Na starcie nie zakładamy indeksu wektorowego** (HNSW ani IVFFlat) [USTALONE 13.10].
Przy kilkuset fragmentach Postgres porównuje wszystko po kolei i daje wynik **dokładny**,
w milisekundach. Indeksy wektorowe są **przybliżone**: szybsze, ale potrafią przeoczyć
właściwy fragment, co popsułoby pomiary jakości wyszukiwania. Wracamy do tego, gdyby
skala urosła.

Samo porównanie w pgvector to zwykła matematyka (odległość kosinusowa, operator `<=>`),
bez żadnego modelu. Inteligencja siedzi w modelu embeddingów, który rozmieścił punkty.

**Testy na żywo 8.11** (`voyage-4-lite`, ręcznie w n8n):
- Każde wejście — litera, słowo, zdanie, ~5 tys. tokenów — daje dokładnie 1024 liczby.
  Wektory są znormalizowane (długość 1), więc podobieństwo kosinusowe = iloczyn skalarny.
- Tokenizer: ok. **4,7 znaku na token** dla angielskiego tekstu umownego (24 tys. znaków →
  5 074 tokeny). „okno” = 1 token, „1.1” = 3 tokeny.
- **Bezwzględne wartości podobieństwa nic nie znaczą, liczy się ranking.** Krótkie,
  niezwiązane słowa wychodziły 0,6–0,7 („okno”–„dupa” 0,71). Wniosek: **bez sztywnego
  progu** typu „> 0,7 = trafienie”; bierzemy top-k i ustalamy k pomiarem.
- **Sens ponad językami:** „Opłaty rosną co roku o 3%” – „Fees increase by 3% each year”
  = 0,88, wyżej niż dwa angielskie sformułowania między sobą (0,81); poufność i inne
  tematy 0,27–0,46.
- **Długi tekst = rozmyty wektor:** ~5 tys. tokenów zdań umownych wyszło 0,41–0,53 do
  wszystkiego, bez wyraźnego dopasowania. Potwierdza cięcie po klauzulach.
- **Liczby i numery są dla embeddingów nierozróżnialne** („1.1” – „1” = 0,91). Kwoty
  porównuje kod; szukanie po numerze klauzuli — wyszukiwanie tekstowe (kandydat na
  hybrid search przy pomiarach).
- Embedding nie jest anonimizacją (istnieją metody odtwarzania tekstu z wektora) —
  wektory umów chronić jak same umowy.

**Pomysł do pomiarów (8.11): lokalny model embeddingów** zamiast / obok Voyage — otwarty
model (np. rodziny BGE, E5, Qwen Embedding) jako usługa w Dockerze na Mikrusie, wołana przez
n8n. Za: dane nie wychodzą z serwera, brak limitów i kosztów API, gotowe porównanie do CV.
Przeciw: 2 GB RAM na Mikrusie (n8n ~500 MB, czytnik 256 MB), inne wymiary (często 384/768)
→ osobna kolumna lub tabela, zwykle niższa jakość (do zmierzenia), więcej utrzymania.
Kierunek Arta: ciekawy, do przemyślenia przy domykaniu części inżynierskiej.

---


---

## Umowy testowe — kształt [USTALONE 14.10]

Generator tworzy dla każdego deala **jeden PDF**, zgodnie z zasadą „jeden deal = jeden
plik" (sekcja 6). Rozważone 14.10 i **odrzucone**: osobny plik na aneks. Powód odrzucenia:
kosztowałoby tabelę `contract_documents`, obsługę wielu załączników w synchronizacji
i pętlę w odczycie (ok. pół dnia), **nie dokładając nic do trudności samego RAG-a** —
filtrowanie po dacie obowiązywania i tak jest potrzebne.

Kształt jednej umowy (styl typowej umowy abonamentowej SaaS, po angielsku):

- **12–15 paragrafów, z czego dwa, trzy dotyczą pieniędzy.** Reszta to świadomy szum:
  poufność, prawo właściwe, odpowiedzialność, wypowiedzenie, poziom usług. Bez tego szumu
  wyszukiwanie nie ma czego pomylić i pomiary wyjdą sztucznie dobre.
- **Stawka podstawowa**, np. „EUR 4,500 per month".
- **Klauzula podwyżki**, np. 3% w rocznicę wejścia w życie albo wskaźnik inflacji.
  To ona jest sednem pierwszego typu błędu.
- **Aneks jako sekcja na końcu tego samego PDF-a** („Amendment No. 1"), z własną datą
  wejścia w życie, zmieniający stawkę. Realistyczne (tak wyglądają wersje ujednolicone)
  i zachowuje zasadę jednego pliku.
- **Dwa wabiki:** paragraf o opłatach za przekroczenie limitu, który nigdy się nie
  uruchamia, i wzmianka o rabacie wdrożeniowym, który już się skończył. Oba wyglądają jak
  podstawa do zakwestionowania faktury, a nią nie są.

Pięć umów różni się między sobą: inne stawki, inne daty rocznic, **jedna bez klauzuli
podwyżki w ogóle** (sprawdzenie uczciwego „brak podstawy"), **jedna z aneksem**.

**Dlaczego aneks jest najważniejszym elementem.** Po nim w materiale są dwa zdania
o miesięcznej stawce i oba brzmią autorytatywnie — wyszukiwanie po znaczeniu znajdzie oba,
bo są niemal identyczne. Poprawna odpowiedź wymaga **filtra po dacie obowiązywania**, czyli
metadanych przy fragmentach, a nie samego podobieństwa. To jest dokładnie ta różnica, którą
sekcja 9 nazywa „wyszukiwaniem lepszym niż podstawowe", i na niej będą pokazywane liczby.

Przykład: faktura ze stycznia 2025 → stawka z umowy pierwotnej; faktura z czerwca 2025 →
stawka z aneksu.

**Ground truth nie trafia do tabel, z których czyta Recon** [USTALONE 14.10]. Gdyby
prawidłowe odpowiedzi leżały w bazie obok faktur, nie dałoby się odróżnić, czy system błąd
znalazł, czy odczytał. Zostaje osobnym plikiem w repozytorium i jest wczytywany dopiero
przy ewaluacji.


### Najtrudniejszy przypadek testowy — Ostrava [USTALONE 14.10]

Umowa Ostravy zawiera **trzy wypowiedzi o stawce, które na siebie oddziałują**:

| Zapis | Treść |
|---|---|
| 4.1 | EUR 3 200 miesięcznie |
| 5.1 | w każdą rocznicę wejścia w życie wzrost o 5% stawki obowiązującej bezpośrednio przed rocznicą |
| A.1 | od 1 lipca 2025 stawka wynosi EUR 3 900 |

Aneks (A.3) zostawia pozostałe postanowienia w mocy, więc **klauzula podwyżki działa dalej
po aneksie**. Poprawny przebieg stawki (wejście w życie 1.10.2024, rocznica 1 października):

| Okres | Stawka | Dlaczego |
|---|---|---|
| X.2024 – XI.2024 | 2 880 | 3 200 minus 10% rabatu wdrożeniowego (pierwsze 2 okresy) |
| XII.2024 – VI.2025 | 3 200 | stawka podstawowa, rabat wygasł |
| VII.2025 – IX.2025 | 3 900 | aneks |
| od X.2025 | 4 095 | rocznica: 3 900 + 5% |
| od X.2026 | 4 299,75 | kolejna rocznica |

**Decyzja Arta 14.10: zostawiamy ten przypadek, nie upraszczamy go.** Odrzucone: dopisanie
do aneksu zdania wyłączającego klauzulę podwyżki. Powód: tak wyglądają prawdziwe umowy,
a trudny przypadek jest wartościowy przy pomiarach **nawet wtedy, gdy na starcie go nie
przechodzimy** — to on da różnicę między pierwszym a poprawionym wynikiem.

Oczekiwanie: pierwsze podejście RAG-a najpewniej tego nie złapie, bo wymaga skojarzenia
trzech zapisów i zastosowania ich w kolejności. To jest w porządku i wręcz pożądane.


---

## Generator danych — `recon-contracts-generator/` [14.10]

Node 22, czysty JavaScript, moduły ES. Osobny folder i własny `package.json`, niezależny
od panelu.

**Zasada budowy:** warunki umowy są **danymi**, a tekst, faktury i ground truth są z nich
**wyliczane**. Gdyby powstawały niezależnie, natychmiast by się rozjechały.

| Plik | Rola |
|---|---|
| `src/terms.js` | warunki pięciu umów + lista podłożonych błędów |
| `src/contract-text.js` | składa tekst umowy po angielsku z warunków |
| `src/invoices.js` | `feeForPeriod()` i wystawianie faktur wraz z kluczem odpowiedzi |
| `src/preview-contract.js` | drukuje umowę do konsoli (`node src/preview-contract.js 2`) |
| `src/preview-invoices.js` | drukuje harmonogram stawek i błędy (`node src/preview-invoices.js 2`) |
| `src/push-invoices.js` | zapis faktur i pozycji do Supabase (`npm run push`) |
| `src/build-pdfs.js` | składa PDF-y umów do `out/` (`npm run pdfs`) [26.10] |
| `src/build-expected-findings.js` | klucz odpowiedzi do `out/` (`npm run findings`) [26.10] |

**`feeForPeriod()` to serce.** Zbiera zdarzenia zmieniające stawkę (rocznice i aneks),
sortuje po dacie i stosuje po kolei: aneks podmienia stawkę, rocznica podnosi tę, która
obowiązuje w danym momencie. Dzięki temu rocznica po aneksie nalicza się od stawki
z aneksu — to właśnie czyni przypadek Ostravy trudnym.

**Zestaw testowy (stan 26.10): 83 faktury w bazie, 16 z podłożonym błędem (19%).**

| Klient | Umowa | Faktury | Błędy | Co sprawdza |
|---|---|---|---|---|
| Halden | `MSA-2025-014.pdf` | 22 | 6 | rabat wstępny + waloryzacja roczna |
| Brightwater | `SA-2024-031.pdf` | 20 | 4 | umowa milczy o waloryzacji — poprawną odpowiedzią bywa „nie określa" |
| Ostrava | `LA-2026-002.pdf` | 24 | 6 | aneks plus rocznica liczona od stawki z aneksu |
| **Kessler** | **brak** | 17 | 0 | **brak podstawy** — każda faktura ma wrócić jako „nie wiem", nigdy jako zgodna |
| **Lumen** | `LRG-2026-118.pdf` | 0 | 0 | umowa czytelna, nic jeszcze nie zafakturowano |

Kessler i Lumen doszły 26.10. Żaden z nich nie wymagał wyjątku w kodzie: u Lumena brak
faktur wynika z daty wejścia w życie (1.11.2026) i funkcji `periodsSoFar()`, u Kesslera
brak umowy z pola `fileName: null`.

**Przypadek Kesslera jest najtrudniejszy w całym zestawie.** Model, który chce być
pomocny, będzie kuszony, żeby coś orzec. Poprawna odpowiedź brzmi „nie mam umowy, nie
wiem" — i to właśnie ten przypadek mierzy.

| Rodzaj błędu | Ile | Co sprawdza |
|---|---|---|
| `missed_increase` | 8 | niezrobiona podwyżka roczna |
| `missed_amendment` | 2 | zignorowany aneks |
| `increase_without_basis` | 3 | podwyżka, której umowa nie przewiduje |
| `expired_discount` | 1 | rabat naliczany po terminie |
| `underbilled` | 1 | kwota niższa bez powodu |

Wszystkie mieszczą się w jednym wybranym typie błędu (stawka z faktury kontra stawka
z umowy), tylko dochodzą do niego pięcioma drogami. Pozwala to zobaczyć, które drogi system
łapie, a które nie.

Liczba błędów została świadomie podniesiona z 6 do 16 [14.10]: przy sześciu przypadkach
jedno przeoczenie zmienia wykrywalność o siedemnaście punktów, więc wykres skakałby na
szumie.

**Kierunek błędu ma znaczenie** [znalezione 14.10]. Brightwater jest przepłacone, więc
różnica jest ujemna. To dalej niezgodność z umową, ale nie „do odzyskania" przez firmę.
**Licznik „To recover" w panelu sumuje wyłącznie różnice dodatnie**, inaczej jeden taki
przypadek zaniżyłby całość. Przypadek zostaje, bo sprawdza, czy system rozpoznaje kierunek
błędu, a nie tylko jego istnienie.

### PDF-y umów [ZROBIONE 26.10]

`npm run pdfs` składa dokumenty biblioteką **pdfkit** (wybór uzasadniony w historii decyzji
w `agent.md`). A4, krój szeryfowy, nagłówki sekcji pogrubione, stopka z sygnaturą umowy,
notą o danych syntetycznych i numerem strony.

**Tekst wlewa się strumieniem, a pdfkit sam dokłada strony.** Dzięki temu klauzula potrafi
zacząć się na jednej stronie i skończyć na drugiej. **Sprostowanie 27.10:** w obecnych
plikach żadna klauzula nie przechodzi przez łamanie strony (zapis o 6.2 był nieaktualny).
Najbliżej jest Brightwater: sekcja 9 zaczyna się na stronie 1 (9.1), a kończy na 2 (9.2),
ale każda klauzula jest cała. Cięcie i tak skleja strony w jeden ciąg.

**Nota o danych syntetycznych** stoi pod tytułem na pierwszej stronie i w stopce każdej
strony, żeby pojedyncza strona wyrwana z kontekstu też ją niosła.

Pułapka przy budowie [znaleziona i poprawiona 26.10]: numer strony wypisywany
z wyrównaniem do prawej i szerokością bloku każe pdfkit potraktować stopkę jak zwykły
tekst przy dolnej krawędzi — dokłada pustą stronę i stempluje także ją. Pozycję numeru
trzeba policzyć samemu z `widthOfString`.

### Klucz odpowiedzi — `expected-findings` [ZROBIONE 26.10]

`npm run findings` zapisuje `out/expected-findings.json` i `out/expected-findings.md`:
**16 findings, netto 3 422 €**, plus zdanie na każdą umowę mówiące, co poprawny skan ma
o niej orzec — łącznie z tymi, gdzie poprawną odpowiedzią jest brak findings.

Nazwa wiąże się ze słownictwem reszty projektu: Recon produkuje findings, więc klucz to
findings oczekiwane. **Nigdy nie trafia do Supabase** — gdyby tam leżał, Recon mógłby go
zobaczyć.

Wyprowadzany jest z tego samego wywołania `buildInvoices()`, które wyprodukowało faktury
w bazie, więc nie może się od nich oderwać.

**Drobiazg dla skryptu oceniającego:** numery faktur powtarzają się między umowami
(`INV-2025-08` ma i Brightwater, i Ostrava). Porównywać trzeba po parze umowa + numer,
nie po samym numerze.

**PDF powstaje tylko z umowy.** Faktury idą prosto do tabel — generator udaje system
księgowy, a nie archiwum dokumentów. Tylko umowa jest dokumentem, bo tylko ona jest
materiałem dla RAG-a.

**Zapis do bazy działa** (`npm run push`). Skrypt dopasowuje warunki do istniejących umów
po `crm_id`, nie tworzy niczego w `contracts`, a faktury i pozycje wchodzą przez upsert,
więc można go puszczać wielokrotnie.

**Dwa błędy znalezione dopiero na prawdziwych wierszach [14.10]:**

1. **Faktury z przyszłości.** Generator wystawiał sztywno 24 okresy od wejścia w życie, bez
   oglądania się na dzisiejszą datę — wychodziły faktury za styczeń 2027. Poprawka:
   `periodsSoFar()` ucina zestaw na bieżącym miesiącu.
2. **Błąd `expired_discount` nie wyglądał jak rabat.** Przy podłożonym błędzie skrypt
   zastępował wszystkie pozycje jedną z błędną kwotą, więc faktura miała samo
   „Subscription 3825" i nie było z niej widać, **dlaczego** kwota jest niższa. Poprawka:
   ten rodzaj błędu generuje dwie pozycje, pełną stawkę i rabat.

Obu nie dało się zauważyć w podglądzie w konsoli — wyszły, dopiero gdy dane trafiły do
tabel i można było je przejrzeć wiersz po wierszu.

**Połączenie do Supabase z generatora:** `src/db.js`, ciąg w `.env` (poza repozytorium).
TLS: pooler Supabase przedstawia certyfikat, którego Node nie uznaje domyślnie
(`SELF_SIGNED_CERT_IN_CHAIN`). Do wyboru `SUPABASE_CA_CERT=` z certyfikatem pobranym
z panelu (poprawnie) albo `PGSSL_NO_VERIFY=1` (szybko, ruch dalej szyfrowany, ale bez
weryfikacji tożsamości serwera). **Stan 14.10: wybrane `PGSSL_NO_VERIFY=1`**, dopuszczalne
tylko dlatego, że dane są syntetyczne; skrypt wypisuje wtedy ostrzeżenie przy każdym
uruchomieniu, żeby to nie zostało na stałe przez zapomnienie.

**Stan 26.10:** PDF-y zrobione, klucz odpowiedzi zrobiony, załączniki wrzucone na deale.
Wariant „PDF bez warstwy tekstowej dla Lumena" **odrzucony** — patrz historia decyzji.

**Jeszcze nie zrobione:** embeddingi, wyszukiwanie, porównanie, pomiar skuteczności.
Odczyt załączników zrobiony 26.10, cięcie umów 27.10 (niżej).

## Cięcie umów — `recon-contract-reader/` [ZROBIONE 27.10]

Osobny folder i własny `package.json`, niezależny od generatora: generator udaje firmę,
czytnik to już silnik. Przy prawdziwych umowach generator wypada, czytnik zostaje.

| Plik | Rola |
|---|---|
| `src/chunk.js` | `readLines(bytes)` + `chunkLines(lines)` — PDF → fragmenty |
| `src/server.js` | usługa HTTP: `POST /chunk` (treść = PDF), `GET /health` |
| `src/dump-pdf.js` | podgląd surowego tekstu z pozycją Y, tylko do diagnozy |
| `Dockerfile` | `node:22-alpine`, `npm ci --omit=dev` |

**Biblioteka `pdfjs-dist`**, bo oddaje pozycję każdego kawałka tekstu. Dzięki temu:
- **stopka** wycinana po położeniu: wszystko poniżej `y=60` (stopka stoi na `y=40`, treść
  kończy się na `y≈79`),
- **nota o danych syntetycznych** pod tytułem wycinana dwoma wzorcami (`NOISE_RE`).

**Reguła cięcia** (linia po linii, strony sklejone w jeden ciąg):
- `4. FEES` → nagłówek sekcji, trafia do metadanych (`section_title`)
- `AMENDMENT No. 1` → od tej linii `part = amendment-1`
- `effective from 1 July 2025` → ustawia `valid_from` dla kolejnych fragmentów
- `4.1 …` / `A.1 …` → początek nowego fragmentu
- linia bez numeru → doklejana do poprzedniego fragmentu
- tekst przed pierwszą sekcją → fragment `PREAMBLE`, przed pierwszą klauzulą aneksu →
  `INTRO`

**Wynik na czterech umowach:** Halden 34, Brightwater 32, Ostrava 38, Lumen 33 fragmenty,
razem 137. Każdy fragment to jedna pełna klauzula. Ostrava: części umowy mają
`2024-10-01`, aneksu `2025-07-01`; 4.1, 5.1 i A.1 są osobnymi fragmentami.

**Wariant A [USTALONE 27.10]:** tylko `valid_from`. A.1 zawiera słowa „Section 4.1 is
replaced”, więc Claude dostaje wszystko, czego potrzebuje. Wariant B (`valid_to` na 4.1
z wyłapanego zdania) to planowana poprawka do pomiaru przed/po. Pułapka przy B: 5.1
**nie** może dostać `valid_to`, bo aneks jej nie wyłącza (A.3).

**Brightwater w liczbach:** 5.1 mówi „fee is fixed for the Initial Term”. Faktura
z podwyżką ma wyjść jako niezgodna — wyszukiwanie musi trafić właśnie na ten fragment.

**Jak AI dostaje fragmenty (klasyczny RAG):** n8n zamienia zapytanie na embedding
(Voyage), baza filtruje po `contract_id` i `valid_from <= data faktury`, sortuje po
podobieństwie i oddaje 4–5 fragmentów. Claude dostaje fakturę i pełny tekst tych
fragmentów. AI nie wybiera fragmentów samo. Alternatywa „agentic retrieval” (AI dostaje
spis i sam prosi o fragmenty) — do ewentualnego porównania na końcu.

**Uruchomienie lokalnie:** `node src/server.js`, test:
`curl -s -X POST --data-binary @plik.pdf http://localhost:3000/chunk`.
Na serwerze: `http://recon-contract-reader:3000/chunk`, tylko z wnętrza sieci `shared`.
