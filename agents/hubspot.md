# Recon — HubSpot

Szczegóły po stronie HubSpota: konto, model danych, dostęp, wersja API, GraphQL.
Kręgosłup projektu i historia decyzji są w `agent.md`.

---

### Mapa obiektów [PROPOZYCJA]

| Recon (Supabase) | HubSpot | Salesforce |
|---|---|---|
| `customers` | Company | Account |
| `contracts` | Deal z zaznaczonym polem `deal_recon` | Contract (standardowy obiekt, czyściej niż deal) |
| PDF umowy | Note z załącznikiem przy dealu | Files przy rekordzie |
| `findings` | Ticket przypięty do deala | Case |
| własne pola | custom properties | pola z końcówką `__c` |

HubSpot — własne pola (stan 12.10: **wszystko założone ręcznie**, nazwy wewnętrzne
potwierdzone w API):
- **Deal:** `deal_recon` (checkbox, znacznik "ten deal wchodzi do Recona"),
  `recon_contract_start_date` (data startu umowy), `recon_last_checked` (data ostatniego
  sprawdzenia przez Recon).
- **Ticket:** `recon_amount_to_recover` (liczba, format waluty), `recon_invoice_number`
  (tekst), `recon_error_type` (lista wyboru, na start jedna opcja "Rate mismatch"),
  `recon_contract_quote` (tekst wielolinijkowy).
- **Pipeline ticketów:** `Recon ticket pipeline` — New → Investigating → Recovered /
  False alarm. ID w sekcji 7.

Pomijamy na start: Contact (nic na nim nie sprawdzamy) i Line items (gdyby ceny siedziały
w polach, RAG nie miałby czego szukać w umowie).

Świadome uproszczenie: deal wymyślono do momentu sprzedaży, nie do prowadzenia umowy przez
lata. Własny obiekt "Umowa" wymaga wyższego planu HubSpota. Do demo deal wystarczy, w opisie
projektu zaznaczamy to wprost.

---

---

### HubSpot: konto i dostęp

- **Konto:** `recon`, ID **149521488**, konto testowe developera (wszystkie huby
  Enterprise), centrum danych EU, podpięte pod zwykłe konto Arta `arturchochla`
  (139784116). Bez żadnej aplikacji. Służy jako CRM z danymi testowymi.
- **Własne pola:** lista w sekcji 5. Założone ręcznie 11–12.10, nazwy wewnętrzne
  potwierdzone zapytaniem do API.
- **Pipeline ticketów** `Recon ticket pipeline`, ID **4215259384**. Etapy: New
  `6212045025`, Investigating `6212045026`, Recovered `6212045027` (zamknięty),
  False alarm `6212045028` (zamknięty). Domyślny `Support Pipeline` (ID 0) zostaje
  nietknięty i nieużywany.
- **Dostęp dla n8n [USTALONE 12.10]:** Service Key o nazwie `Recon platform n8n`.
  Nie jest to aplikacja w HubSpocie — to sam token z listą uprawnień. Private Apps
  HubSpot przenosi do statusu legacy i poleca Service Key; dokumentacja n8n tak samo.
  Uprawnienia: `crm.objects.deals.read`, `crm.objects.deals.write`,
  `crm.objects.companies.read`, `crm.objects.tickets.read`, `crm.objects.tickets.write`,
  `crm.schemas.deals.read`, `crm.schemas.tickets.read`, `crm.schemas.companies.read`,
  `files.ui_hidden.read`, `collector.graphql_query.execute`,
  `collector.graphql_schema.read` (dwa ostatnie dołożone 12.10 — bez nich GraphQL zwraca
  "Forbidden"; w eksploratorze działał, bo tam zapytanie leci jako zalogowany użytkownik). Świadomie pominięte: kontakty, automatyzacje, webhooki,
  warianty `sensitive`, `crm.schemas.*.write` (pola zakładamy ręcznie).
  Token zna tylko Art i n8n — nie trafia do czatu, do folderu projektu ani do repozytorium.
