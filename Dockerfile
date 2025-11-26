# ---------- build stage ----------
FROM node:18-bullseye-slim AS build

WORKDIR /app

# Installer dépendances de build nécessaires pour node-gyp et canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copier package.json en premier pour utiliser le cache Docker
COPY package*.json ./

# Installer les dépendances (production ou pas selon ton besoin)
RUN npm install --production

# Copier le reste du code
COPY . .

# ---------- runtime stage ----------
FROM node:18-bullseye-slim AS runtime

WORKDIR /app

# Installer uniquement les bibliothèques d'exécution (pas les -dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Copier node_modules et le code depuis l'étape build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app ./

EXPOSE 3000

CMD ["node", "src/server.js"]
