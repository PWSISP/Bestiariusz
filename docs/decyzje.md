# Rejestr zależności i decyzji

Każda nowa zależność dostaje wiersz, zanim trafi do `package.json`.

| Data | Zależność | Po co | Odrzucona alternatywa |
|---|---|---|---|
| 2026-10-24 | `typescript` ~6.0.3 | TypeScript `strict`, ta sama wersja co w benchmarku Qwena | `tsc` 5.x (inna składnia `erasableSyntaxOnly`, wyniki benchmarku nieprzenośne) |
| 2026-10-24 | `vite` 8 | serwer deweloperski i build web dla Capacitora | webpack (wolniejszy, więcej konfiguracji) |
| 2026-10-24 | `vitest` 5 | testy jednostkowe, wspólna konfiguracja z Vite | `node --test` (brak integracji z Vite i jsdom) |
| 2026-10-24 | `jsdom` | środowisko DOM dla testów menedżera ekranów | happy-dom (mniej zgodny ze standardem) |
| 2026-10-24 | `eslint` 10, `@eslint/js` | lint i reguły architektury warstw | ESLint 9 z planu — najnowsza stabilna to 10, flat config bez zmian |
| 2026-10-24 | `typescript-eslint` | reguły ESLint dla TypeScriptu (`consistent-type-imports`, `no-explicit-any`) | sam `tsc` (nie pilnuje stylu importów) |
| 2026-10-24 | `globals` | zestawy zmiennych globalnych Node dla plików narzędzi | ręczna lista globali |
| 2026-10-24 | `prettier`, `eslint-config-prettier` | jednolite formatowanie, bez konfliktu z regułami ESLint | same reguły stylistyczne ESLint (wolniejsze, przestarzałe) |
| 2026-10-24 | — (bez nowej zależności) | potok Qwena (`tools/qwen-run.mjs`) ocenia zadania przez Vitest, nie `node --test` jak w benchmarku: definicja ukończenia wymaga testów Vitest | `node --test` (osobny dialekt testów tylko dla Qwena) |
| 2026-10-24 | `zod` 4 | walidacja danych symboli (błędy ze ścieżką pola), później zapisu gry i ładunków serwera — jedna biblioteka schematów w całej aplikacji | ręczny walidator (więcej kodu, błędy bez ścieżki pola za darmo) |
| 2026-10-24 | `@types/node` | typy Node dla narzędzi, testów i konfiguracji | brak (konfiguracje i testy narzędzi bez typów) |
