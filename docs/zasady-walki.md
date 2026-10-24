# Bestiariusz — zasady walki (wersja 0.2: rozdziały 1, 5a, 5b, 7, 9 i decyzje Z11–Z14 czekają na zatwierdzenie)

**Wersja 0.1 zatwierdzona: 2026-10-24 (zasady: S02-10, bez uwag; wartości bazowe: S02-11). Zmiany wersji 0.2 (Sprint 3) — efekty istot, budżet mocy, zdrowie Leszego — zatwierdzone: ____ (wpisz datę w S03-01b).**

Ten dokument opisuje walkę tak, jak zaimplementuje ją Sprint 2. To jedyne źródło zasad: kod i testy mają się z nim zgadzać, a nie odwrotnie. Dokument jest też instrukcją do zadania S02-10 (gra na papierze): zagraj według niego trzy walki i zapisz wszystko, co nie działa albo nie bawi. Jeśli zmieniasz regułę, zmień ją tutaj, a ja zmienię test.

Zasady wynikają z `docs/gdd-mvp.md` i z prototypu, który sprawdziłem symulacją. Liczby poniżej są wartościami bazowymi zatwierdzonymi 2026-10-24 w zadaniu S02-11; zmiana którejkolwiek wymaga zmiany tutaj, w danych i, jeśli dotyczy testu, zgody właściciela.

## 1. Zasoby i limity

| Zasób | Wartość | Uwagi |
|---|---|---|
| Zdrowie gracza | 40 | nie leczy się samo między turami |
| Żar | 3 na turę | niewykorzystany Żar przepada, każda tura zaczyna się od 3 |
| Ręka | 5 kart | na początku tury dobierasz do pięciu kart; karta ponad limit idzie do kosza |
| Blok gracza | 0 na starcie tury | znika na początku następnej tury gracza |
| Kręgi | 3 miejsca (0, 1, 2) | w każdym najwyżej jedna istota |
| Budżet mocy istoty (v0.2) | 10 | suma kosztów trzech symboli istoty; każdy niewydany punkt daje +1 zdrowia (rozdział 5b) |

## 2. Przebieg tury

**Początek walki.** Talia jest tasowana raz. Dobierasz 5 kart, masz 3 Żaru. Wróg od razu pokazuje **zamiar** (co zrobi na końcu tej tury). Walka zaczyna się od tury 1.

**Twoja tura.** Zagrywasz karty w dowolnej kolejności, dopóki masz Żar:

- *Istota:* płacisz koszt i kładziesz ją w wolnym Kręgu (sam wybierasz który). Karta idzie od razu do kosza, a istota stoi w Kręgu.
- *Zaklęcie:* płacisz koszt, wykonują się efekty (obrażenia wrogowi, blok dla ciebie), karta idzie do kosza.
- *Klątwa:* nie da się jej zagrać. Leży w ręce i zajmuje miejsce, aż koniec tury odrzuci całą rękę.

**Koniec tury** (przycisk „Koniec tury”), w tej kolejności:

1. **Twoje istoty atakują wroga**: Krąg 0, potem 1, potem 2. Każda uderza swoim żywiołem za wartość swojego ataku. Jeśli wróg zginie, walka kończy się natychmiast i reszta tury się nie odbywa.
2. **Blok wroga znika**, potem wróg wykonuje pokazany zamiar (rozdział 6).
3. Jeśli twoje zdrowie spadło do 0, przegrywasz.
4. Cała ręka idzie do kosza. Zaczyna się tura gracza: Żar wraca do 3, twój blok zerujesz, dobierasz 5 kart, a wróg wybiera i pokazuje następny zamiar. **Zamiar wybiera się po dobraniu kart**, więc wróg „widzi”, ile kart masz w ręce.

**Dobieranie.** Karty bierzesz z wierzchu talii. Gdy talia się skończy, kosz jest tasowany i staje się nową talią (jedno tasowanie na wyczerpanie talii). Karta dobrana ponad limit ręki (5) idzie od razu do kosza.

## 3. Karty

Talia startowa „Szeptucha” ma 12 kart:

