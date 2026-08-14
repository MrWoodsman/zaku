# ==========================================
# ETAP 1: Budowanie frontendu (React + Vite)
# ==========================================
FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app

COPY shared ./shared
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# ==========================================
# ETAP 2: Zależności backendu (tylko produkcyjne)
# ==========================================
FROM node:20-bookworm-slim AS backend-deps
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# ==========================================
# ETAP 3: Finalny obraz uruchomieniowy
# ==========================================
FROM node:20-bookworm-slim
WORKDIR /app/backend

ENV NODE_ENV=production

COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend ./
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# Katalogi na dane, które będziemy trzymać w zewnętrznych wolumenach
RUN mkdir -p data uploads/recipes

EXPOSE 3000

CMD ["node", "index.js"]
