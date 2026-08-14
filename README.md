# Zaku

Domowa lista zakupów jako progresywna aplikacja webowa (PWA). Zero logowania, zero kont - grupa domowników łączy się jednym kodem i widzi te same listy zakupów oraz przepisy. Z przepisu jednym kliknięciem dorzucasz brakujące składniki na listę zakupów.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](#szybki-start-docker)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#współtworzenie-projektu)

## Spis treści

- [O projekcie](#o-projekcie)
- [Funkcje](#funkcje)
- [Stack technologiczny](#stack-technologiczny)
- [Struktura repo](#struktura-repo)
- [Szybki start (Docker)](#szybki-start-docker)
- [Instalacja deweloperska (bez Dockera)](#instalacja-deweloperska-bez-dockera)
- [Zmienne środowiskowe](#zmienne-środowiskowe)
- [Testy](#testy)
- [API](#api)
- [Wdrożenie produkcyjne (VPS / Proxmox)](#wdrożenie-produkcyjne-vps--proxmox)
- [Współtworzenie projektu](#współtworzenie-projektu)
- [Roadmap](#roadmap)
- [Licencja](#licencja)

## O projekcie

Projekt hobbystyczny, który rozwijam głównie na własne potrzeby domowe, ale trzymam go otwarty - jeśli chcesz coś dodać, poprawić albo zainspirować się rozwiązaniem, śmiało rób forka albo wrzuć PR-a.

Aplikacja nie ma systemu kont. Zamiast tego każde "gospodarstwo domowe" to grupa identyfikowana losowym kodem - wpisujesz go raz na urządzeniu, a domownicy z tym samym kodem widzą te same listy i przepisy. Prostota ponad wszystko.

## Funkcje

- **Listy zakupów** - twórz dowolną liczbę list, dodawaj produkty z ilością i jednostką, odznaczaj kupione, masowo czyść lub resetuj listę.
- **Grupy bez logowania** - dołączasz do "gospodarstwa" kodem zapisywanym w `localStorage`, bez hasła i rejestracji.
- **Przepisy** - baza przepisów ze składnikami, krokami przygotowania i zdjęciem, z podziałem na szkice (draft) i opublikowane.
- **Z przepisu na listę zakupów** - jednym przyciskiem dodajesz brakujące składniki z przepisu do wybranej listy zakupów.
- **PWA / offline** - instalowalna na telefonie (tryb standalone), auto-aktualizacja Service Workera, działa jak natywna appka.
- **Jasny / ciemny motyw** - przełącznik motywu (`next-themes`).
- **Mobile-first UI** - interfejs budowany pod telefon (Tailwind, Radix UI, obsługa `safe-area`).

## Stack technologiczny

**Frontend**

| Technologia                        | Zastosowanie                      |
| ---------------------------------- | --------------------------------- |
| React 19 + TypeScript              | UI                                |
| Vite                               | build/dev server                  |
| `vite-plugin-pwa`                  | manifest, service worker, offline |
| Tailwind CSS 4 + Radix UI / shadcn | stylowanie i komponenty           |
| TanStack Query                     | pobieranie i cache danych z API   |
| React Router                       | routing                           |

**Backend**

| Technologia                   | Zastosowanie              |
| ----------------------------- | ------------------------- |
| Node.js + Express 5           | REST API                  |
| SQLite (`sqlite` + `sqlite3`) | baza danych, plik lokalny |
| Multer                        | upload zdjęć do przepisów |
| Vitest + Supertest            | testy API i coverage      |

## Struktura repo

```
zaku/
├── backend/          # Express API + SQLite
│   ├── routes/v1/    # lists, items, recipes
│   ├── db.js         # inicjalizacja bazy i schemat tabel
│   └── index.js      # start serwera (serwuje też build frontendu)
├── frontend/          # React + Vite PWA
│   └── src/
│       ├── pages/     # ekrany aplikacji
│       ├── components/
│       └── api/       # klient HTTP (dokleja nagłówek grupy)
├── shared/            # typy TS współdzielone frontend/backend
├── Dockerfile
├── docker-compose.yml
├── install.sh          # pierwsza instalacja na serwerze (VPS/Proxmox, systemd)
└── update.sh            # aktualizacja działającej instalacji
```

## Szybki start (Docker)

Najprostszy sposób, żeby postawić aplikację lokalnie albo na własnym serwerze:

```bash
git clone https://github.com/MrWoodsman/zaku.git
cd zaku
docker compose up -d --build
```

Aplikacja wystartuje pod `http://localhost:3000` (backend serwuje też zbudowany frontend, więc to jeden kontener na jednym porcie). Baza SQLite i uploady przepisów trzymane są w wolumenach Dockera (`shopping-data`, `shopping-uploads`), więc przeżyją restart/rebuild kontenera.

Aktualizacja do nowszej wersji:

```bash
git pull
docker compose up -d --build
```

## Instalacja deweloperska (bez Dockera)

Wymagany Node.js 20+.

**Backend**

```bash
cd backend
npm install
node index.js
```

Serwer wystartuje na `http://localhost:3000` (albo porcie z `PORT` w `.env`).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Vite wystartuje na `http://localhost:5173` i przekieruje zapytania `/api` oraz `/images` do backendu na `localhost:3000` (patrz `server.proxy` w `frontend/vite.config.ts`) - upewnij się, że backend faktycznie tam działa.

## Zmienne środowiskowe

Backend czyta konfigurację z `backend/.env` (patrz `backend/.env.example`). Bez tego pliku też zadziała - poniższe wartości to jednocześnie sensowne domyślne:

| Zmienna   | Domyślnie                | Opis                                               |
| --------- | ------------------------ | -------------------------------------------------- |
| `PORT`    | `3000`                   | port, na którym startuje Express                   |
| `DB_PATH` | `./data/database.sqlite` | ścieżka do pliku bazy SQLite (względem `backend/`) |

## Testy

Testy API (Vitest + Supertest) są w `backend/`:

```bash
cd backend
npm test               # uruchomienie testów
npm run test:coverage  # z pokryciem kodu
```

## API

Wszystkie endpointy poza `/api/test` wymagają nagłówka `x-group-id` (kod grupy) - jeśli grupa o danym ID nie istnieje, zostaje utworzona automatycznie przy pierwszym żądaniu.

| Metoda           | Endpoint                                   | Opis                                                |
| ---------------- | ------------------------------------------ | --------------------------------------------------- |
| `GET`            | `/api/v1/lists`                            | listy zakupów w grupie                              |
| `POST`           | `/api/v1/lists`                            | nowa lista                                          |
| `GET`            | `/api/v1/lists/:id`                        | szczegóły listy z produktami                        |
| `PUT` / `DELETE` | `/api/v1/lists/:id`                        | edycja / usunięcie listy                            |
| `POST`           | `/api/v1/lists/:id/items`                  | dodanie produktu do listy                           |
| `PUT`            | `/api/v1/lists/:id/items/mark-all`         | odznaczenie wszystkich jako kupione                 |
| `PUT`            | `/api/v1/lists/:id/items/reset-all`        | reset stanu "kupione"                               |
| `DELETE`         | `/api/v1/lists/:id/items/delete-completed` | usunięcie kupionych                                 |
| `DELETE`         | `/api/v1/lists/:id/items/delete-all`       | wyczyszczenie listy                                 |
| `POST`           | `/api/v1/lists/add-from-recipe`            | dodanie składników przepisu do listy                |
| `PUT` / `DELETE` | `/api/v1/items/:id`                        | edycja / usunięcie pojedynczego produktu            |
| `GET`            | `/api/v1/recipes`                          | lista przepisów w grupie                            |
| `POST` / `PUT`   | `/api/v1/recipes` `/:id`                   | dodanie / edycja przepisu (multipart, pole `image`) |
| `DELETE`         | `/api/v1/recipes/:id`                      | usunięcie przepisu                                  |

## Wdrożenie produkcyjne (VPS / Proxmox)

Tak wdrażam aplikację na własnym Proxmoksie - poza Dockerem, jako usługa systemd na Debianie/Ubuntu.

1. Sklonuj repozytorium do `/opt/shopping-list-pwa` (ścieżkę bazową zakładają oba skrypty).
2. Jako root uruchom `./install.sh` - instaluje Node.js/npm, buduje frontend, instaluje zależności backendu i tworzy usługę `shopping-app` (systemd), którą od razu uruchamia i włącza na starcie systemu. Dorzuca też alias `shopping-logs` do podglądu logów.
3. Do kolejnych aktualizacji używaj `./update.sh` - robi `git fetch` + `git reset --hard origin/main`, przebudowuje frontend, aktualizuje zależności backendu i restartuje usługę.

Przydatne komendy po instalacji:

```bash
systemctl status shopping-app
journalctl -u shopping-app -f     # albo alias: shopping-logs
systemctl restart shopping-app
```

## Współtworzenie projektu

PR-y i issue mile widziane - to projekt hobbystyczny, więc nie ma sztywnego procesu, ale trzymam się kilku zasad:

1. Forkuj repo i pracuj na osobnym branchu (np. `feat/nazwa-funkcji`).
2. Commity staram się pisać w konwencji `typ(zakres): opis` (np. `feat(recipes): dodanie filtrowania`, `fix(lists): poprawka usuwania produktu`) - trzymaj się tego, jeśli możesz.
3. Jeśli zmieniasz backend, dorzuć/zaktualizuj testy w `backend/routes/v1/*.test.js` i sprawdź, że `npm test` przechodzi.
4. Otwórz Pull Requesta z krótkim opisem, co i dlaczego zmieniasz.

Zgłaszanie błędów i pomysłów: [GitHub Issues](https://github.com/MrWoodsman/zaku/issues).

## Roadmap

- **Inteligentna lista** - sugestie produktów na podstawie nawyków zakupowych (ekran już jest, logika "wkrótce").
- Synchronizacja w czasie rzeczywistym między urządzeniami w tej samej grupie (Socket.IO jest już w zależnościach, czeka na spięcie).

## Licencja

Projekt dostępny na licencji [MIT](LICENSE) - rób z nim, co chcesz, wystarczy zachować informację o autorze.