| Karta | Ile | Koszt | Efekt |
|---|---|---|---|
| `woda-sowa-odwaga` | 1 | 1 | istota: żywioł woda, atak 1, zdrowie 6 |
| `ziemia-jelen-spryt` | 1 | 2 | istota: żywioł ziemia, atak 3, zdrowie 7 |
| `ogien-wilk-smutek` | 1 | 2 | istota: żywioł ogień, atak 4, zdrowie 5 |
| `ogien-kruk-odwaga` | 1 | 1 | istota: żywioł ogień, atak 3, zdrowie 5 |
| `wiatr-kruk-gniew` | 1 | 1 | istota: żywioł wiatr, atak 4, zdrowie 3 |
| `uderzenie` | 3 | 1 | 6 obrażeń bez żywiołu |
| `plomien` | 1 | 2 | 9 obrażeń żywiołu ogień |
| `oklad` | 2 | 1 | 6 bloku |
| `mgla` | 1 | 2 | 10 bloku |

Statystyki istoty = baza formy + premia żywiołu + modyfikator przymiotu (atak nie spada poniżej 0, zdrowie poniżej 1). Dla tych pięciu:

| Istota | Forma | Żywioł | Przymiot | Atak | Zdrowie |
|---|---|---|---|---|---|
| `woda-sowa-odwaga` | sowa 1/4 | woda +0/+0 | odwaga +0/+2 | 1 | 6 |
| `ziemia-jelen-spryt` | jeleń 2/6 | ziemia +0/+1 | spryt +1/+0 | 3 | 7 |
| `ogien-wilk-smutek` | wilk 3/4 | ogień +1/+0 | smutek +0/+1 | 4 | 5 |
| `ogien-kruk-odwaga` | kruk 2/3 | ogień +1/+0 | odwaga +0/+2 | 3 | 5 |
| `wiatr-kruk-gniew` | kruk 2/3 | wiatr +0/+0 | gniew +2/+0 | 4 | 3 |

Nazwy wyświetlane (np. „Wodna Sowa Odwagi”) dojdą w Sprincie 3; do tego czasu na kartkach używaj tych identyfikatorów albo własnych skrótów.

## 4. Obrażenia, blok, odporności

Każde uderzenie w wroga liczy się tak, w tej kolejności:

1. **Żywioł** (tylko jeśli uderzenie ma żywioł): odporność wroga na ten żywioł → obrażenia ×0,5, słabość → ×1,5, zaokrąglone **w dół**. Odporność i słabość na ten sam żywioł znoszą się.
2. **Blok wroga** pochłania obrażenia, aż się skończy. Uderzenie z **przebiciem** ignoruje blok i go nie zużywa.
3. Reszta zabiera zdrowie wroga (poniżej 0 nie schodzi).

Uderzenia bez żywiołu (`uderzenie`) nie podlegają odporności ani słabości. Atak istoty ma żywioł tej istoty.

## 5. Kręgi i istoty

- Istota dostaje obrażenia od wroga i **zachowuje je**: nie leczy się między turami.
- Zginąć może tylko od ataku wroga albo klątwy. Gdy ginie, Krąg się zwalnia (karta już leży w koszu od chwili zagrania, więc wraca do gry dopiero po tasowaniu).
- Istota atakuje już w turze, w której ją zagrano (na końcu tej tury); nie ma „choroby przyzwania”.
- Kręgów nie da się zamienić ani przesunąć.

## 5a. Efekty istot (v0.2, Sprint 3)

Żywioły i formy niosą **efekty**; przymioty zmieniają tylko liczby (atak, zdrowie). Efekt to dane w `src/data/symbols.json` (kiedy, co, ile, od czego zależy), a opis wszystkich efektów, kolejności i sposobu dodawania nowych jest w `docs/efekty-symboli.md`. Tu tylko zasady, które wchodzą w przebieg tury:

1. **Przyzwanie.** Efekty „przy przyzwaniu” działają od razu po położeniu istoty w Kręgu, **przed** sprawdzeniem Obrzędu. Mogą zakończyć walkę.
2. **Atak.** Podczas ataku istoty (rozdział 2, krok 1) jej efekty „przy ataku” działają **zaraz po jej uderzeniu**, zanim zaatakuje następna istota.
3. **Koniec tury.** Po atakach wszystkich istot, przed fazą wroga, działają efekty „na koniec tury”: Krąg 0, potem 1, potem 2.
4. **Obrażenia.** Istota, która została uderzona przez wroga i **przeżyła**, uruchamia efekty „gdy oberwie” — **raz za każde trafienie**, po zakończeniu całej fazy wroga (po sprawdzeniu, czy gracz przeżył), w kolejności trafień. Zniszczona istota nie uruchamia nic.
5. **Kolejność w jednej istocie:** żywioł, potem forma, potem przymiot. Między istotami: Krąg 0, 1, 2.
6. **Mnożnik.** Efekt działa tyle razy większą wartością, ile istot liczy jego zakres: „sama” (1), „inne tego samego żywiołu”, „wszystkie tego samego żywiołu” (z nią samą), „wszystkie inne”. Wiatr **nie** jest tu dowolnym żywiołem (liczy się tylko wiatr z wiatrem). Gdy mnożnik wynosi 0, efekt się nie uruchamia i nic się nie dzieje.
7. Gdy wróg ginie od efektu, walka kończy się od razu i nic więcej się nie wykonuje.

## 5b. Statystyki istoty i budżet mocy (v0.2, Sprint 3)

Atak = baza formy + premia żywiołu + modyfikator przymiotu (nie mniej niż 0). Zdrowie = baza formy + premia żywiołu + modyfikator przymiotu **+ 1 za każdy niewydany punkt budżetu 10** (nie mniej niż 1). Koszt istoty to suma kosztów trzech symboli; żadna z 150 istot MVP nie przekracza 10. Przykłady: Woda + Kruk + Smutek kosztuje 6, ma atak 2 i zdrowie 3 + 1 + 4 = 8; Ogień + Wilk + Gniew kosztuje 10, ma atak 6 i zdrowie 4. Zasada jest w danych (`balance.json`: `powerBudget`, `leftoverHealth`), więc jej siłę da się zmienić bez zmiany kodu.

## 6. Obrzęd

**Obrzęd** uruchamia się w chwili, gdy kładziesz trzecią istotę, a wszystkie trzy Kręgi są pełne i należą do jednego żywiołu. **Wiatr jest dowolnym żywiołem** (dopełnia Obrzęd każdego żywiołu); trzy istoty wiatru dają Obrzęd wiatru. Obrzęd zdarza się **raz na walkę** (pierwszy, który się uruchomi; drugi, nawet innego żywiołu, już nie). Sprawdzamy go przy przyzwaniu, nie na końcu tury.

| Żywioł | Efekt Obrzędu |
|---|---|
| ogień | 14 obrażeń żywiołu ogień, **przebijają blok** |
| grom | 16 obrażeń żywiołu grom, **przebijają blok** |
| woda | leczysz 10 (do maksimum 40) i dostajesz 8 bloku |
| ziemia | dostajesz 15 bloku |
| wiatr | dobierasz 3 karty (z limitem ręki 5) i dostajesz 2 Żaru |

Obrzęd ognia lub gromu może zabić wroga; wtedy wygrywasz od razu.

## 7. Wróg: Leszy

**Zdrowie:** na papierze **60** (skrócona wersja do sprawdzania zasad, walka trwa ok. 4–5 tur). W danych gry **380** (v0.2, do zatwierdzenia w S03-01b: po wprowadzeniu efektów i zdrowia z niewydanego budżetu bot wygrywa 55,5% walk w ok. 17,9 tury). Wartość z v0.1 to 160 (55,3% w ok. 9,7 tury, bez efektów i bez zdrowia z budżetu); z nowymi zasadami dawałaby ok. 90% wygranych. **Odporność:** ziemia. **Słabość:** ogień.

Leszy ma cztery działania:

