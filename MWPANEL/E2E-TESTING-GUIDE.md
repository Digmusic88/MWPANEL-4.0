# 🧪 Guía de Tests E2E con Cypress - MW Panel

## 📋 Resumen

Sistema completo de tests end-to-end implementado con Cypress para verificar flujos críticos del sistema MW Panel, incluyendo autenticación, matriculación, evaluaciones y gestión de actividades.

## 🎯 Características Implementadas

1. ✅ **Tests de autenticación multi-rol**
2. ✅ **Tests de matriculación de estudiantes**
3. ✅ **Tests de evaluación por competencias**
4. ✅ **Tests de gestión de actividades**
5. ✅ **Comandos personalizados reutilizables**
6. ✅ **Integración con CI/CD**
7. ✅ **Reportes y grabaciones**
8. ✅ **Tests de rendimiento con Lighthouse**

## 📁 Estructura de Archivos

```
frontend/
├── cypress/
│   ├── e2e/
│   │   ├── auth/
│   │   │   └── login.cy.ts              # Tests de autenticación
│   │   ├── students/
│   │   │   └── enrollment.cy.ts         # Tests de matriculación
│   │   ├── evaluations/
│   │   │   └── competency-evaluation.cy.ts # Tests de evaluaciones
│   │   └── activities/
│   │       └── activity-management.cy.ts   # Tests de actividades
│   ├── fixtures/
│   │   ├── students-import.csv          # Datos para importación
│   │   └── math-exercises.pdf           # Archivo de prueba
│   ├── support/
│   │   ├── commands.ts                  # Comandos personalizados
│   │   ├── e2e.ts                      # Configuración E2E
│   │   └── component.ts                # Configuración componentes
│   └── downloads/                       # Descargas durante tests
│   └── screenshots/                     # Capturas de errores
│   └── videos/                         # Grabaciones de tests
├── cypress.config.ts                    # Configuración principal
└── package.json                        # Scripts de ejecución
```

## 🔧 Instalación y Configuración

### 1. Instalación de Dependencias

```bash
cd frontend
npm install --save-dev cypress @cypress/react @cypress/webpack-dev-server
```

### 2. Variables de Entorno

Las credenciales de prueba están configuradas en `cypress.config.ts`:

```javascript
env: {
  API_URL: 'http://localhost:3000/api',
  ADMIN_EMAIL: 'admin@mwpanel.com',
  ADMIN_PASSWORD: 'admin123',
  TEACHER_EMAIL: 'profesor@mwpanel.com',
  TEACHER_PASSWORD: 'profesor123',
  STUDENT_EMAIL: 'estudiante@mwpanel.com',
  STUDENT_PASSWORD: 'estudiante123',
  FAMILY_EMAIL: 'familia@mwpanel.com',
  FAMILY_PASSWORD: 'familia123',
}
```

## 💻 Ejecución de Tests

### Modo Interactivo (Desarrollo)

```bash
# Abrir Cypress UI
npm run cypress:open

# O usando el script
./scripts/run-e2e-tests.sh open
```

### Modo Headless (CI/CD)

```bash
# Ejecutar todos los tests
npm run test:e2e

# O usando el script
./scripts/run-e2e-tests.sh headless
```

### Tests Específicos

```bash
# Test específico
npx cypress run --spec "cypress/e2e/auth/login.cy.ts"

# Con el script
./scripts/run-e2e-tests.sh specific cypress/e2e/auth/login.cy.ts
```

### Smoke Tests

```bash
# Solo tests críticos de login
./scripts/run-e2e-tests.sh smoke
```

### Tests Críticos

```bash
# Login + Matriculación + Evaluaciones
./scripts/run-e2e-tests.sh critical
```

## 📊 Tests Implementados

### 1. Authentication Flow (`auth/login.cy.ts`)

- ✅ Visualización del formulario de login
- ✅ Validación de campos vacíos
- ✅ Error con credenciales inválidas
- ✅ Login por rol (Admin, Teacher, Student, Family)
- ✅ Logout exitoso
- ✅ Persistencia de sesión
- ✅ Manejo de tokens expirados

### 2. Student Enrollment (`students/enrollment.cy.ts`)

- ✅ Listado de estudiantes
- ✅ Creación de nuevo estudiante
- ✅ Edición de información
- ✅ Asignación a clase
- ✅ Importación masiva CSV
- ✅ Búsqueda y filtros
- ✅ Validación de duplicados
- ✅ Activación/desactivación

### 3. Competency Evaluation (`evaluations/competency-evaluation.cy.ts`)

- ✅ Dashboard de evaluaciones
- ✅ Crear evaluación por competencias
- ✅ Evaluación con rúbrica
- ✅ Gráfico radar de competencias
- ✅ Evaluación masiva
- ✅ Exportación de informes
- ✅ Historial de evaluaciones

### 4. Activity Management (`activities/activity-management.cy.ts`)

- ✅ Dashboard de actividades
- ✅ Crear actividad con archivos
- ✅ Actividad con rúbrica
- ✅ Gestión de entregas
- ✅ Notificaciones
- ✅ Duplicar actividades
- ✅ Archivar completadas
- ✅ Analytics y reportes

