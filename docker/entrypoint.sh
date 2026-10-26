#!/bin/sh
set -e

# Crear archivo .env si no existe
if [ ! -f /var/www/html/.env ]; then
    if [ -f /var/www/html/.env.docker.example ]; then
        cp /var/www/html/.env.docker.example /var/www/html/.env
    elif [ -f /var/www/html/.env.example ]; then
        cp /var/www/html/.env.example /var/www/html/.env
    fi
fi

# Generar APP_KEY si falta
if [ -f /var/www/html/.env ] && ! grep -q "^APP_KEY=base64:" /var/www/html/.env; then
    php artisan key:generate --force || true
fi

# Permisos para storage y bootstrap/cache
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

# Ejecutar el comando pasado como parámetro (por defecto php-fpm)
exec "$@"
