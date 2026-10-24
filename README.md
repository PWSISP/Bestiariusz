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

## Plan prac

Sprinty, zadania i definicja ukończenia: [`docs/plan-sprintow.md`](docs/plan-sprintow.md). Rejestr zależności: [`docs/decyzje.md`](docs/decyzje.md).