## 🛠️ Comandos Personalizados

### Autenticación

```typescript
// Login genérico
cy.login('email@example.com', 'password');

// Login por rol
cy.loginAsAdmin();
cy.loginAsTeacher();
cy.loginAsStudent();
cy.loginAsFamily();

// Logout
cy.logout();
```

### Navegación

```typescript
// Navegar a módulo
cy.navigateToModule('students');
cy.navigateToModule('evaluations');
cy.navigateToModule('activities');
```

### Gestión de Datos

```typescript
// Crear estudiante de prueba
cy.createTestStudent({
  firstName: 'Test',
  lastName: 'Student',
  email: 'test@example.com'
});

// Crear actividad de prueba
cy.createTestActivity({
  title: 'Test Activity',
  type: 'task',
  dueDate: '2024-12-31'
});

// Limpiar datos de prueba
cy.cleanupTestData();
```

### Utilidades

```typescript
// Esperar llamada API
cy.waitForApi('getStudents');

// Subir archivo
cy.get('input[type="file"]').selectFile('path/to/file');
```

## 🚀 Integración CI/CD

### GitHub Actions

El workflow `.github/workflows/e2e-tests.yml` ejecuta:

1. **Setup**: Instala dependencias y prepara entorno
2. **Base de datos**: PostgreSQL y Redis en contenedores
3. **Migraciones**: Ejecuta migraciones y seeds
4. **Servidores**: Inicia backend y frontend
5. **Tests**: Ejecuta Cypress en modo headless
6. **Artifacts**: Guarda videos y capturas
7. **Performance**: Ejecuta Lighthouse (solo en main)

### Ejecución en CI

```yaml
- name: Run Cypress E2E tests
  uses: cypress-io/github-action@v6
  with:
    working-directory: ./frontend
    wait-on: 'http://localhost:5173'
    browser: chrome
```

## 📈 Reportes y Métricas

### Videos y Capturas

- **Videos**: `frontend/cypress/videos/`
- **Screenshots**: `frontend/cypress/screenshots/`
- **Downloads**: `frontend/cypress/downloads/`

### Reporte HTML

El script genera un reporte HTML con:
- Resumen de tests ejecutados
- Tiempos de ejecución
- Enlaces a videos/capturas
- Estado de cada suite

### Métricas de Rendimiento

Lighthouse CI mide:
- Performance Score
- Accessibility Score
- Best Practices Score
- SEO Score

## 🎯 Mejores Prácticas

### 1. Selectores Robustos

```typescript
// ❌ Malo: Selectores frágiles
cy.get('.btn-primary').click();
cy.get('#submit').click();

// ✅ Bueno: Data attributes
cy.get('[data-testid="create-student-btn"]').click();
cy.get('[data-testid="submit-form"]').click();
```

### 2. Esperas Inteligentes

```typescript
// ❌ Malo: Esperas fijas
cy.wait(5000);

// ✅ Bueno: Esperar elementos o APIs
cy.get('[data-testid="students-table"]').should('be.visible');
cy.waitForApi('getStudents');
```

### 3. Limpieza de Datos

```typescript
// Siempre limpiar después de tests
afterEach(() => {
  cy.cleanupTestData();
});
```

### 4. Tests Independientes

```typescript
// Cada test debe poder ejecutarse solo
beforeEach(() => {
  cy.loginAsTeacher();
  cy.navigateToModule('activities');
});
```

## 🐛 Debugging

### Ver Comandos en Consola

```javascript
// En cypress/support/e2e.ts
Cypress.on('window:before:load', (win) => {
  win.console.log = cy.log;
});
```

### Pausar Ejecución

```typescript
// Pausar para debugging
cy.pause();

// O usar debugger
cy.get('button').then(() => {
  debugger;
});
```

### Logs Detallados

```typescript
cy.log('Estado actual:', { 
  url: cy.url(),
  title: cy.title() 
});
```

## 🔍 Troubleshooting

### Tests Fallan en CI pero Pasan Localmente

1. Verificar timeouts más largos en CI
2. Asegurar datos de prueba consistentes
3. Revisar diferencias de entorno

### Elementos No Encontrados

1. Agregar `data-testid` attributes
2. Usar selectores más específicos
3. Aumentar timeouts si necesario

### Videos No Se Generan

1. Verificar `video: true` en config
2. Espacio en disco suficiente
3. Permisos de escritura

## 📝 Checklist de Implementación

- [x] Cypress instalado y configurado
- [x] Estructura de carpetas organizada
- [x] Comandos personalizados
- [x] Tests de autenticación
- [x] Tests de matriculación
- [x] Tests de evaluaciones
- [x] Tests de actividades
- [x] Integración CI/CD
- [x] Scripts de ejecución
- [x] Documentación completa

## 🎉 Conclusión

El sistema de tests E2E está completamente operativo, cubriendo los flujos críticos de MW Panel con tests robustos, mantenibles y automatizados en el pipeline de CI/CD.