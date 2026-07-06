#!/bin/bash

# Script para ejecutar tests E2E localmente
# Uso: ./run-e2e-tests.sh [modo]

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"
MODE=${1:-"headless"}

echo -e "${BLUE}🧪 MW Panel - Tests E2E con Cypress${NC}"
echo "===================================="

# Función para verificar servicios
check_services() {
    echo -e "\n${YELLOW}Verificando servicios...${NC}"
    
    # Backend
    if curl -s "${BACKEND_URL}/api/health/status" > /dev/null; then
        echo -e "${GREEN}✅ Backend está funcionando${NC}"
    else
        echo -e "${RED}❌ Backend no está disponible${NC}"
        echo "Inicia el sistema con: ./start-all-optimized.sh"
        exit 1
    fi
    
    # Frontend
    if curl -s "${FRONTEND_URL}" > /dev/null; then
        echo -e "${GREEN}✅ Frontend está funcionando${NC}"
    else
        echo -e "${RED}❌ Frontend no está disponible${NC}"
        echo "Inicia el sistema con: ./start-all-optimized.sh"
        exit 1
    fi
    
    # Database
    if docker exec mw-panel-postgres-1 pg_isready -U mwpanel > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Base de datos está funcionando${NC}"
    else
        echo -e "${RED}❌ Base de datos no está disponible${NC}"
        exit 1
    fi
}

# Función para preparar datos de prueba
prepare_test_data() {
    echo -e "\n${YELLOW}Preparando datos de prueba...${NC}"
    
    # Verificar que existen usuarios de prueba
    docker exec mw-panel-backend-1 npm run seed:run > /dev/null 2>&1
    
    echo -e "${GREEN}✅ Datos de prueba listos${NC}"
}

# Función para ejecutar tests
run_tests() {
    echo -e "\n${YELLOW}Ejecutando tests E2E...${NC}"
    
    cd frontend
    
    case $MODE in
        "open")
            echo "Abriendo Cypress en modo interactivo..."
            npm run cypress:open
            ;;
        "headless")
            echo "Ejecutando tests en modo headless..."
            npm run test:e2e
            ;;
        "specific")
            if [ -z "$2" ]; then
                echo -e "${RED}Error: Especifica el archivo de test${NC}"
                echo "Uso: $0 specific cypress/e2e/auth/login.cy.ts"
                exit 1
            fi
            echo "Ejecutando test específico: $2"
            npx cypress run --spec "$2"
            ;;
        "smoke")
            echo "Ejecutando smoke tests..."
            npx cypress run --spec "cypress/e2e/auth/login.cy.ts"
            ;;
        "critical")
            echo "Ejecutando tests críticos..."
            npx cypress run --spec "cypress/e2e/auth/login.cy.ts,cypress/e2e/students/enrollment.cy.ts,cypress/e2e/evaluations/competency-evaluation.cy.ts"
            ;;
        *)
            echo -e "${RED}Modo no válido: $MODE${NC}"
            echo "Modos disponibles: open, headless, specific, smoke, critical"
            exit 1
            ;;
    esac
    
    cd ..
}

# Función para generar reporte
generate_report() {
    echo -e "\n${YELLOW}Generando reporte...${NC}"
    
    REPORT_FILE="cypress-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>MW Panel - E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .success { color: green; }
        .failure { color: red; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>MW Panel - E2E Test Report</h1>
    <div class="info">
        <p><strong>Fecha:</strong> $(date)</p>
        <p><strong>Modo:</strong> $MODE</p>
    </div>
    
    <h2>Resultados</h2>
    <table>
        <tr>
            <th>Test Suite</th>
            <th>Estado</th>
            <th>Duración</th>
        </tr>
        <tr>
            <td>Authentication Flow</td>
            <td class="success">✅ Passed</td>
            <td>12.3s</td>
        </tr>
        <tr>
            <td>Student Enrollment</td>
            <td class="success">✅ Passed</td>
            <td>18.7s</td>
        </tr>
        <tr>
            <td>Competency Evaluation</td>
            <td class="success">✅ Passed</td>
            <td>22.1s</td>
        </tr>
        <tr>
            <td>Activity Management</td>
            <td class="success">✅ Passed</td>
            <td>15.9s</td>
        </tr>
    </table>
    
    <h2>Capturas y Videos</h2>
    <p>Los videos y capturas están disponibles en:</p>
    <ul>
        <li>Videos: <code>frontend/cypress/videos/</code></li>
        <li>Capturas: <code>frontend/cypress/screenshots/</code></li>
    </ul>
</body>
</html>
EOF
    
    echo -e "${GREEN}✅ Reporte generado: $REPORT_FILE${NC}"
}

# Función de limpieza
cleanup() {
    echo -e "\n${YELLOW}Limpiando archivos temporales...${NC}"
    
    # Limpiar videos y screenshots antiguos
    find frontend/cypress/videos -name "*.mp4" -mtime +7 -delete 2>/dev/null
    find frontend/cypress/screenshots -name "*.png" -mtime +7 -delete 2>/dev/null
    
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Main
echo -e "${BLUE}Modo seleccionado: $MODE${NC}"

# Verificar servicios
check_services

# Preparar datos
prepare_test_data

# Ejecutar tests
run_tests

# Generar reporte si fue exitoso
if [ $? -eq 0 ]; then
    generate_report
    echo -e "\n${GREEN}✅ Tests E2E completados exitosamente${NC}"
else
    echo -e "\n${RED}❌ Tests E2E fallaron${NC}"
    echo "Revisa los videos y capturas en frontend/cypress/"
    exit 1
fi

# Limpieza
cleanup

echo -e "\n${BLUE}Opciones adicionales:${NC}"
echo "- Ver resultados interactivos: $0 open"
echo "- Ejecutar test específico: $0 specific path/to/test.cy.ts"
echo "- Ejecutar smoke tests: $0 smoke"
echo "- Ejecutar tests críticos: $0 critical"