# Recon — wideo na LinkedIna

Sceny z dymkami, skrypty nagrywające, plan materiału.
Kręgosłup projektu i historia decyzji są w `agent.md`.

---

## 13a. WIDEO — SCENY Z DYMKAMI ("TOOLTIPY") [USTALONE jako sposób pracy 10.10]

W wideo pokazujemy, co Recon robi w danym miejscu, krótkimi scenami: kursor jedzie do
elementu → zoom na ten element → obok wysuwa się dymek z jednym zdaniem komentarza →
ewentualnie kliknięcie → dymek znika, kamera wraca. Pierwsza scena testowa (przełącznik
HubSpot / Salesforce) oceniona przez Arta na 10/10 i jest wzorem dla kolejnych.

Jak to powstaje:
- Sceny nagrywa agent skryptem: przeglądarka bez okna sterowana z Pythona (Playwright),
  wynik to MP4 1920×1080, 25 klatek na sekundę, bez dźwięku.
- **Zoom i dymek powstają na żywej stronie** (przekształcenia CSS i element dorysowany
  nad stroną), nie w montażu. Dzięki temu tekst po przybliżeniu jest ostry.
- Panel jest układany w szerokości 1280 px i pokazywany w powiększeniu 1,5×, żeby
  wypełnił kadr 1080p.
- Kursor to dorysowana strzałka z kółkiem przy kliknięciu, bo taka przeglądarka nie
  pokazuje prawdziwego kursora.
- Nagrywarka przy 1080p zapisuje film ok. 20% wolniej niż czas rzeczywisty. Skrypt
  pokazuje w rogu mały różowy znacznik przed sceną i po niej, a drugi skrypt po nim
  przycina klip i przywraca właściwą prędkość.

Wygląd dymka: białe tło, zaokrąglone rogi, cień, strzałka wskazująca element, na górze
mała niebieska etykieta z iskierkami (np. "MULTI-CRM"), pod nią jedno zdanie, nazwy
własne pogrubione. Widoczny ok. 5 sekund.

Pliki w `recon_video/`: `rec_zoom.py` (nagranie sceny), `cut.py` (przycięcie i prędkość),
`sample_multi_crm.mp4` (klip wzorcowy). Uruchomienie:
`python3 rec_zoom.py | tee rec_zoom.out && python3 cut.py`. Nowa scena to kopia
`rec_zoom.py` ze zmienionym elementem, tekstem i kliknięciami.

Długość i czekanie na AI [kierunek Arta 10.10]: całość co najmniej ok. 30 sekund, kilka
kluczowych procesów. Każdy proces to osobna scena nagrywana osobno, sklejane na końcu.
Prawdziwe czekanie na odpowiedź AI (skan, pytanie do umowy) nie idzie do filmu w całości:
zostaje sekunda pulsowania, potem cięcie do odpowiedzi. Uczciwie wobec widza: pokazujemy
prawdziwy czas małym napisem (np. "9 s") zamiast udawać, że odpowiedź jest natychmiast.
Format: 1080p, do rozważenia kadr pionowy 4:5 (1080×1350) pod telefon.

Plan: na koniec projektu Art i agent spisują scenariusz (lista scen: element, tekst
dymka, co klikamy), agent nagrywa sceny po kolei. Do ustalenia: język dymków (interfejs
jest po angielsku, pierwszy dymek był po polsku) oraz czy prawdziwy panel na Mikrusie
będzie osiągalny ze środowiska agenta; jeśli nie, Art uruchamia te same skrypty u siebie.
Ujęcia z zalogowanego HubSpota i Salesforce nagrywa Art.

---