- **Deale testowe (12.10)**, wszystkie Closed Won z zaznaczonym `deal_recon`, każdy
  z przypisaną firmą:

| Deal | ID deala |
|---|---|
| Halden Freight · Platform subscription | 525865702598 |
| Brightwater Clinics · Support | 525865711823 |
| Ostrava Tooling · Fleet tracking licence | 525864985795 |
| Kessler & Byrne · Data room hosting | 525865702626 |
| Lumen Retail · Loyalty platform | 525865702633 |

  Te same nazwy i stany co w makiecie i w danych na sztywno w panelu, żeby po podłączeniu
  n8n ekran wyglądał tak samo. PDF-ów umów jeszcze nie ma — dołoży je generator.
- **Uwaga do n8n:** powiązanie deala z firmą wraca zdublowane (`deal_to_company`
  i `deal_to_company_unlabeled` z tym samym ID). Brać pierwsze ID, nie liczyć wpisów.

---

### Wersja API HubSpota [USTALONE 12.10]

**Recon jedzie na date-based versioning, wersja `2026-09`**, nie na `v3`. Powód: 15.09.2026
HubSpot ogłosił koniec wsparcia dla API `v1`–`v3` (wrzesień 2027) i osobno dla `v4`
(marzec 2027). Zaczynanie nowego projektu na `v3` byłoby długiem na starcie.

Co to zmienia w praktyce: **tylko ścieżkę adresu**. Autoryzacja, scope'y i Service Key
zostają bez zmian. Uwaga na kolejność członów — `objects` jest przed wersją:

| Stara ścieżka | Nowa ścieżka |
|---|---|
| `/crm/v3/objects/deals` | `/crm/objects/2026-09/deals` |
| `/crm/v3/objects/deals/search` | `/crm/objects/2026-09/deals/search` |

Sprawdzone na żywo 12.10: zwykły odczyt listy i wyszukiwanie z filtrem działają na nowej
wersji, `properties` nadal podaje się w treści zapytania (nie w adresie), a pole `url`
z linkiem do rekordu też wraca.

Ten sam komunikat HubSpota potwierdził wybór Service Key: zakładanie legacy private apps
kończy się **26.10.2026** dla istniejących kont, więc tamta droga była ślepa.

---

### GraphQL do odczytu [USTALONE 12.10, sprawdzone na żywo]

**Synchronizacja czyta z HubSpota przez GraphQL, nie przez REST.** Powód: jedno zapytanie
oddaje deale razem z nazwami firm, podczas gdy REST-owy `search` nie zwraca powiązań
i wymagałby drugiego zapytania.

- Adres: `POST https://api.hubapi.com/collector/graphql`, treść `{"query": "..."}`.
  Autoryzacja ta sama, Service Key.
- **Tylko odczyt.** GraphQL nie ma mutacji, więc zapisy — zakładanie ticketu
  i `recon_last_checked` — zostają w REST (`2026-09`). Projekt używa świadomie dwóch
  stylów: GraphQL czyta, REST pisze.
- W GraphQL `deal_recon` jest prawdziwą wartością logiczną (`true`), a nie tekstem jak
  w REST. Filtr: `deal_recon__eq: true`, bez cudzysłowów.
- Powiązanie z firmą: `associations { company_collection__primary { items { ... } } }`.
  Jest też wariant `__deal_to_company_unlabeled` (to samo zdublowanie co w REST),
  ale `primary` jest czystsze.
- Schemat da się odpytać tak jak dane, co oszczędza szukania w dokumentacji:
  `{ __type(name: "crm_deal_associations") { fields { name } } }`.