| Działanie | Waga | Ograniczenia i premie | Co robi |
|---|---|---|---|
| Cios | 5 | — | 12 obrażeń **bezpośrednio w ciebie**: omija Kręgi, ale blok je pochłania |
| Gąszcz | 3 | pauza 2 tury; +3 gdy jego zdrowie < 50% | zyskuje 10 bloku |
| Szpony | 3 | +3 gdy masz co najmniej 2 istoty | 3 uderzenia po 4 w istoty (cel liczony przed każdym uderzeniem) |
| Zwód | 2 | pauza 3 tury; +4 gdy masz 3 istoty | **klątwa** na Krąg najsilniejszej istoty + uderzenie 4 w istoty |

**Wybór zamiaru** (bez losowości): każde działanie ma wynik = waga + premie, których warunek jest spełniony. Wygrywa najwyższy wynik, przy remisie to, które jest wyżej na liście. Z gry wypadają: działania na pauzie (użyte w ostatnich *N* turach) i działanie użyte już dwa razy z rzędu. Gdy wypadną wszystkie, Leszy robi pierwsze z listy (Cios).

**Cel zwykłego uderzenia** (Szpony, Zwód): najsilniejsza istota (największy atak; przy remisie niższy numer Kręgu). Nadmiar obrażeń przepada. Gdy nie ma żadnej istoty, uderzenie idzie w ciebie, przez blok. Blok gracza **nie chroni** istot. Cios („bezpośrednio”) ignoruje istoty.

**Klątwa:** cel (Krąg najsilniejszej istoty) jest pokazany razem z zamiarem. Przy wykonaniu istota w tym Kręgu ginie (jeśli stoi), a do twojego kosza trafia karta `klatwa`. Po przetasowaniu trafi do ręki i zajmie miejsce.

**Blok wroga** znika na początku jego fazy w następnej turze; chroni więc przed twoimi zaklęciami i atakami istot z jednej pełnej tury.

## 8. Koniec walki

Wygrywasz, gdy zdrowie wroga spadnie do 0 (od zaklęcia, ataku istoty lub Obrzędu, od razu). Przegrywasz, gdy twoje zdrowie spadnie do 0 w fazie wroga. Po przegranej nie ma kolejnej tury.

## 9. Scenariusze sprawdzane testami

Każdy scenariusz to jeden test w repozytorium (`tests/combat/circles.test.ts`, `tests/combat/ritual-flow.test.ts`). Zagraj je też na kartkach: jeśli wynik na papierze jest inny, jedno z nas się myli i to jest dokładnie to, czego szukamy. Ustawienie: tura 3, ty 40 zdrowia, Leszy 60/60, chyba że napisano inaczej; „krąg 0/1/2” to numery Kręgów.

| # | Ustawienie | Wynik |
|---|---|---|
| K1 | w ręce Sowa; zagrywasz ją w Krąg 1 | Sowa 1/6 w Kręgu 1, Żar 2, karta w koszu |
| K2 | Krąg 0 zajęty; próbujesz tam zagrać Sowę | odmowa „Krąg zajęty”, nic się nie zmienia |
| K3 | masz 1 Żar; w ręce Wilk (koszt 2) | odmowa „za mało Żaru” |
| K4 | w Kręgach: Wilk, Jeleń, Sowa; kończysz turę | ataki: 6 (4 ognia ×1,5), 1 (3 ziemi ×0,5 w dół), 1; Leszy ma 52 |
| K5 | j.w., Leszy ma 5 zdrowia | wygrana po pierwszym ataku; Leszy nie działa |
| K6 | Sowa, Wilk, Jeleń; zamiar: uderzenie 8 | trafiony Wilk (atak 4): traci 5 i ginie, Krąg 1 wolny, ty bez strat |
| K7 | dwa Kruki ognia (Kręgi 0 i 2); uderzenie 3 | trafiony Krąg 0 (remis ataku): zdrowie 5→2; Krąg 2 bez zmian |
| K8 | Wilk (Krąg 0), Sowa (Krąg 2); Szpony 3×4 | Wilk −4, Wilk −1 i ginie, Sowa −4 → Sowa 2; ty bez strat |
| K9 | Wilk (Krąg 0), Jeleń (Krąg 2); Zwód | klątwa niszczy Wilka, uderzenie 4 w Jelenia (3 zdrowia zostaje), w koszu karta `klatwa` |
| K10 | Jeleń (Krąg 0), masz 5 bloku; Cios 12 | blok pochłania 5, tracisz 7 (33 zdrowia), Jeleń nietknięty |
| R1 | Wilk i Kruk ognia w Kręgach 0 i 1; zagrywasz Kruka wiatru w Krąg 2 | Obrzęd ognia: 14×1,5 = 21, Leszy 39 |
| R2 | to samo, ale Obrzęd już był | brak Obrzędu, Leszy 60 |
| R2b | dwie Sowy wody w Kręgach, trzecia; Obrzęd już był | brak Obrzędu (limit to raz na walkę, nie raz na żywioł) |
| R3 | to samo co R1, Leszy ma 10 | wygrana od razu |
| R4 | dwa ognie + woda, albo ogień + pusty Krąg | brak Obrzędu |
| R5 | to samo co R1, Leszy ma 10 bloku | blok bez zmian (przebicie), Leszy 39 |
| R6 | trzy wody (masz 35 zdrowia) / trzy ziemie / trzy wiatry | zdrowie 40 i blok 8 / blok 15 / 3 karty z talii i Żar 4 |
| R7 | Wilk, Kruk ognia i Kruk wiatru stoją od początku tury | koniec tury nie wywołuje Obrzędu (liczy się chwila przyzwania) |

