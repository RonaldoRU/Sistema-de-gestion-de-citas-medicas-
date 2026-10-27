#!/bin/sh
set -e

# Asegurar dependencias de Composer si el volumen local montado las ocultó
if [ ! -f /var/www/html/vendor/autoload.php ]; then
    echo "Instalando dependencias de Composer..."
    composer install --no-dev --optimize-autoloader --no-interaction
fi

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

# Crear directorios y permisos para storage, cache y base de datos
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache \
         /var/www/html/database

chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database 2>/dev/null || true

# Ejecución automática en Railway / Cloud cuando se asigna la variable $PORT
if [ -n "$PORT" ]; then
    echo "Ambiente Cloud / Railway detectado. Puerto HTTP: $PORT"

    # Si Railway provee variables de PostgreSQL, configurarlas en .env
    if [ -n "$DATABASE_URL" ]; then
        echo "Variable DATABASE_URL detectada."
        sed -i 's/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/' /var/www/html/.env 2>/dev/null || true
    elif [ -n "$PGHOST" ]; then
        echo "Variable PGHOST detectada: $PGHOST"
        sed -i 's/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/' /var/www/html/.env 2>/dev/null || true
        sed -i "s/^DB_HOST=.*/DB_HOST=$PGHOST/" /var/www/html/.env 2>/dev/null || true
        [ -n "$PGPORT" ] && sed -i "s/^DB_PORT=.*/DB_PORT=$PGPORT/" /var/www/html/.env 2>/dev/null || true
        [ -n "$PGDATABASE" ] && sed -i "s/^DB_DATABASE=.*/DB_DATABASE=$PGDATABASE/" /var/www/html/.env 2>/dev/null || true
        [ -n "$PGUSER" ] && sed -i "s/^DB_USERNAME=.*/DB_USERNAME=$PGUSER/" /var/www/html/.env 2>/dev/null || true
        [ -n "$PGPASSWORD" ] && sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$PGPASSWORD/" /var/www/html/.env 2>/dev/null || true
    fi

    # Probar si la base de datos configurada responde
    DB_STATUS=0
    php artisan db:show >/dev/null 2>&1 || DB_STATUS=$?

    if [ $DB_STATUS -ne 0 ]; then
        echo "AVISO: No se pudo conectar al host de PostgreSQL configurado (DB_HOST=${DB_HOST:-db})."
        echo "Activando almacenamiento seguro SQLite interno para garantizar funcionamiento inmediato..."

        touch /var/www/html/database/database.sqlite
        chmod 777 /var/www/html/database/database.sqlite 2>/dev/null || true

        sed -i 's/^DB_CONNECTION=.*/DB_CONNECTION=sqlite/' /var/www/html/.env 2>/dev/null || true
        sed -i 's/^DB_HOST=.*/#DB_HOST=/' /var/www/html/.env 2>/dev/null || true
        sed -i 's|^DB_DATABASE=.*|DB_DATABASE=/var/www/html/database/database.sqlite|' /var/www/html/.env 2>/dev/null || true

        export DB_CONNECTION=sqlite
        export DB_DATABASE=/var/www/html/database/database.sqlite
    else
        echo "Conexión a PostgreSQL establecida exitosamente."
    fi

    echo "Ejecutando migraciones de base de datos..."
    php artisan migrate --force || true

    echo "Ejecutando seeders de datos iniciales..."
    php artisan db:seed --force || true

    echo "Iniciando servidor HTTP Laravel en 0.0.0.0:$PORT..."
    exec php artisan serve --host=0.0.0.0 --port="$PORT"
fi

# Ejecutar el comando pasado como parámetro (por defecto php-fpm para Docker Compose)
exec "$@"