- **Koszt zapytania**: 30000 punktów na pojedyncze zapytanie. Pięć deali z firmami
  kosztowało 2185, z czego 1800 to sześć wewnętrznych zapytań HubSpota (jedno sięgnięcie
  do danych kosztuje tyle, co dziesięć pobranych obiektów). To jedyny limit wart pilnowania:
  gdy deali przybędzie, bierzemy je mniejszymi porcjami ze stronicowaniem.
- **Limity czasowe** (widoczne w odpowiedzi jako `rate_limit_info`): 500 000 punktów na
  minutę i 300 mln na dobę. Przy koszcie ok. 2200 to ponad 200 takich zapytań na minutę,
  czyli w tym projekcie nieosiągalne.
- Przy okazji znaleziono `note_collection__deal_to_note` — notatki (a w nich załączniki,
  czyli PDF-y umów) są dostępne przez GraphQL. Możliwe obejście problemu ze scope'em
  do notatek (sekcja 12). Do sprawdzenia przy kroku odczytu umów.

Działające zapytanie:

```graphql
query ReconDeals {
	CRM {
		deal_collection(filter: { deal_recon__eq: true }, limit: 100) {
			items {
				hs_object_id
				dealname
				deal_recon
				recon_contract_start_date
				recon_last_checked
				associations {
					company_collection__primary {
						items {
							hs_object_id
							name
						}
					}
				}
			}
		}
	}
}
```

Uwaga: GraphQL nie oddaje pola `url` z linkiem do rekordu, które jest w REST. Do sprawdzenia
przy budowie synchronizacji, czy link składamy sami z ID, czy bierzemy go innym sposobem.

---

### Dlaczego nie aplikacja w HubSpocie (test 10.10.2026)

Pierwotny plan zakładał stronę aplikacji w HubSpocie (UI extensions, React). Test na żywo
na koncie testowym pokazał, że nie ma tam własnego HTML ani CSS: ekran składa się
wyłącznie z komponentów HubSpota, właściwość `style` jest niedozwolona. Lista deali
zbudowana natywnie działała, ale wyglądała jak HubSpot, nie jak makieta. Art zdecydował
o wyjściu poza interfejs HubSpota. Próbny projekt i konto `recon-test` skasowane.
Na zwykłym koncie HubSpota takie rozszerzenia wymagają planu Enterprise.

Ściąga CLI z testu (gdyby była potrzebna): CLI wymaga nowego Node (nvm); stary klucz bez
uprawnień naprawia `hs auth`; `hs test-account create` zakłada konto; na listach wyboru
zaznacza spacja, nie Enter; `hs test-account import-data` importuje dane do CRM
(do sprawdzenia pod generator).


---

## Opóźnienie po zmianie danych [zaobserwowane 14.10]

Po zmianie wartości pola w interfejsie HubSpota API przez chwilę oddaje jeszcze starą
wartość. Zaobserwowane na żywo przy zmianie nazwy deala — synchronizacja zaciągnęła
poprawną nazwę dopiero przy kolejnym uruchomieniu.

Powód: HubSpot ma magazyn rekordów i budowane obok niego indeksy, a te dogania
z opóźnieniem (sekundy). Dotyczy to zwłaszcza wyszukiwania.

**Wniosek dla Recona:** nie budujemy nigdzie wzorca „zapisz i natychmiast odczytaj, żeby
sprawdzić". Dotyczy to przede wszystkim zapisu `recon_last_checked` z powrotem do HubSpota
i zakładania ticketów. Jeśli kiedyś trzeba będzie potwierdzić zapis, robimy to po czasie
albo ufamy odpowiedzi z samego zapisu.

## Załączniki na dealu — jak je czyta API [USTALONE 26.10, sprawdzone na żywo]

**Plik wpięty w kartę „Attachments" na rekordzie deala to w rzeczywistości notatka
z podpiętym plikiem.** Na samym dealu nie ma żadnej właściwości z załącznikami —
`hs_attachment_ids` nie jest polem deala.

Droga odczytu, trzy kroki:

1. **Notatki powiązane z dealem** → obiekt `NOTE`, właściwość `hs_attachment_ids`.
   Zawiera identyfikator pliku (przy wielu plikach: rozdzielone średnikami).
2. **Metadane pliku** → `GET https://api.hubapi.com/files/v3/files/{fileId}`
3. Z odpowiedzi do bazy: nazwa pliku i adres do pobrania.

**Zakres w Service Key: `files.ui_hidden.read`.** Załączniki rekordu mają
`access: HIDDEN_PRIVATE`, czyli są ukryte przed menedżerem plików — bez tego zakresu
odczyt się nie powiedzie. Dodane do klucza 26.10.

**Stan po wrzuceniu umów 26.10:**

| Deal | Notatka | Plik |
|---|---|---|
| Halden `525865702598` | `533167633650` | `500007264477` |
| Brightwater `525865711823` | `533169766636` | `500027738358` |
| Ostrava `525864985795` | `533169032394` | `500027738346` |
| Lumen `525865702633` | `533169031374` | `500007262455` |
| Kessler `525865702626` | — | — (celowo) |

**Dwie pułapki w odpowiedzi API plików:**

1. **`name` jest bez rozszerzenia** — zwraca `MSA-2025-014`, nie `MSA-2025-014.pdf`.
   Do `contracts.file_name` trzeba skleić `name` z `extension` albo wziąć końcówkę z `path`.
2. **Są dwa adresy i robią co innego.** `defaultHostingUrl` wygląda jak zwykły link, ale
   plik jest prywatny, więc bez uwierzytelnienia zwróci odmowę. `url` to przekierowanie na
   adres podpisany — działa, ale tylko z kluczem. **Do bazy idzie `url`** (patrz
   `agents/supabase.md`).

Przykładowa odpowiedź (Halden, 26.10): `size: 6635`, `extension: "pdf"`,
`path: "/record-attachments/MSA-2025-014.pdf"`, `access: "HIDDEN_PRIVATE"`.

### Obiekty handlowe HubSpota [sprawdzone 26.10]

Na koncie `recon` widoczne są: `INVOICE` (odczyt tak, zapis wymaga rozszerzenia
uprawnień), `SUBSCRIPTION` (odczyt), oraz niedostępne `COMMERCE_PAYMENT`, `ORDER`
i `CONTRACT`. Rozważony wariant trzymania faktur w HubSpocie zamiast w Supabase został
odłożony — uzasadnienie w historii decyzji w `agent.md`.

### Nazwa pliku nie jest stabilna [zaobserwowane 27.10]

Plik Lumena ma w bazie nazwę `LRG-2026-118-1.pdf`. Na dealu jest jedna notatka, nie dwie.
Przyczyna: odpięcie załącznika od deala **nie kasuje pliku w menedżerze plików**. Stary
`LRG-2026-118.pdf` został po teście z 26.10, więc ponownie wrzucony dostał końcówkę `-1`.
Ten sam dokument wrzucony dwa razy ma dwie różne nazwy. Dlatego nic nie kluczujemy po
`file_name` — identyfikacja idzie po `crm_id` deala, a zmianę pliku wykrywa `file_path`.
W menedżerze plików zostały osierocone pliki po testach; nie przeszkadzają.

### Pobieranie pliku załącznika [USTALONE 27.10, sprawdzone na żywo]

Metadane (`GET /files/v3/files/{id}`) oddają pole `url`
(`api-eu1.hubspot.com/filemanager/api/v2/…/signed-url-redirect`), ale to adres dla
przeglądarki zalogowanego użytkownika — z Service Key zwraca stronę HTML. Działająca droga:

1. `GET https://api.hubapi.com/files/v3/files/{id}/signed-url` → `{ url, expiresAt }`
2. `GET {url}` bez uwierzytelnienia → plik

Podpisany link żyje ok. doby. Z metadanych przydaje się też `fileMd5` — odcisk treści,
używany w ścieżce w Storage.