### Scenariusze efektów (v0.2, testy w `tests/combat/effects.test.ts`)

| # | Scenariusz | Wynik |
|---|---|---|
| E1 | Przyzwanie wiatru jako trzeciej istoty ognia | efekt przyzwania, dopiero potem Obrzęd |
| E2 | Dwie istoty ognia kończą turę | po uderzeniu każdej jej efekt ataku, w kolejności Kręgów |
| E3 | Jedna istota z efektem w żywiole, formie i przymiocie | trzy efekty w kolejności żywioł, forma, przymiot |
| E4 | Efekty końca tury (blok, leczenie istoty i gracza) | po wszystkich atakach, przed fazą wroga; blok chroni już w tej fazie |
| E5 | Istota trafiona i przeżywająca / trafiona i zniszczona | pierwsza reaguje po fazie wroga, druga nie |
| E6 | Szpony: 3 trafienia w jedną istotę, która przeżywa | reakcja 3 razy |
| E7 | Efekt, którego mnożnik wynosi 0 | żadnego zdarzenia |
| E8 | Efekt ataku dobija wroga w środku tury | koniec walki, bez dalszych efektów i bez fazy wroga |
| E9 | Wzrost ataku i zdrowia, leczenie istoty | wzrost zostaje na kolejne tury; leczenie nie przekracza maksimum |
| E10 | Żar, leczenie i dobieranie z przyzwania | żar rośnie, leczenie nie przekracza maksimum, dobrana karta trafia do ręki |

## 10. Arkusz do gry na papierze (S02-10)

**Przygotuj:** 12 kart z rozdziału 3 (wytnij z papieru lub użyj kart do gry z dopisanymi nazwami), karteczki na Krągi (trzy kratki z numerami 0, 1, 2), kartkę na licznik (poniżej). Tasujesz talię raz na początku i raz, gdy się skończy. Zamiar Leszego wyznaczasz według rozdziału 7, bez kostek.

**Zagraj trzy walki** z Leszym (60 zdrowia). Zmieniaj kolejność zagrywania, spróbuj Obrzędu w jednej z nich i jeden raz celowo zostaw Wilka na pastwę Szponów.

**Licznik tury** (jedna linijka na turę):

| Tura | Ręka (5) | Żar | Zamiar Leszego | Twoje zagrania | Zdrowie ty / Leszy | Blok ty / Leszy | Kręgi 0 / 1 / 2 (zdrowie) |
|---|---|---|---|---|---|---|---|
| 1 | | 3 | | | 40 / 60 | | |

**Po każdej walce zapisz** (to jest `docs/papier-S02.md`, minimum 10 uwag łącznie):

