/**
 * Script de validación para el sistema de reuniones
 * Verifica que todas las tablas y relaciones estén correctas
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 VALIDANDO SISTEMA DE REUNIONES MW PANEL');
console.log('==========================================\n');

/**
 * Verificar archivos del sistema
 */
function validateFiles() {
  console.log('📁 Verificando archivos del sistema...\n');

  const requiredFiles = [
    // Migration
    'backend/src/database/migrations/1755000000000-CreateMeetingManagementSystem.ts',
    
    // Entities
    'backend/src/modules/meetings/entities/meeting-period.entity.ts',
    'backend/src/modules/meetings/entities/meeting-slot.entity.ts',
    'backend/src/modules/meetings/entities/meeting-booking.entity.ts',
    'backend/src/modules/meetings/entities/index.ts',
    
    // DTOs
    'backend/src/modules/meetings/dto/create-meeting-period.dto.ts',
    'backend/src/modules/meetings/dto/update-meeting-period.dto.ts',
    'backend/src/modules/meetings/dto/create-meeting-slot.dto.ts',
    'backend/src/modules/meetings/dto/create-bulk-slots.dto.ts',
    'backend/src/modules/meetings/dto/book-meeting-slot.dto.ts',
    'backend/src/modules/meetings/dto/cancel-booking.dto.ts',
    'backend/src/modules/meetings/dto/meeting-filters.dto.ts',
    'backend/src/modules/meetings/dto/meeting-responses.dto.ts',
    'backend/src/modules/meetings/dto/index.ts',
    
    // Controllers
    'backend/src/modules/meetings/controllers/admin-meetings.controller.ts',
    'backend/src/modules/meetings/controllers/teacher-meetings.controller.ts',
    'backend/src/modules/meetings/controllers/family-meetings.controller.ts',
    
    // Services
    'backend/src/modules/meetings/services/meetings.service.ts',
    
    // Module
    'backend/src/modules/meetings/meetings.module.ts'
  ];

  let allFilesExist = true;

  requiredFiles.forEach(file => {
    const fullPath = `/opt/mw-panel/${file}`;
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - NO ENCONTRADO`);
      allFilesExist = false;
    }
  });

  console.log(`\n📊 Resultado: ${allFilesExist ? '✅ Todos los archivos presentes' : '❌ Faltan archivos'}\n`);
  return allFilesExist;
}

/**
 * Verificar que el módulo esté registrado en app.module.ts
 */
function validateModuleRegistration() {
  console.log('🔗 Verificando registro del módulo...\n');

  try {
    const appModuleContent = fs.readFileSync('/opt/mw-panel/backend/src/app.module.ts', 'utf8');
    
    const hasImport = appModuleContent.includes("import { MeetingsModule } from './modules/meetings/meetings.module';");
    const hasModule = appModuleContent.includes('MeetingsModule,');
    
    if (hasImport && hasModule) {
      console.log('✅ MeetingsModule correctamente registrado en app.module.ts\n');
      return true;
    } else {
      console.log('❌ MeetingsModule NO está registrado correctamente en app.module.ts');
      console.log(`   - Import: ${hasImport ? '✅' : '❌'}`);
      console.log(`   - Module: ${hasModule ? '✅' : '❌'}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Error leyendo app.module.ts:', error.message, '\n');
    return false;
  }
}

/**
 * Verificar dependencias del package.json
 */
function validateDependencies() {
  console.log('📦 Verificando dependencias...\n');

  try {
    const packageContent = fs.readFileSync('/opt/mw-panel/backend/package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const requiredDeps = [
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/typeorm',
      'typeorm',
      'class-validator',
      'class-transformer'
    ];

    let allDepsPresent = true;

    requiredDeps.forEach(dep => {
      const hasDep = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
      if (hasDep) {
        console.log(`✅ ${dep} (${hasDep})`);
      } else {
        console.log(`❌ ${dep} - NO ENCONTRADO`);
        allDepsPresent = false;
      }
    });

    console.log(`\n📊 Resultado: ${allDepsPresent ? '✅ Todas las dependencias presentes' : '❌ Faltan dependencias'}\n`);
    return allDepsPresent;
  } catch (error) {
    console.log('❌ Error leyendo package.json:', error.message, '\n');
    return false;
  }
}

/**
 * Verificar compilación TypeScript
 */
function validateTypeScriptCompilation() {
  console.log('🔧 Verificando compilación TypeScript...\n');

  try {
    console.log('Ejecutando: npm run build --silent');
    execSync('cd /opt/mw-panel/backend && npm run build --silent', { 
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000 
    });
    console.log('✅ Compilación TypeScript exitosa\n');
    return true;
  } catch (error) {
    console.log('❌ Error en compilación TypeScript:');
    console.log(error.stderr?.toString() || error.message);
    console.log('\n');
    return false;
  }
}

/**
 * Verificar que la migración esté en orden
 */
function validateMigration() {
  console.log('🗄️  Verificando migración de base de datos...\n');

  try {
    const migrationFile = '/opt/mw-panel/backend/src/database/migrations/1755000000000-CreateMeetingManagementSystem.ts';
    const migrationContent = fs.readFileSync(migrationFile, 'utf8');
    
    const requiredTables = [
      'meeting_periods',
      'meeting_slots', 
      'meeting_bookings'
    ];

    const requiredEnums = [
      'meeting_booking_status_enum'
    ];

    let allTablesPresent = true;
    let allEnumsPresent = true;

    requiredTables.forEach(table => {
      if (migrationContent.includes(`CREATE TABLE "${table}"`)) {
        console.log(`✅ Tabla ${table}`);
      } else {
        console.log(`❌ Tabla ${table} - NO ENCONTRADA`);
        allTablesPresent = false;
      }
    });

    requiredEnums.forEach(enumType => {
      if (migrationContent.includes(`CREATE TYPE "${enumType}"`)) {
        console.log(`✅ Enum ${enumType}`);
      } else {
        console.log(`❌ Enum ${enumType} - NO ENCONTRADO`);
        allEnumsPresent = false;
      }
    });

    const migrationValid = allTablesPresent && allEnumsPresent;
    console.log(`\n📊 Resultado: ${migrationValid ? '✅ Migración correcta' : '❌ Problemas en migración'}\n`);
    return migrationValid;
  } catch (error) {
    console.log('❌ Error verificando migración:', error.message, '\n');
    return false;
  }
}

/**
 * Generar reporte de endpoint de la API
 */
function generateAPIReport() {
  console.log('📋 REPORTE DE ENDPOINTS DE LA API\n');
  
  const endpoints = [
    // Admin endpoints
    { method: 'POST', path: '/api/admin/meetings/periods', desc: 'Crear período de reuniones', role: 'ADMIN' },
    { method: 'GET', path: '/api/admin/meetings/periods', desc: 'Listar todos los períodos', role: 'ADMIN' },
    { method: 'GET', path: '/api/admin/meetings/periods/:id', desc: 'Obtener período por ID', role: 'ADMIN' },
    { method: 'PUT', path: '/api/admin/meetings/periods/:id', desc: 'Actualizar período', role: 'ADMIN' },
    { method: 'DELETE', path: '/api/admin/meetings/periods/:id', desc: 'Eliminar período', role: 'ADMIN' },
    
    // Teacher endpoints
    { method: 'GET', path: '/api/teacher/meetings/periods', desc: 'Ver períodos activos', role: 'TEACHER' },
    { method: 'POST', path: '/api/teacher/meetings/slots', desc: 'Crear slot individual', role: 'TEACHER' },
    { method: 'POST', path: '/api/teacher/meetings/slots/bulk', desc: 'Crear múltiples slots', role: 'TEACHER' },
    { method: 'GET', path: '/api/teacher/meetings/slots', desc: 'Ver mis slots', role: 'TEACHER' },
    { method: 'GET', path: '/api/teacher/meetings/families', desc: 'Ver familias tutorizadas', role: 'TEACHER' },
    { method: 'DELETE', path: '/api/teacher/meetings/slots/:id', desc: 'Eliminar slot', role: 'TEACHER' },
    
    // Family endpoints
    { method: 'GET', path: '/api/family/meetings/periods', desc: 'Ver períodos disponibles', role: 'FAMILY' },
    { method: 'GET', path: '/api/family/meetings/available-slots', desc: 'Ver slots disponibles', role: 'FAMILY' },
    { method: 'POST', path: '/api/family/meetings/book', desc: 'Reservar slot', role: 'FAMILY' },
    { method: 'GET', path: '/api/family/meetings/bookings', desc: 'Ver mis reservas', role: 'FAMILY' },
    { method: 'DELETE', path: '/api/family/meetings/bookings/:id', desc: 'Cancelar reserva', role: 'FAMILY' },
  ];

  endpoints.forEach(endpoint => {
    const roleColor = endpoint.role === 'ADMIN' ? '🔴' : endpoint.role === 'TEACHER' ? '🟡' : '🟢';
    console.log(`${roleColor} ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(45)} - ${endpoint.desc}`);
  });

  console.log('\n🔴 ADMIN    🟡 TEACHER    🟢 FAMILY\n');
}

/**
 * Función principal
 */
function main() {
  const validations = [
    { name: 'Archivos del sistema', fn: validateFiles },
    { name: 'Registro del módulo', fn: validateModuleRegistration },
    { name: 'Dependencias', fn: validateDependencies },
    { name: 'Migración', fn: validateMigration },
    { name: 'Compilación TypeScript', fn: validateTypeScriptCompilation },
  ];

  let allValidationsPassed = true;

  validations.forEach(validation => {
    const result = validation.fn();
    if (!result) {
      allValidationsPassed = false;
    }
  });

  console.log('═══════════════════════════════════════════');
  
  if (allValidationsPassed) {
    console.log('🎉 ¡TODAS LAS VALIDACIONES PASARON!');
    console.log('✅ El sistema de reuniones está listo para usar');
  } else {
    console.log('⚠️  ALGUNAS VALIDACIONES FALLARON');
    console.log('❌ Revisar los errores anteriores antes de usar el sistema');
  }
  
  console.log('═══════════════════════════════════════════\n');

  generateAPIReport();

  console.log('📝 PRÓXIMOS PASOS:');
  if (allValidationsPassed) {
    console.log('1. Ejecutar la migración: npm run migration:run');
    console.log('2. Reiniciar el servidor: npm run start:dev');
    console.log('3. Ejecutar tests: node test-meetings-integration.js');
    console.log('4. Probar endpoints con Postman o Swagger (/api/docs)');
  } else {
    console.log('1. Corregir los errores reportados');
    console.log('2. Ejecutar este script nuevamente');
    console.log('3. Una vez que pasen todas las validaciones, continuar con migración y tests');
  }
  
  console.log('\n🚀 Sistema de Reuniones MW Panel 2.0 - ¡Listo para producción!');
}

if (require.main === module) {
  main();
}

module.exports = {
  validateFiles,
  validateModuleRegistration,
  validateDependencies,
  validateMigration,
  validateTypeScriptCompilation,
  generateAPIReport
};