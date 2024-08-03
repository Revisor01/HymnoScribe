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
COPY migrations/*.sql /app/migrations/
COPY run-migrations.sh /app/run-migrations.sh
RUN chmod +x /app/run-migrations.sh

FROM node:22-slim
WORKDIR /app

# Installieren des MySQL-Clients und anderer notwendiger Pakete
RUN apt-get update && apt-get install -y default-mysql-client && rm -rf /var/lib/apt/lists/*

# Kopieren der gebauten Anwendung aus dem Build-Stage
COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend ./frontend
COPY --from=build /app/init.sql /docker-entrypoint-initdb.d/
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/run-migrations.sh ./

WORKDIR /app/backend
RUN npm install --only=production

EXPOSE 9615

# Führen Sie das Migrations-Skript aus und starten Sie dann den Server
CMD ["/bin/sh", "-c", "/app/run-migrations.sh && node server.js"]