# Bestiariusz — efekty symboli (wersja 0.1, propozycja do zatwierdzenia w S03-01b)

**Status.** Ten dokument jest **propozycją Claude'a**, a nie zapisem decyzji z GDD: `docs/gdd-mvp.md` zamraża tylko listę symboli i ich koszty mocy, a mówi wprost, że „efekty symboli dochodzą w S03-01”. Opis „Grom przeskakuje na drugi cel” z `docs/plan-sprintow.md` (S03-06) nie ma w repozytorium rozwinięcia, więc wyżej ustawiona jest interpretacja opisana w rozdziale 4. Zatwierdzasz lub zmieniasz ją w zadaniu S03-01b; po zatwierdzeniu dokument dostaje wersję 1.0.

Zasady przebiegu tury, w których efekty uczestniczą, są w `docs/zasady-walki.md`, rozdział 5a. Tu jest wszystko inne: słownik efektów, tabela efektów MVP i instrukcja dodawania nowych.

## 1. Z czego składa się efekt

Efekt to cztery pola w `src/data/symbols.json`, przy żywiole, formie albo przymiocie:

```json
{ "trigger": "attack", "op": "strike", "amount": 1, "scope": "sameElementOthers", "pierce": true }
```

| Pole | Znaczenie |
|---|---|
| `trigger` | **Kiedy.** `summon` (po przyzwaniu), `attack` (zaraz po uderzeniu tej istoty), `turnEnd` (po atakach wszystkich istot), `damaged` (istota przeżyła uderzenie wroga) |
| `op` | **Co.** Jedna z ośmiu operacji z rozdziału 2 |
| `amount` | **Ile.** Liczba całkowita, co najmniej 1 |
| `scope` | **Od czego zależy.** Jeden z czterech zakresów z rozdziału 3; wartość efektu to `amount` razy liczba policzonych istot |
| `pierce` | Tylko dla `strike`: cios omija blok i odporności wroga |

Schemat (`src/data/symbol-schema.ts`) odrzuca wszystko poza tym: nieznane pola, `amount` mniejsze niż 1, `pierce` przy innej operacji niż `strike`.

## 2. Operacje (osiem)

| `op` | Skutek |
|---|---|
| `strike` | Obrażenia wroga równe wartości efektu, w żywiole istoty. Zabicie wroga kończy walkę od razu |
| `guard` | Blok gracza + wartość |
| `mend` | Zdrowie gracza + wartość (nie ponad maksimum) |
| `draw` | Dobranie tylu kart (limit ręki 5 obowiązuje, nadmiar idzie do kosza) |
| `kindle` | Żar + wartość (nie ponad limit żaru) |
| `growAttack` | Atak tej istoty + wartość, do końca walki |
| `growHealth` | Zdrowie i maksymalne zdrowie tej istoty + wartość |
| `regen` | Zdrowie tej istoty + wartość, nie ponad jej maksimum |

Każda operacja zostawia w dzienniku walki zdarzenie `{ type: 'effect', circle, trigger, op, amount }`, dzięki czemu ekran walki (Sprint 4) pokaże, co się wydarzyło, bez zgadywania.

## 3. Zakresy (cztery)

| `scope` | Liczba policzonych istot (z punktu widzenia istoty, która ma efekt) |
|---|---|
| `self` | Zawsze 1 |
| `sameElementOthers` | Inne istoty tego samego żywiołu |
| `sameElementAll` | To samo, **z nią samą** |
| `othersAny` | Wszystkie inne istoty, jakikolwiek żywioł |

Dwie zasady, które łatwo przeoczyć:

- **Wartość 0 oznacza „nic się nie dzieje”.** Efekt `sameElementOthers` przy samotnej istocie nie uruchamia się i nie zostawia zdarzenia.
- **Wiatr nie jest tu dowolnym żywiołem.** W Obrzędzie wiatr zastępuje każdy żywioł (zasady walki, rozdział 6), ale do liczenia zakresu wiatr liczy się tylko z wiatrem. To świadoma różnica: Obrzęd jest raz na walkę, a zakresy działają co turę.

## 4. Efekty MVP

Koszty i statystyki symboli się nie zmieniają (patrz `docs/gdd-mvp.md`). Przymioty nie mają efektów, tylko liczby.

