FROM node:22 as build

WORKDIR /app

# Kopieren und Installieren der Backend-Abhängigkeiten
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Kopieren und Bauen des Frontends
COPY frontend ./frontend

# Kopieren der Backend-Dateien
COPY backend ./backend

# Kopieren der Konfigurationsdateien
COPY init.sql ./

FROM node:22-slim

WORKDIR /app

# Kopieren der gebauten Anwendung aus dem Build-Stage
COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend ./frontend
COPY --from=build /app/init.sql ./

WORKDIR /app/backend
RUN npm install --only=production

EXPOSE 9615

CMD ["node", "backend/server.js"]