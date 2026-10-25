# Dźwięki prototypu (S06-04)

**Odstępstwo od planu sprintów:** zadanie S06-04 mówiło o dźwiękach tymczasowych z bibliotek CC0 i o licencjach w `docs/`. Prototyp **nie używa plików dźwiękowych**: dziesięć krótkich dźwięków jest syntezowanych w przeglądarce (Web Audio API, oscylatory), a ich przepisy leżą w `src/view/sound-recipes.ts`. Dzięki temu (1) nie ma licencji do śledzenia ani plików w paczce, (2) aplikacja nadal nie pobiera niczego z sieci, (3) dźwięki da się wyłączyć jednym przełącznikiem. Kosztem jest brzmienie „pisku z automatu”, które na test bramki 1 wystarcza. Prawdziwe dźwięki i muzyka przychodzą w S09–S10 (decyzja D54).

## Dźwięki

| Id | Kiedy | Opis |
|---|---|---|
| `card` | zagranie karty | krótki, wysoki ton |
| `summon` | przywołanie istoty | narastający dwugłos |
| `hit` / `hit_big` | trafienie wroga (od 10 obrażeń „duże”) | niski stuk / głęboki cios |
| `hurt` | obrażenia gracza | opadający pisk |
| `death` | śmierć istoty | opadający ton |
| `ritual` | Obrzęd | wznoszący się dwugłos |
| `effect` | efekt istoty | jasny ton |
| `win` / `lose` | koniec walki | trzy nuty w górę / w dół |
| `reject` | odrzucona akcja | krótki, głuchy ton |

## Przełączniki

Na ekranie trasy: wstrząsy ekranu, błyski, liczby obrażeń, dźwięk. Domyślnie wszystko włączone; wybór zapisuje się w `localStorage` (`bestiariusz.juice`). Wstrząsy nie działają przy wyłączonych animacjach (`?anim=0` albo „ogranicz ruch” w systemie).

## Licencje

Brak zewnętrznych plików, więc brak licencji do wypisania. Jeśli kiedyś dojdą pliki dźwiękowe, każdy dostaje wiersz w tej tabeli: plik, autor, źródło, licencja, data pobrania.