- które reguły były niejasne albo się gryzły (cytuj rozdział);
- co było nudne, mylące albo „nic nie robiło” (np. karta, której nigdy nie opłaca się zagrać);
- czy walka trwała za krótko lub za długo i co byś zmienił;
- czy zamiar Leszego był czytelny i czy dało się na niego odpowiedzieć;
- czy Obrzęd był wart zachodu;
- liczba tur i zdrowie na końcu.

## 11. Decyzje podjęte w tym dokumencie (zmień, jeśli się nie zgadzasz)

| # | Decyzja | Powód |
|---|---|---|
| Z1 | Żar 3 na turę, ręka 5 kart. | Wartości z dokumentu projektowego; symulacja dała zwykłe, czytelne tury. |
| Z2 | Istoty atakują na końcu tury, w kolejności Kręgów 0→1→2, od razu po przyzwaniu. | Najprostsze do narysowania na kartce i do przeczytania na ekranie. |
| Z3 | Wróg wybiera zamiar **po** dobraniu kart w nowej turze. | Warunek „gracz ma co najwyżej N kart” jest wtedy prawdziwy. |
| Z4 | Zwykłe uderzenie wroga trafia najsilniejszą istotę, a gracza dopiero przy pustych Kręgach. | Zgodnie z regułą z benchmarku; daje sens Kręgom. |
| Z5 | **Cios Leszego jest „bezpośredni” (omija Kręgi).** | **Odkrycie z symulacji:** bez tego wszystkie ataki wroga trafiały w istoty i gracz prawie nie tracił zdrowia (100% wygranych, 39 z 40 zdrowia na koniec). Z flagą `direct` bot wygrywa ok. 55% (przy 160 zdrowia Leszego). |
| Z6 | Obrzęd tylko raz na walkę, wiatr jest dowolnym żywiołem. | Zgodne z GDD; ogranicza najsilniejszy efekt. |
| Z7 | Karta istoty idzie do kosza w chwili zagrania. | Istota w Kręgu i karta w talii nie istnieją jednocześnie. |
| Z8 | Klątwa celuje w Krąg najsilniejszej istoty i jest pokazywana z zamiarem. | Gracz ma szansę zareagować, zgodnie z zasadą „zamiar zawsze widoczny”. |
| Z9 | Blok wroga znika na początku jego fazy, blok gracza na początku jego tury. | Blok z jednej pełnej tury chroni przed jednym pełnym cyklem. |
| Z10 | Dobieranie ponad limit ręki pali kartę (do kosza). | Prostsze niż odmowa dobrania; talia się nie „zacina”. |
| Z11 | Efekty są **danymi** (cztery momenty, osiem operacji, cztery zakresy), nie kodem pisanym osobno dla każdej istoty. | Dodanie efektu to wpis w JSON; nowa operacja to jeden `case` i jeden test. |
| Z12 | Kolejność w istocie: żywioł → forma → przymiot; między istotami Krąg 0→2. | Przewidywalne i łatwe do narysowania na kartce. |
| Z13 | Niewydany budżet mocy daje +1 zdrowia za punkt (z `balance.json`). | Reguła pochodzi ze specyfikacji zadania 02 benchmarku (budżet mocy), nie z GDD; zapisana jako decyzja D22 w planie Sprintu 3. Efektem ubocznym jest dłuższa walka (patrz Z14). |
| Z14 | Zdrowie Leszego 380 (z 160). | Efekty i zdrowie z budżetu podnoszą siłę gracza; przy 160 bot wygrywa ok. 90%. Alternatywa do rozważenia po S03-10: zostawić niższe zdrowie i podnieść obrażenia Leszego (krótsze walki, ale trzeba przejść kalibrację od nowa). |

## 12. Czego ten dokument jeszcze nie rozstrzyga

Nagrody po walce, sklep, relikty, mapa, inni wrogowie, kolejne talie, kradzież kart (mechanizm istnieje w kodzie, Leszy go nie używa) i nazwy kart. To zakres Sprintów 3–6; Sprint 2 sprawdza tylko, czy pojedyncza walka z Leszym jest zrozumiała i da się ją wygrać.
