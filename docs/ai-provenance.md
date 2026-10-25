# Wkład AI w projekt Bestiariusz

Zadanie S01-09. Licencje i daty sprawdzone 2026-10-24 na kartach modeli i w warunkach usług (linki w tabeli). Karty i warunki się zmieniają, dlatego data sprawdzenia jest częścią wpisu: przed wydaniem do sklepów (S31) sprawdź je jeszcze raz.

## Zasada

Każdy plik w `art/`, `audio/`, `marketing/` i `docs/` ma wpis w rejestrze poniżej: co zrobił człowiek, co AI, którym modelem (z wersją) i na jakiej licencji. Wpis powstaje razem z plikiem, nie po fakcie. Treści wygenerowane przez AI są oznaczone na ekranie Autorów w grze i w formularzach sklepów.

## Modele używane w projekcie

| Model | Do czego | Licencja (z karty modelu) | Źródło | Data sprawdzenia |
|---|---|---|---|---|
| FLUX.2 klein 4B | grafika (warstwy, tła, ikony) | Apache 2.0 (`license: apache-2.0`); karta mówi o wagach otwartych do użytku komercyjnego | [karta modelu](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | 2026-10-24 |
| ACE-Step 1.5 | muzyka (pętle na bazie nagranych partii) | MIT (`license: mit`). Autorzy deklarują dane treningowe: utwory licencjonowane, muzyka royalty-free lub z domeny publicznej i dźwięk syntetyczny; bez szczegółowego rejestru, więc to deklaracja, nie dowód | [karta modelu](https://huggingface.co/ACE-Step/Ace-Step1.5) | 2026-10-24 |
| Qwen3 Coder 30B, lokalnie przez Ollamę | kod modułów o jasnej specyfikacji | Apache 2.0 (`license: apache-2.0`, karta Qwen3-Coder-30B-A3B-Instruct) | [karta modelu](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct) | 2026-10-24 |
| Claude (Anthropic) | architektura, recenzja, trudniejszy kod | Warunki dla konsumentów Anthropic (wersja z 8 października 2025), sekcja 4: Anthropic przenosi na użytkownika swoje prawa do wyników, pod warunkiem przestrzegania warunków. Jeśli Claude działa przez klucz API lub konto firmowe, obowiązują Warunki handlowe (Commercial Terms): sprawdź, z którego konta korzystasz | [Consumer Terms](https://www.anthropic.com/legal/consumer-terms), [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) | 2026-10-24 |

## Wykluczone z projektu

| Model | Powód |
|---|---|
| FLUX.2 klein 9B | Wagi na licencji FLUX Non-Commercial License: użycie modelu tylko niekomercyjne ([karta](https://huggingface.co/black-forest-labs/FLUX.2-klein-9B)). Gra jest produktem komercyjnym, więc 9B odpada. Sprawdzone 2026-10-24 |
| FLUX.2 dev | Licencja FLUX [dev] Non-Commercial License v2.0 (rewizja z 25 listopada 2025) zabrania użycia modelu do celów komercyjnych i produkcyjnych; wyniki wolno wykorzystywać komercyjnie ([licencja](https://bfl.ai/legal/non-commercial-license-terms), [karta](https://huggingface.co/black-forest-labs/FLUX.2-dev)). Nie opieramy produkcji gry na tym wyjątku, wystarcza 4B na Apache 2.0. Sprawdzone 2026-10-24 |

## Rejestr plików

Pliki z `docs/` powstałe w Sprincie 1. Szkice napisał Claude, treść i zakres zatwierdził człowiek. Wersję modelu zapisujemy od tego wpisu; dla wcześniejszych szkiców z 2026-10-24 dokładna wersja jest do potwierdzenia w historii sesji.

| Plik | Człowiek | AI (model, wersja) | Data |
|---|---|---|---|
| `docs/gdd-mvp.md` | zakres MVP, wybory projektowe, zatwierdzenie | szkic i tabela 150 kombinacji: Claude (Anthropic), wersja do potwierdzenia | 2026-10-24 |
| `docs/plan-sprintow.md` | kolejność i zakres sprintów, akceptacja | rozpisanie sprintów i zadań: Claude (Anthropic), wersja do potwierdzenia | 2026-10-24 |
| `docs/decyzje.md` | akceptacja zależności | wpisy rejestru: Claude (Anthropic), wersja do potwierdzenia | 2026-10-24 |
| `docs/superpowers/plans/2026-10-24-sprint-1-fundament.md` | akceptacja planu, wykonanie zadań | plan: Claude (Anthropic), wersja do potwierdzenia | 2026-10-24 |
| `docs/ai-provenance.md` | decyzja o wyłączeniu modeli, akceptacja | szkic S01-09 i uzupełnienie licencji: Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-24 |
| `docs/retro/S01.md` | uzupełnienie otwartych punktów i akceptacja | szkic na podstawie logów potoku Qwena: Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-24 |
| `docs/zasady-walki.md` | zatwierdzenie zasad, zmiany reguł | wersja 0.1 zasad walki, liczby z symulacji; wersja 0.2 (efekty istot, budżet mocy, zdrowie Leszego, decyzje Z11–Z14): Claude (Anthropic), Claude Sonnet 5.5; pomiary Leszego 380 w rozdziale 7 i w Z14 wstawiła sesja wykonawcza Claude Code (model do potwierdzenia w historii gita) | 2026-10-24, wersja 0.2 zatwierdzona 2026-10-25 |
| `docs/superpowers/plans/2026-10-24-sprint-2-walka.md` | akceptacja planu, wybór metody wykonania | plan i pakiet plików Sprintu 2: Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-24 |
| `docs/retro/S02.md` | uzupełnienie uwag z gry na papierze i akceptacja | szkic na podstawie rejestru wykonania i raportów potoku Qwena: Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-24 |
| `docs/superpowers/plans/2026-10-24-sprint-3-dane-i-warsztat.md` | akceptacja planu, wybór metody wykonania | plan i pakiet plików Sprintu 3: Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-24 |
| `docs/efekty-symboli.md` | zatwierdzenie tabeli efektów i odczytania „Grom przeskakuje na drugi cel” (wersja 1.0, 2026-10-25) | propozycja efektów symboli (wersja 0.1): Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-24, zatwierdzone 2026-10-25 |
| `docs/retro/S03.md` | uzupełnienie telefonu i listy przed tagiem oraz akceptacja | szkic na podstawie historii gita, raportów potoku Qwena i raportu balansu: Claude (Anthropic), Claude Sonnet 5.5 | 2026-10-25 |
| `docs/superpowers/plans/2026-10-25-sprint-4-walka-na-telefonie.md` | akceptacja planu, decyzje D33–D44, wybór metody wykonania | plan i pakiet plików Sprintu 4: Claude (Anthropic), model do potwierdzenia w historii gita; wykonanie i uzupełnienia specyfikacji S04-02b i S04-04: sesja Claude Code, Claude Opus 5.5 | 2026-10-25 |
| `docs/retro/S04.md` | uwagi z gry na telefonie, FPS, lista przed tagiem oraz akceptacja | szkic na podstawie rejestru wykonania i raportów potoku Qwena: Claude (Anthropic), Claude Opus 5.5 | 2026-10-25 |

Kod z `src/` nie jest tu wpisywany: autorstwo każdego modułu widać w historii git i w raportach potoku Qwena (`results/`, lokalnie).
