@echo off
REM =============================================================================
REM MW PANEL 2.0 - SCRIPT DE INICIO COMPLETO (WINDOWS)
REM =============================================================================
REM Este script inicia todo el sistema: PostgreSQL + Redis + Backend + Frontend
REM y ejecuta las semillas de datos automaticamente
REM =============================================================================

setlocal enabledelayedexpansion

REM Configurar colores (si es posible)
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "PURPLE=%ESC%[35m"
set "CYAN=%ESC%[36m"
set "NC=%ESC%[0m"

:show_banner
echo.
echo %PURPLE%╔══════════════════════════════════════════════════════════╗%NC%
echo %PURPLE%║                    MW PANEL 2.0                          ║%NC%
echo %PURPLE%║              INICIO COMPLETO DEL SISTEMA                 ║%NC%
echo %PURPLE%╚══════════════════════════════════════════════════════════╝%NC%
echo.

:main
echo %BLUE%ℹ️  Verificando Docker...%NC%

REM Verificar si Docker está corriendo
docker info >nul 2>&1
if errorlevel 1 (
    echo %RED%❌ Docker no está corriendo. Por favor inicia Docker Desktop.%NC%
    pause
    exit /b 1
)
echo %GREEN%✅ Docker está corriendo%NC%

REM Verificar archivos necesarios
if not exist "docker-compose.yml" (
    echo %RED%❌ No se encontró docker-compose.yml en el directorio actual%NC%
    pause
    exit /b 1
)

if not exist ".env" (
    echo %YELLOW%⚠️  No se encontró .env, usando valores por defecto%NC%
) else (
    echo %GREEN%✅ Archivos de configuración encontrados%NC%
)

REM Manejar argumentos
if "%1"=="--clean" (
    echo %CYAN%🚀 Limpiando containers anteriores...%NC%
    docker-compose down -v --remove-orphans >nul 2>&1
    echo %GREEN%✅ Limpieza completada%NC%
)

echo %CYAN%🚀 Iniciando servicios con Docker Compose...%NC%
docker-compose up -d
if errorlevel 1 (
    echo %RED%❌ Error iniciando servicios%NC%
    pause
    exit /b 1
)
echo %GREEN%✅ Servicios iniciados%NC%

echo %BLUE%ℹ️  Esperando que PostgreSQL esté listo...%NC%
:wait_postgres
timeout /t 3 /nobreak >nul
docker-compose exec -T postgres pg_isready -U mwpanel >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%Verificando PostgreSQL...%NC%
    goto wait_postgres
)
echo %GREEN%✅ PostgreSQL está listo%NC%

echo %BLUE%ℹ️  Esperando que Redis esté listo...%NC%
:wait_redis
timeout /t 2 /nobreak >nul
docker-compose exec -T redis redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%Verificando Redis...%NC%
    goto wait_redis
)
echo %GREEN%✅ Redis está listo%NC%

echo %BLUE%ℹ️  Esperando que el backend esté listo...%NC%
timeout /t 10 /nobreak >nul

echo %CYAN%🚀 Ejecutando semillas de la base de datos...%NC%
docker-compose exec backend npm run seed
if errorlevel 1 (
    echo %RED%❌ Error ejecutando las semillas%NC%
    pause
    exit /b 1
)

echo.
echo %GREEN%✅ Semillas ejecutadas exitosamente%NC%
echo.
echo %BLUE%ℹ️  Usuarios de prueba creados:%NC%
echo   %GREEN%👨‍💼 Admin:%NC% admin@mwpanel.com / Admin123!
echo   %GREEN%👨‍🏫 Profesor:%NC% profesor@mwpanel.com / Profesor123!
echo   %GREEN%👨‍🎓 Estudiante:%NC% estudiante@mwpanel.com / Estudiante123!
echo   %GREEN%👨‍👩‍👧‍👦 Familia:%NC% familia@mwpanel.com / Familia123!
echo.

echo %CYAN%🚀 Estado de los servicios:%NC%
echo.
docker-compose ps
echo.

echo %BLUE%ℹ️  URLs de acceso:%NC%
echo   %CYAN%🌐 Frontend:%NC% http://localhost:5173
echo   %CYAN%⚙️  Backend API:%NC% http://localhost:3000
echo   %CYAN%📊 API Docs:%NC% http://localhost:3000/api
echo   %CYAN%🗄️  PostgreSQL:%NC% localhost:5432
echo   %CYAN%🔴 Redis:%NC% localhost:6379
echo.

echo %GREEN%🎉 ¡Sistema MW Panel 2.0 iniciado completamente!%NC%
echo %BLUE%ℹ️  El sistema está listo para usar. ¡Disfruta desarrollando!%NC%
echo.

pause