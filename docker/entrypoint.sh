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

# Ejecución automática en Railway / Cloud cuando se asigna la variable $PORT
if [ -n "$PORT" ] && [ "$1" = "php-fpm" ]; then
    echo "Ambiente Cloud / Railway detectado. Puerto: $PORT"
    echo "Ejecutando migraciones de base de datos..."
    php artisan migrate --force || true
    echo "Iniciando servidor HTTP Laravel en 0.0.0.0:$PORT..."
    exec php artisan serve --host=0.0.0.0 --port="$PORT"
fi

# Ejecutar el comando pasado como parámetro (por defecto php-fpm para Docker Compose)
exec "$@"