| Symbol | Kiedy | Co | Wartość | Zakres | Uwagi |
|---|---|---|---|---|---|
| Ogień | przy ataku | `strike` | 1 | inne ogniste | omija blok i odporności |
| Woda | przy przyzwaniu | `mend` | 1 | sama | |
| Ziemia | przy przyzwaniu | `guard` | 3 | sama | |
| Wiatr | przy przyzwaniu | `kindle` | 1 | sama | |
| Grom | przy ataku | `strike` | 2 | inne gromowe | omija blok i odporności |
| Wilk | gdy oberwie | `growAttack` | 1 | sama | |
| Kruk | przy ataku | `strike` | 1 | sama | omija blok i odporności |
| Sowa | przy przyzwaniu | `kindle` | 1 | sama | |
| Wąż | przy ataku | `growAttack` | 1 | sama | |
| Niedźwiedź | gdy oberwie | `strike` | 2 | sama | zwykłe obrażenia |
| Jeleń | na koniec tury | `regen` | 1 | sama | |

**Interpretacja „Grom przeskakuje na drugi cel”.** Walka ma jednego wroga, więc „drugiego celu” nie ma. Zamiast tego Grom, uderzając, zadaje dodatkowy cios przebijający za **każdą inną gromową istotę** na planszy (2 obrażenia za każdą). Dwa Gromy w Kręgach dają więc po 2 dodatkowe obrażenia każdy. Ogień działa tak samo, słabiej (1). Jeśli wolisz inny kierunek (na przykład „Grom bije dodatkowo wroga za każdą istotę dowolnego żywiołu” albo wprowadzenie dodatkowych wrogów w późniejszym sprincie), zmiana to jeden wpis w danych i jeden test; powiedz to przy S03-01b.

## 5. Kolejność i przykład

Przy ataku istoty Ognia z formą Węża (żywioł → forma → przymiot) najpierw zadziała cios Ognia za inne ogniste istoty, potem Wąż zwiększy atak o 1. Wzrost wchodzi od **następnego** ataku, bo atak tej istoty już się odbył.

Przy dwóch gromowych Wilkach w Kręgach 0 i 2: atakuje Krąg 0 (atak Wilka), zaraz potem jego efekt Gromu zadaje 2 obrażenia przebijające za Krąg 2; dopiero potem atakuje Krąg 2 i jego efekt zadaje 2 za Krąg 0. Wynik nie zależy od niczego poza kolejnością Kręgów.

Dziesięć takich scenariuszy sprawdza `tests/combat/effects.test.ts` (grupa `effect order`); są też w zasadach walki, rozdział 9.

## 6. Jak dodać efekt, a jak operację

**Nowy efekt istniejącą operacją** (na przykład Sowa dostaje `draw` przy przyzwaniu): jedna zmiana w `src/data/symbols.json`. Test `tests/data/symbol-effects.test.ts` sprawdza, że dane przechodzą schemat; jeśli zmieniasz liczby wpływające na siłę, uruchom `npm run balance` (Sprint 3, zadanie S03-08).

**Nowa operacja** (na przykład „osłabienie wroga”): wszystko, co poniżej, w jednym zadaniu:

1. Dopisz wartość do `EffectOp` w `src/core/types.ts` i do listy w `src/data/symbol-schema.ts`.
2. Dopisz `case` w `applyOp` w `src/core/combat/effects.ts` (kompilator zgłosi brak, bo `switch` jest wyczerpujący).
3. Dopisz test w `tests/combat/effects.test.ts`.
4. Dopisz wiersz do tabeli z rozdziału 2 i do `docs/zasady-walki.md`.

**Nowy moment** (na przykład „gdy sojusznik zginie”) to zmiana w reducerze i najdroższy rodzaj zmiany; przed nią trzeba zdecydować, w którym miejscu tury moment zachodzi i zapisać to w zasadach walki, rozdział 5a.

## 7. Granice tej wersji

- Efekty działają tylko na plansze gracza i na jednego wroga. Efekty wroga, relikty i karty zaklęć mają własne, osobne mechanizmy (zasady walki, rozdziały 3 i 7).
- Efekt nie widzi kart w ręce ani w talii; `draw` jest jedynym, który ich dotyka.
- Nie ma efektów „raz na walkę” ani liczników. Gdyby były potrzebne, trzeba będzie rozszerzyć `Creature`.
- Przymioty nie mają efektów. Schemat to dopuszcza (pole `effects` jest też przy przymiotach), ale MVP z tego nie korzysta.
- Równowaga: pierwszy raport z `npm run balance` (talia `szeptucha` plus jedna kopia istoty, 300 gier na istotę) pokazuje średnio 44,5% wygranych, odchylenie 6,2 punktu procentowego, a 13 z 150 istot poniżej 35% (głównie Wąż i Kruk z Gniewem). To punkt wyjścia do S03-10, nie wynik końcowy.
