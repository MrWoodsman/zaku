# Zaku

A home shopping list as a Progressive Web App (PWA). No login, no accounts — a household joins with a single shared code and everyone sees the same shopping lists and recipes. Add missing ingredients from a recipe straight to a shopping list with one tap.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](#quick-start-docker)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

## Table of contents

- [About the project](#about-the-project)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Repo structure](#repo-structure)
- [Quick start (Docker)](#quick-start-docker)
- [Local development (without Docker)](#local-development-without-docker)
- [Environment variables](#environment-variables)
- [Tests](#tests)
- [API](#api)
- [Production deployment (VPS / Proxmox)](#production-deployment-vps--proxmox)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

## About the project

A hobby project I mainly build for my own household, but I'm keeping it open — if you want to add something, fix something, or just take inspiration from it, feel free to fork it or open a PR.

There's no account system. Instead, every "household" is a group identified by a random code — you enter it once on a device, and everyone with the same code sees the same lists and recipes. Simplicity over everything.

## Features

- **Shopping lists** — create as many lists as you want, add products with quantity and unit, check off purchased items, bulk-clear or reset a list.
- **Login-free groups** — join a "household" with a code stored in `localStorage`, no password, no registration.
- **Recipes** — a recipe library with ingredients, preparation steps and a photo, split into drafts and published recipes.
- **Recipe to shopping list** — add a recipe's missing ingredients to a chosen shopping list with one button.
- **PWA / offline** — installable on your phone (standalone mode), auto-updating service worker, feels like a native app.
- **Light / dark theme** — theme switcher (`next-themes`).
- **Mobile-first UI** — interface built for the phone (Tailwind, Radix UI, `safe-area` support).

## Tech stack

**Frontend**

| Technology                         | Purpose                           |
| ----------------------------------- | --------------------------------- |
| React 19 + TypeScript              | UI                                |
| Vite                               | build/dev server                  |
| `vite-plugin-pwa`                  | manifest, service worker, offline |
| Tailwind CSS 4 + Radix UI / shadcn | styling and components            |
| TanStack Query                     | data fetching and caching         |
| React Router                       | routing                           |

**Backend**

| Technology                     | Purpose                |
| ------------------------------- | ----------------------- |
| Node.js + Express 5            | REST API                |
| SQLite (`sqlite` + `sqlite3`)  | database, a local file  |
| Multer                          | recipe photo uploads    |
| Vitest + Supertest             | API tests and coverage  |

## Repo structure

```
zaku/
├── backend/          # Express API + SQLite
│   ├── routes/v1/    # lists, items, recipes
│   ├── db.js         # DB init and table schema
│   └── index.js      # starts the server (also serves the frontend build)
├── frontend/          # React + Vite PWA
│   └── src/
│       ├── pages/     # app screens
│       ├── components/
│       └── api/       # HTTP client (attaches the group header)
├── shared/            # TS types shared between frontend/backend
├── Dockerfile
├── docker-compose.yml
├── install.sh          # first-time server install (VPS/Proxmox, systemd)
└── update.sh            # updates a running installation
```

## Quick start (Docker)

The simplest way to run the app locally or on your own server:

```bash
git clone https://github.com/MrWoodsman/zaku.git
cd zaku
docker compose up -d --build
```

The app starts on `http://localhost:3000` (the backend also serves the built frontend, so it's one container on one port). The SQLite database and recipe uploads live in Docker volumes (`shopping-data`, `shopping-uploads`), so they survive container restarts/rebuilds.

Updating to a newer version:

```bash
git pull
docker compose up -d --build
```

## Local development (without Docker)

Requires Node.js 20+.

**Backend**

```bash
cd backend
npm install
node index.js
```

The server starts on `http://localhost:3000` (or whichever `PORT` is set in `.env`).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Vite starts on `http://localhost:5173` and proxies `/api` and `/images` requests to the backend on `localhost:3000` (see `server.proxy` in `frontend/vite.config.ts`) — make sure the backend is actually running there.

## Environment variables

The backend reads its config from `backend/.env` (see `backend/.env.example`). It also works without this file — the values below are the sensible defaults:

| Variable  | Default                  | Description                                    |
| --------- | ------------------------- | ------------------------------------------------ |
| `PORT`    | `3000`                    | port the Express server listens on               |
| `DB_PATH` | `./data/database.sqlite`  | path to the SQLite database file (relative to `backend/`) |

## Tests

API tests (Vitest + Supertest) live in `backend/`:

```bash
cd backend
npm test               # run the tests
npm run test:coverage  # with coverage
```

## API

Every endpoint except `/api/test` requires an `x-group-id` header (the group code) — if the group doesn't exist yet, it's created automatically on the first request.

| Method            | Endpoint                                   | Description                                    |
| ------------------ | ------------------------------------------- | ------------------------------------------------ |
| `GET`              | `/api/v1/lists`                            | shopping lists in the group                      |
| `POST`             | `/api/v1/lists`                            | create a list                                    |
| `GET`              | `/api/v1/lists/:id`                        | list details with its products                   |
| `PUT` / `DELETE`   | `/api/v1/lists/:id`                        | edit / delete a list                             |
| `POST`             | `/api/v1/lists/:id/items`                  | add a product to a list                          |
| `PUT`              | `/api/v1/lists/:id/items/mark-all`         | mark everything as purchased                     |
| `PUT`              | `/api/v1/lists/:id/items/reset-all`        | reset the "purchased" state                      |
| `DELETE`           | `/api/v1/lists/:id/items/delete-completed` | remove purchased items                           |
| `DELETE`           | `/api/v1/lists/:id/items/delete-all`       | clear a list                                     |
| `POST`             | `/api/v1/lists/add-from-recipe`            | add a recipe's ingredients to a list             |
| `PUT` / `DELETE`   | `/api/v1/items/:id`                        | edit / delete a single product                   |
| `GET`              | `/api/v1/recipes`                          | recipes in the group                             |
| `POST` / `PUT`     | `/api/v1/recipes` `/:id`                   | create / edit a recipe (multipart, `image` field) |
| `DELETE`           | `/api/v1/recipes/:id`                      | delete a recipe                                  |

## Production deployment (VPS / Proxmox)

This is how I deploy the app on my own Proxmox — no Docker, as a systemd service on Debian/Ubuntu.

1. Clone the repo to `/opt/shopping-list-pwa` (both scripts assume this base path).
2. As root, run `./install.sh` — it installs Node.js/npm, builds the frontend, installs the backend dependencies and creates a `shopping-app` systemd service, which it starts immediately and enables on boot. It also adds a `shopping-logs` alias for tailing logs.
3. For subsequent updates use `./update.sh` — it does `git fetch` + `git reset --hard origin/main`, rebuilds the frontend, updates the backend dependencies and restarts the service.

Useful commands after installation:

```bash
systemctl status shopping-app
journalctl -u shopping-app -f     # or the alias: shopping-logs
systemctl restart shopping-app
```

## Contributing

PRs and issues are welcome — this is a hobby project, so there's no rigid process, but I try to stick to a few rules:

1. Fork the repo and work on a separate branch (e.g. `feat/feature-name`).
2. I try to write commits following the `type(scope): description` convention (e.g. `feat(recipes): add filtering`, `fix(lists): fix item deletion`) — please stick to it if you can.
3. If you change the backend, add/update tests in `backend/routes/v1/*.test.js` and make sure `npm test` passes.
4. Open a Pull Request with a short description of what and why you're changing.

Report bugs and ideas here: [GitHub Issues](https://github.com/MrWoodsman/zaku/issues).

## Roadmap

- **Smart list** — product suggestions based on shopping habits (the screen already exists, the logic is "coming soon").
- Real-time sync across devices in the same group (Socket.IO is already a dependency, waiting to be wired up).

## License

Released under the [MIT license](LICENSE) — do whatever you want with it, just keep the copyright notice.
