FROM php:8.3-fpm-alpine

# Instalar dependencias del sistema requeridas por Laravel y PostgreSQL
RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    postgresql-dev \
    oniguruma-dev \
    linux-headers

# Configurar e instalar extensiones de PHP necesarias (incluyendo PostgreSQL e Intl)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        intl \
        zip \
        bcmath \
        exif \
        gd \
        opcache

# Instalar Composer oficial
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copiar configuraciones personalizadas
COPY docker/php/local.ini /usr/local/etc/php/conf.d/local.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copiar definiciones de dependencias de Composer primero
COPY composer.json composer.lock* /var/www/html/

# Instalar dependencias de producción de Composer
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copiar todo el código fuente de la aplicación
COPY . /var/www/html

# Regenerar autoload optimizado
RUN composer dump-autoload --optimize --no-dev

# Permisos para storage y cache
RUN mkdir -p /var/www/html/storage/framework/cache/data \
             /var/www/html/storage/framework/sessions \
             /var/www/html/storage/framework/views \
             /var/www/html/storage/logs \
             /var/www/html/bootstrap/cache \
    && chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000 8080 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
