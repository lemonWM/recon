# Recon panel demo

Klikalna makieta aplikacji Recon w CRM (lista deali -> szczegóły deala).
Stan na 10.10.2026. Dane są przykładowe, nic nie łączy się z żadnym systemem.

## Jak otworzyć

Otwórz `index.html` w przeglądarce. Nie trzeba nic instalować ani uruchamiać.
Czcionki ładują się z internetu; bez sieci makieta działa na czcionkach systemowych.

## Pliki

- `index.html` - cała makieta: wygląd, teksty, przykładowe dane i logika klikania.
  Dane i zachowanie są w bloku `class Component` na końcu pliku.
- `support.js` - mały skrypt, który zamienia szablon z `index.html` w działającą stronę.
  Służy tylko do demo.

## Co da się kliknąć

- wiersz deala na liście otwiera szczegóły,
- "Scan N invoices" skanuje faktury po kolei (3 sekundy na fakturę, symulacja),
- wiersz faktury pokazuje szczegóły pod tabelą,
- zakładka "Ask the contract" i przycisk "Ask AI" (odpowiedź po 10 sekundach, symulacja),
- pole "Search deals" filtruje listę.

Ustalenia projektowe z tej makiety są zapisane w `../agent.md`.
