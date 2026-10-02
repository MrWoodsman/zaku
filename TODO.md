# TODO

Rzeczy do zrobienia, w kolejności od najpilniejszych.

## Testy

### Naprawić 2 testy w `backend/routes/v1/scan.routes.test.js`

Oba nie przechodzą od dłuższego czasu, bo testy nie nadążyły za kodem (sam kod działa).
Czerwone testy przykrywają prawdziwe błędy, więc warto je poprawić.

- [ ] **„zwraca 401, gdy brak nagłówka x-group-id”** - test oczekuje 401, ale `POST /api/v1/scan`
  celowo działa bez grupy (sprawdzanie nagłówka jest zakomentowane, a frontend w
  `sendRequestToProcesPhoto` wysyła zdjęcie bez `x-group-id`). Do decyzji:
  - skanowanie ma działać bez grupy -> zmienić test (np. że bez nagłówka nie dostajemy 401), albo
  - skanowanie ma wymagać grupy -> odkomentować sprawdzanie i wysyłać nagłówek z frontendu
    (`fetchWithGroup` zamiast `fetch`).
- [ ] **„zwraca success: false, gdy przesłane zdjęcie nie zawiera kodu”** - test oczekuje komunikatu
  „Nie odnaleziono kodu.”, a backend zwraca „Nie odnaleziono kodu na zdjęciu.” - poprawić
  oczekiwany tekst w teście.

## Kaucja

### Przypomnienia o kończących się kuponach (push)

Raz dziennie powiadomienie, jeśli grupa ma kupony, które niedługo wygasną, np.:
„Masz 2 kupony na 3,50 zł, które wygasają w ciągu 3 dni - najbliższy: Lidl, jutro”.

- [ ] **Harmonogram na backendzie** - zadanie uruchamiane raz dziennie o stałej godzinie
  (np. 18:00), np. przez `node-cron` albo własny `setTimeout` liczony do najbliższej 18:00.
- [ ] **Zapytanie** - kupony niewykorzystane, nieusunięte, z `expiring_date` od dziś do dziś + 7 dni,
  pogrupowane po `group_id` (liczba, suma kwot, najbliższy sklep i data).
- [ ] **Kiedy wysyłać** - żeby nie spamować codziennie przez tydzień, tylko w wybrane dni przed
  końcem: 7 dni, 3 dni, 1 dzień i w dniu wygaśnięcia.
- [ ] **Bez duplikatów** - zapamiętać, co już wysłano (np. tabela `deposit_reminders` z
  `deposit_id` + `days_before`), żeby restart serwera nie wysłał tego samego drugi raz.
- [ ] **Wysyłka** - przez istniejący `backend/services/pushService.js` do subskrypcji grupy
  (tak jak `notifyListChanged`). Kliknięcie w powiadomienie otwiera `/deposit`.
- [ ] **Strefa czasowa** - `date('now','localtime')` w kontenerze to UTC, jeśli nie ustawi się
  strefy. Dodać `TZ: Europe/Warsaw` do `environment` w `docker-compose.yml`, inaczej „dzisiaj”
  i godzina wysyłki będą przesunięte.
- [ ] **Ustawienia** - osobny przełącznik „Przypomnienia o kaucji” w sekcji Powiadomienia,
  niezależny od powiadomień o listach.

### Drobne

- [ ] Sortowanie sklepów A-Z: SQLite nie zna polskiego alfabetu, więc np. „Żabka” ląduje na
  końcu listy. Do poprawy np. sortowaniem po stronie JS (`localeCompare(..., "pl")`) albo
  dodatkową kolumną z nazwą bez polskich znaków.

## Wydanie

- [ ] Tag `v0.59.0` i push.
- [ ] Na dev: usunąć pustą grupę `test` (zostałość po testach).
