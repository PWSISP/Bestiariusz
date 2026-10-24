# Bestiariusz

Gra mobilna (PixiJS + Capacitor), w której każda istota składa się z trzech symboli: żywiołu, formy i przymiotu. Gra działa offline. Zakres MVP: [`docs/gdd-mvp.md`](docs/gdd-mvp.md).

## Wymagania

- Node.js ≥ 22.18 (zalecany 24, patrz `.nvmrc`)
- npm
- Do zadań Qwena: Ollama ≥ 0.14 z modelem `qwen3-coder-64k` i Claude Code

## Polecenia

| Polecenie | Co robi |
|---|---|
| `npm ci` | instaluje zależności z `package-lock.json` |
| `npm run dev` | serwer deweloperski Vite na `http://localhost:5173` |
| `npm run build` | build produkcyjny do `dist/` |
| `npm run preview` | podgląd buildu |
| `npm test` | testy jednostkowe (Vitest) |
| `npm run test:e2e` | testy w przeglądarkach (Playwright) |
| `npm run lint` | ESLint (bez ostrzeżeń) i Prettier |
| `npm run typecheck` | TypeScript: projekt główny i projekt `src/core` + `src/data` bez DOM |
| `npm run format` | formatuje pliki Prettierem |
| `npm run sim` | bot rozgrywa walki w terminalu i zapisuje CSV do `sim-results/` (np. `npm run sim -- --games 1000 --enemy-hp 160`) |

## Android

`npm run android:sync` buduje wersję web i kopiuje ją do projektu `android/` (Capacitor). Debugowy APK buduje CI (zadanie `android`, artefakt `bestiariusz-debug-apk`); lokalnie: `cd android` i `./gradlew assembleDebug` (wymaga JDK 21 i Android SDK).

## CI

GitHub Actions (`.github/workflows/ci.yml`) przy każdym pushu na `main` i każdym pull requeście uruchamia lint, typecheck, testy jednostkowe, build oraz testy e2e w Chromium i WebKit.

## Wkład AI

Bestiariusz powstaje w jednoosobowym zespole z pomocą modeli AI i nie ukrywamy tego.

- **Kod.** Claude (Anthropic) projektuje architekturę, pisze trudniejsze moduły i recenzuje zmiany. Qwen3 Coder 30B, uruchamiany lokalnie przez Ollamę, pisze moduły o jasnej specyfikacji. Kod Qwena trafia do repozytorium dopiero po zielonych testach, czystym `typecheck` i lincie oraz po recenzji diffu (`tools/qwen-run.mjs`). Decyzje projektowe i akceptacja każdej zmiany należą do człowieka.
- **Grafika i muzyka** (planowane). FLUX.2 klein 4B i ACE-Step 1.5, czyli modele na licencjach dopuszczających użycie komercyjne. Treści wygenerowane przez AI są oznaczone na ekranie Autorów w grze i w formularzach sklepów.
- **Rejestr.** Każdy plik w `art/`, `audio/`, `marketing/` i `docs/` ma wpis w [`docs/ai-provenance.md`](docs/ai-provenance.md): co zrobił człowiek, co AI, którym modelem (z wersją) i na jakiej licencji. Wpis powstaje razem z plikiem.

## Plan prac

Sprinty, zadania i definicja ukończenia: [`docs/plan-sprintow.md`](docs/plan-sprintow.md). Rejestr zależności: [`docs/decyzje.md`](docs/decyzje.md).
