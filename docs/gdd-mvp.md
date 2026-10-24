Decyzja D1: wariant A (Grom 4→3, Niedźwiedź 5→4), wybrany 24 X 2026.

# Bestiariusz — zakres MVP (zamrożony)

Zadanie S01-11. Zamraża listę symboli i ich koszty mocy. Każda istota składa się z trzech symboli (żywioł + forma + przymiot) i ma stały budżet **10 punktów mocy**. Wartości ataku i zdrowia oraz efekty symboli dochodzą w S03-01 i nie są tu zamrożone. Nazwy wyświetlane (nazwa, dopełniacz, przymiotnik) trafią do plików językowych pod kluczami `symbol.<rodzaj>.<id>.*`.

## Żywioły (5)

| id | Nazwa | Koszt mocy |
|---|---|---|
| `ogien` | Ogień | 3 |
| `woda` | Woda | 2 |
| `ziemia` | Ziemia | 2 |
| `wiatr` | Wiatr | 2 |
| `grom` | Grom | 3 |

## Formy (6)

| id | Nazwa | Koszt mocy |
|---|---|---|
| `wilk` | Wilk | 4 |
| `kruk` | Kruk | 3 |
| `sowa` | Sowa | 3 |
| `waz` | Wąż | 4 |
| `niedzwiedz` | Niedźwiedź | 4 |
| `jelen` | Jeleń | 4 |

## Przymioty (5)

| id | Nazwa | Koszt mocy |
|---|---|---|
| `gniew` | Gniew | 3 |
| `smutek` | Smutek | 1 |
| `spryt` | Spryt | 2 |
| `odwaga` | Odwaga | 2 |
| `glod` | Głód | 3 |

## Podsumowanie

- Liczba kombinacji: **150** (5 × 6 × 5).
- Kombinacje ponad budżet 10: **0**.
- Rozkład sum kosztów:

| Suma kosztów | Liczba istot | Pozostało z 10 |
|---|---|---|
| 6 | 6 | 4 |
| 7 | 28 | 3 |
| 8 | 52 | 2 |
| 9 | 48 | 1 |
| 10 | 16 | 0 |

Zmiana względem kosztów z benchmarku: Grom 4→3 i Niedźwiedź 5→4. Przy kosztach z benchmarku 12 kombinacji przekraczało budżet, a kryterium S03-01 wymaga budżetu 10 dla każdej z 150.

## Wszystkie kombinacje

