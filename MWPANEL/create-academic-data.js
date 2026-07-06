// Script para crear datos académicos básicos necesarios para grupos de clase
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Login function
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'maria.garcia@mwschool.es',
      password: 'password123'
    });
    return response.data.accessToken;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Insert academic data directly into database
async function createAcademicData() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  console.log('🗄️  Creando datos académicos en base de datos...');

  // Create academic year
  const academicYearSQL = `
    INSERT INTO academic_years (id, name, "startDate", "endDate", "isCurrent", "createdAt", "updatedAt")
    VALUES (
      'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 
      '2024-2025',
      '2024-09-01',
      '2025-06-30',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  `;

  // Create cycles for Primaria
  const cyclesSQL = `
    INSERT INTO cycles (id, name, "order", "educationalLevelId", "createdAt", "updatedAt")
    VALUES 
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Primer Ciclo', 1, 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Segundo Ciclo', 2, 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Tercer Ciclo', 3, 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `;

  // Create courses for Primaria
  const coursesSQL = `
    INSERT INTO courses (id, name, "order", "academicYear", "cycleId", "createdAt", "updatedAt")
    VALUES 
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', '1º Primaria', 1, '2024-2025', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', '2º Primaria', 2, '2024-2025', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', '3º Primaria', 3, '2024-2025', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '4º Primaria', 4, '2024-2025', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', '5º Primaria', 5, '2024-2025', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW(), NOW()),
      ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', '6º Primaria', 6, '2024-2025', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    console.log('  📅 Creando año académico 2024-2025...');
    await execPromise(`docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "${academicYearSQL}"`);
    
    console.log('  🔄 Creando ciclos de Primaria...');
    await execPromise(`docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "${cyclesSQL}"`);
    
    console.log('  📚 Creando cursos de Primaria...');
    await execPromise(`docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "${coursesSQL}"`);
    
    console.log('✅ Datos académicos creados exitosamente');
    
    return {
      academicYearId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20',
      courses: [
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', name: '1º Primaria' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', name: '2º Primaria' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', name: '3º Primaria' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', name: '4º Primaria' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', name: '5º Primaria' },
        { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', name: '6º Primaria' },
      ]
    };
  } catch (error) {
    console.error('Error creando datos académicos:', error.message);
    throw error;
  }
}

// Create class groups via API
async function createClassGroups(token, academicData) {
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  console.log('🏫 Creando grupos de clase...');

  // Get existing teachers and students
  const teachersResponse = await axios.get(`${API_URL}/teachers`, config);
  const studentsResponse = await axios.get(`${API_URL}/students`, config);
  
  const teachers = teachersResponse.data;
  const students = studentsResponse.data;

  console.log(`  📊 Profesores disponibles: ${teachers.length}`);
  console.log(`  📊 Estudiantes disponibles: ${students.length}`);

  // Define class groups
  const classGroups = [
    {
      name: '3º A Primaria',
      section: 'A',
      academicYearId: academicData.academicYearId,
      courseId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', // 3º Primaria
      tutorId: teachers[0]?.id, // María García
      studentIds: students.slice(0, Math.min(5, students.length)).map(s => s.id)
    },
    {
      name: '3º B Primaria',
      section: 'B', 
      academicYearId: academicData.academicYearId,
      courseId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', // 3º Primaria
      tutorId: teachers[1]?.id, // Ana López
      studentIds: students.slice(5, Math.min(10, students.length)).map(s => s.id)
    },
    {
      name: '4º A Primaria',
      section: 'A',
      academicYearId: academicData.academicYearId,
      courseId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', // 4º Primaria  
      tutorId: teachers[2]?.id, // Carlos Ruiz
      studentIds: students.slice(10, Math.min(15, students.length)).map(s => s.id)
    },
    {
      name: '5º A Primaria',
      section: 'A',
      academicYearId: academicData.academicYearId,
      courseId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', // 5º Primaria
      tutorId: teachers[3]?.id, // Laura Martínez
      studentIds: students.slice(15, Math.min(20, students.length)).map(s => s.id)
    },
    {
      name: '6º A Primaria',
      section: 'A',
      academicYearId: academicData.academicYearId,
      courseId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', // 6º Primaria
      tutorId: teachers[4]?.id, // Diego Fernández
      studentIds: students.slice(20, Math.min(25, students.length)).map(s => s.id)
    }
  ];

  const createdGroups = [];

  for (const classGroup of classGroups) {
    try {
      console.log(`  → Creando: ${classGroup.name}`);
      const response = await axios.post(`${API_URL}/class-groups`, classGroup, config);
      console.log(`  ✓ Grupo ${classGroup.name} creado exitosamente`);
      createdGroups.push(response.data);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`  → Grupo ${classGroup.name} ya existe`);
      } else {
        console.error(`  ✗ Error creando ${classGroup.name}:`, error.response?.data || error.message);
      }
    }
  }

  return createdGroups;
}

// Main function
async function main() {
  try {
    console.log('🔐 Iniciando sesión...');
    const token = await login();
    console.log('✅ Login exitoso');
    
    console.log('\n🏗️  Creando estructura académica...');
    const academicData = await createAcademicData();
    
    console.log('\n🏫 Creando grupos de clase...');
    const classGroups = await createClassGroups(token, academicData);
    
    console.log('\n🎉 ¡Datos creados exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`  - Año académico: ${academicData.academicYearId}`);
    console.log(`  - Cursos creados: ${academicData.courses.length}`);
    console.log(`  - Grupos de clase creados: ${classGroups.length}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

main();