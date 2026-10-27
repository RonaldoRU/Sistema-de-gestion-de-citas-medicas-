# Despliegue con Docker — Clínica Vida Salud

Este proyecto está completamente configurado para levantarse en cualquier entorno (Windows, Linux, macOS o servidor en la nube) con un solo comando utilizando Docker y Docker Compose.

---

## Servicios incluidos en Docker

1. **`vidasalud-web` (Nginx:alpine):**
   - Servidor web HTTP en el puerto `8002`.
   - Proxy FastCGI optimizado para Laravel.
2. **`vidasalud-app` (PHP 8.3 FPM Alpine):**
   - PHP 8.3 con extensiones completas: `pdo_pgsql`, `pgsql`, `intl`, `zip`, `bcmath`, `gd`, `opcache`.
   - Composer 2.8 integrado.
   - Script de entrada (`entrypoint.sh`) que configura permisos y variables de entorno automáticamente.
3. **`vidasalud-db` (PostgreSQL 16 Alpine):**
   - Base de datos: `Clinica_Vida_Salud`
   - Puerto: `5432`
   - Usuario: `postgres` / Contraseña: `belen0506`
   - Esquema inicializado automáticamente: `vida_salud` con todas las 21 tablas, triggers y datos de prueba.

---

## Requisitos previos

- Tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) o [Docker Engine + Docker Compose](https://docs.docker.com/engine/install/) (Linux).

---

## Cómo iniciar el proyecto

1. **Clonar o ubicarse en la carpeta del proyecto:**
   ```bash
   cd citamedicaclinicavidasalud/citamedicaclinicavidasalud
   ```

2. **Iniciar los contenedores:**
   ```bash
   docker compose up -d --build
   ```

3. **Abrir la aplicación en el navegador:**
   - **Página de Inicio / Login:**  
     [http://localhost:8002/Frontend/stitch/html/P1%20Seguridad%20y%20Autenticaci%C3%B3n/cu01-iniciar-sesion.html](http://localhost:8002/Frontend/stitch/html/P1%20Seguridad%20y%20Autenticaci%C3%B3n/cu01-iniciar-sesion.html)
   - **Dashboard Principal:**  
     [http://localhost:8002/Frontend/stitch/html/inicio.html](http://localhost:8002/Frontend/stitch/html/inicio.html)
   - **Bitácora de Auditoría en Vivo:**  
     [http://localhost:8002/Frontend/stitch/html/P3%20Auditor%C3%ADa,%20Trazabilidad%20y%20Bit%C3%A1cora/cu11-bitacora.html](http://localhost:8002/Frontend/stitch/html/P3%20Auditor%C3%ADa,%20Trazabilidad%20y%20Bit%C3%A1cora/cu11-bitacora.html)

---

## Credenciales de Acceso

| Rol | Usuario | Contraseña |
|---|---|---|
| **Administradora** | `scolque` | `Admin123*` |
| **Recepcionista** | `rvaca` | `Admin123*` |
| **Recepcionista** | `csuarez` | `Admin123*` |
| **Médico General** | `jrojas` | `Admin123*` |

---

## Comandos útiles

- **Ver el estado de los contenedores:**
  ```bash
  docker compose ps
  ```

- **Ver los logs en tiempo real:**
  ```bash
  docker compose logs -f
  ```

- **Ejecutar comandos Artisan de Laravel:**
  ```bash
  docker compose exec app php artisan route:list
  docker compose exec app php artisan test
  ```

- **Detener los contenedores:**
  ```bash
  docker compose down
  ```

- **Detener y reiniciar desde cero borrando los datos de la base de datos:**
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```