| # | Żywioł · Forma · Przymiot | Suma | Pozostało z 10 |
|---|---|---|---|
| 1 | Ogień · Wilk · Gniew | 10 | 0 |
| 2 | Ogień · Wilk · Smutek | 8 | 2 |
| 3 | Ogień · Wilk · Spryt | 9 | 1 |
| 4 | Ogień · Wilk · Odwaga | 9 | 1 |
| 5 | Ogień · Wilk · Głód | 10 | 0 |
| 6 | Ogień · Kruk · Gniew | 9 | 1 |
| 7 | Ogień · Kruk · Smutek | 7 | 3 |
| 8 | Ogień · Kruk · Spryt | 8 | 2 |
| 9 | Ogień · Kruk · Odwaga | 8 | 2 |
| 10 | Ogień · Kruk · Głód | 9 | 1 |
| 11 | Ogień · Sowa · Gniew | 9 | 1 |
| 12 | Ogień · Sowa · Smutek | 7 | 3 |
| 13 | Ogień · Sowa · Spryt | 8 | 2 |
| 14 | Ogień · Sowa · Odwaga | 8 | 2 |
| 15 | Ogień · Sowa · Głód | 9 | 1 |
| 16 | Ogień · Wąż · Gniew | 10 | 0 |
| 17 | Ogień · Wąż · Smutek | 8 | 2 |
| 18 | Ogień · Wąż · Spryt | 9 | 1 |
| 19 | Ogień · Wąż · Odwaga | 9 | 1 |
| 20 | Ogień · Wąż · Głód | 10 | 0 |
| 21 | Ogień · Niedźwiedź · Gniew | 10 | 0 |
| 22 | Ogień · Niedźwiedź · Smutek | 8 | 2 |
| 23 | Ogień · Niedźwiedź · Spryt | 9 | 1 |
| 24 | Ogień · Niedźwiedź · Odwaga | 9 | 1 |
| 25 | Ogień · Niedźwiedź · Głód | 10 | 0 |
| 26 | Ogień · Jeleń · Gniew | 10 | 0 |
| 27 | Ogień · Jeleń · Smutek | 8 | 2 |
| 28 | Ogień · Jeleń · Spryt | 9 | 1 |
| 29 | Ogień · Jeleń · Odwaga | 9 | 1 |
| 30 | Ogień · Jeleń · Głód | 10 | 0 |
| 31 | Woda · Wilk · Gniew | 9 | 1 |
| 32 | Woda · Wilk · Smutek | 7 | 3 |
| 33 | Woda · Wilk · Spryt | 8 | 2 |
| 34 | Woda · Wilk · Odwaga | 8 | 2 |
| 35 | Woda · Wilk · Głód | 9 | 1 |
| 36 | Woda · Kruk · Gniew | 8 | 2 |
| 37 | Woda · Kruk · Smutek | 6 | 4 |
| 38 | Woda · Kruk · Spryt | 7 | 3 |
| 39 | Woda · Kruk · Odwaga | 7 | 3 |
| 40 | Woda · Kruk · Głód | 8 | 2 |
| 41 | Woda · Sowa · Gniew | 8 | 2 |
| 42 | Woda · Sowa · Smutek | 6 | 4 |
| 43 | Woda · Sowa · Spryt | 7 | 3 |
| 44 | Woda · Sowa · Odwaga | 7 | 3 |
| 45 | Woda · Sowa · Głód | 8 | 2 |
| 46 | Woda · Wąż · Gniew | 9 | 1 |
| 47 | Woda · Wąż · Smutek | 7 | 3 |
| 48 | Woda · Wąż · Spryt | 8 | 2 |
| 49 | Woda · Wąż · Odwaga | 8 | 2 |
| 50 | Woda · Wąż · Głód | 9 | 1 |
| 51 | Woda · Niedźwiedź · Gniew | 9 | 1 |
| 52 | Woda · Niedźwiedź · Smutek | 7 | 3 |
| 53 | Woda · Niedźwiedź · Spryt | 8 | 2 |
| 54 | Woda · Niedźwiedź · Odwaga | 8 | 2 |
| 55 | Woda · Niedźwiedź · Głód | 9 | 1 |
| 56 | Woda · Jeleń · Gniew | 9 | 1 |
| 57 | Woda · Jeleń · Smutek | 7 | 3 |
| 58 | Woda · Jeleń · Spryt | 8 | 2 |
| 59 | Woda · Jeleń · Odwaga | 8 | 2 |
| 60 | Woda · Jeleń · Głód | 9 | 1 |
| 61 | Ziemia · Wilk · Gniew | 9 | 1 |
| 62 | Ziemia · Wilk · Smutek | 7 | 3 |
| 63 | Ziemia · Wilk · Spryt | 8 | 2 |
| 64 | Ziemia · Wilk · Odwaga | 8 | 2 |
| 65 | Ziemia · Wilk · Głód | 9 | 1 |
| 66 | Ziemia · Kruk · Gniew | 8 | 2 |
| 67 | Ziemia · Kruk · Smutek | 6 | 4 |
| 68 | Ziemia · Kruk · Spryt | 7 | 3 |
| 69 | Ziemia · Kruk · Odwaga | 7 | 3 |
| 70 | Ziemia · Kruk · Głód | 8 | 2 |
| 71 | Ziemia · Sowa · Gniew | 8 | 2 |
| 72 | Ziemia · Sowa · Smutek | 6 | 4 |
| 73 | Ziemia · Sowa · Spryt | 7 | 3 |
| 74 | Ziemia · Sowa · Odwaga | 7 | 3 |
| 75 | Ziemia · Sowa · Głód | 8 | 2 |
| 76 | Ziemia · Wąż · Gniew | 9 | 1 |
| 77 | Ziemia · Wąż · Smutek | 7 | 3 |
| 78 | Ziemia · Wąż · Spryt | 8 | 2 |
| 79 | Ziemia · Wąż · Odwaga | 8 | 2 |
| 80 | Ziemia · Wąż · Głód | 9 | 1 |
| 81 | Ziemia · Niedźwiedź · Gniew | 9 | 1 |
| 82 | Ziemia · Niedźwiedź · Smutek | 7 | 3 |
| 83 | Ziemia · Niedźwiedź · Spryt | 8 | 2 |
| 84 | Ziemia · Niedźwiedź · Odwaga | 8 | 2 |
| 85 | Ziemia · Niedźwiedź · Głód | 9 | 1 |
| 86 | Ziemia · Jeleń · Gniew | 9 | 1 |
| 87 | Ziemia · Jeleń · Smutek | 7 | 3 |
| 88 | Ziemia · Jeleń · Spryt | 8 | 2 |
| 89 | Ziemia · Jeleń · Odwaga | 8 | 2 |
| 90 | Ziemia · Jeleń · Głód | 9 | 1 |
| 91 | Wiatr · Wilk · Gniew | 9 | 1 |
| 92 | Wiatr · Wilk · Smutek | 7 | 3 |
| 93 | Wiatr · Wilk · Spryt | 8 | 2 |
| 94 | Wiatr · Wilk · Odwaga | 8 | 2 |
| 95 | Wiatr · Wilk · Głód | 9 | 1 |
| 96 | Wiatr · Kruk · Gniew | 8 | 2 |
| 97 | Wiatr · Kruk · Smutek | 6 | 4 |
| 98 | Wiatr · Kruk · Spryt | 7 | 3 |
| 99 | Wiatr · Kruk · Odwaga | 7 | 3 |
| 100 | Wiatr · Kruk · Głód | 8 | 2 |
| 101 | Wiatr · Sowa · Gniew | 8 | 2 |
| 102 | Wiatr · Sowa · Smutek | 6 | 4 |
| 103 | Wiatr · Sowa · Spryt | 7 | 3 |
| 104 | Wiatr · Sowa · Odwaga | 7 | 3 |
| 105 | Wiatr · Sowa · Głód | 8 | 2 |
| 106 | Wiatr · Wąż · Gniew | 9 | 1 |
| 107 | Wiatr · Wąż · Smutek | 7 | 3 |
| 108 | Wiatr · Wąż · Spryt | 8 | 2 |
| 109 | Wiatr · Wąż · Odwaga | 8 | 2 |
| 110 | Wiatr · Wąż · Głód | 9 | 1 |
| 111 | Wiatr · Niedźwiedź · Gniew | 9 | 1 |
| 112 | Wiatr · Niedźwiedź · Smutek | 7 | 3 |
| 113 | Wiatr · Niedźwiedź · Spryt | 8 | 2 |
| 114 | Wiatr · Niedźwiedź · Odwaga | 8 | 2 |
| 115 | Wiatr · Niedźwiedź · Głód | 9 | 1 |
| 116 | Wiatr · Jeleń · Gniew | 9 | 1 |
| 117 | Wiatr · Jeleń · Smutek | 7 | 3 |
| 118 | Wiatr · Jeleń · Spryt | 8 | 2 |
| 119 | Wiatr · Jeleń · Odwaga | 8 | 2 |
| 120 | Wiatr · Jeleń · Głód | 9 | 1 |
| 121 | Grom · Wilk · Gniew | 10 | 0 |
| 122 | Grom · Wilk · Smutek | 8 | 2 |
| 123 | Grom · Wilk · Spryt | 9 | 1 |
| 124 | Grom · Wilk · Odwaga | 9 | 1 |
| 125 | Grom · Wilk · Głód | 10 | 0 |
| 126 | Grom · Kruk · Gniew | 9 | 1 |
| 127 | Grom · Kruk · Smutek | 7 | 3 |
| 128 | Grom · Kruk · Spryt | 8 | 2 |
| 129 | Grom · Kruk · Odwaga | 8 | 2 |
| 130 | Grom · Kruk · Głód | 9 | 1 |
| 131 | Grom · Sowa · Gniew | 9 | 1 |
| 132 | Grom · Sowa · Smutek | 7 | 3 |
| 133 | Grom · Sowa · Spryt | 8 | 2 |
| 134 | Grom · Sowa · Odwaga | 8 | 2 |
| 135 | Grom · Sowa · Głód | 9 | 1 |
| 136 | Grom · Wąż · Gniew | 10 | 0 |
| 137 | Grom · Wąż · Smutek | 8 | 2 |
| 138 | Grom · Wąż · Spryt | 9 | 1 |
| 139 | Grom · Wąż · Odwaga | 9 | 1 |
| 140 | Grom · Wąż · Głód | 10 | 0 |
| 141 | Grom · Niedźwiedź · Gniew | 10 | 0 |
| 142 | Grom · Niedźwiedź · Smutek | 8 | 2 |
| 143 | Grom · Niedźwiedź · Spryt | 9 | 1 |
| 144 | Grom · Niedźwiedź · Odwaga | 9 | 1 |
| 145 | Grom · Niedźwiedź · Głód | 10 | 0 |
| 146 | Grom · Jeleń · Gniew | 10 | 0 |
| 147 | Grom · Jeleń · Smutek | 8 | 2 |
| 148 | Grom · Jeleń · Spryt | 9 | 1 |
| 149 | Grom · Jeleń · Odwaga | 9 | 1 |
| 150 | Grom · Jeleń · Głód | 10 | 0 |

## Zatwierdzenie

Zatwierdzone: 2026-10-24 (właściciel projektu).
