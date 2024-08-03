#!/bin/bash

max_retries=30
counter=0

echo "Versuche, Verbindung zur Datenbank herzustellen..."
until mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" "$DB_NAME" > /dev/null 2>&1
do
  sleep 2
  counter=$((counter + 1))
  echo "Versuch $counter von $max_retries"
  if [ $counter -eq $max_retries ]
  then
    echo "Konnte keine Verbindung zur Datenbank herstellen nach $max_retries Versuchen."
    exit 1
  fi
done

echo "Datenbankverbindung hergestellt"

# Führe alle Migrations-Skripte aus
for migration in /app/migrations/*.sql
do
  filename=$(basename "$migration")
  if ! mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM migrations WHERE name='$filename'" | grep -q "$filename"; then
    echo "Führe Migration aus: $filename"
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$migration"
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "INSERT INTO migrations (name) VALUES ('$filename')"
  else
    echo "Migration bereits angewendet: $filename"
  fi
done

echo "Migrationen abgeschlossen"