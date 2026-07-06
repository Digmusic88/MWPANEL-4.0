// Script para crear datos académicos y grupos de clase usando la API
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Primero necesitamos hacer login para obtener un token
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

// Obtener datos existentes
async function getExistingData(token) {
  const config = {
    headers: { 'Authorization': `Bearer ${token}` }
  };

  try {
    console.log('📋 Obteniendo datos existentes...');
    
    // Obtener niveles educativos
    const levelsResponse = await axios.get(`${API_URL}/students`, config);
    console.log('✅ Niveles educativos obtenidos');
    
    // Obtener profesores
    const teachersResponse = await axios.get(`${API_URL}/teachers`, config);
    console.log('✅ Profesores obtenidos:', teachersResponse.data.length);
    
    // Obtener estudiantes
    const studentsResponse = await axios.get(`${API_URL}/students`, config);
    console.log('✅ Estudiantes obtenidos:', studentsResponse.data.length);
    
    return {
      teachers: teachersResponse.data,
      students: studentsResponse.data
    };
  } catch (error) {
    console.error('Error obteniendo datos:', error.response?.data || error.message);
    throw error;
  }
}

// Crear año académico
async function createAcademicYear(token) {
  const academicYearData = {
    name: '2024-2025',
    startDate: '2024-09-01',
    endDate: '2025-06-30',
    isCurrent: true
  };

  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    console.log('📅 Creando año académico...');
    
    // Como no tengo endpoint directo, voy a insertar directamente en BD
    // Por ahora, voy a usar los IDs que necesito manualmente
    console.log('→ Usando año académico por defecto para grupos de clase');
    
    return { id: 'academic-year-2024-2025', name: '2024-2025' };
  } catch (error) {
    console.error('Error creando año académico:', error.response?.data || error.message);
    throw error;
  }
}

// Crear grupos de clase de prueba
async function createClassGroups(token, academicYear, existingData) {
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  // Seleccionar profesores como tutores
  const teachers = existingData.teachers;
  const students = existingData.students;

  const classGroups = [
    {
      name: '3º A Primaria',
      section: 'A',
      academicYearId: academicYear.id,
      courseId: 'primaria-3-course', // Usaremos IDs ficticios por ahora
      tutorId: teachers[0]?.id, // María García
      studentIds: students.slice(0, 3).map(s => s.id) // Primeros 3 estudiantes
    },
    {
      name: '3º B Primaria', 
      section: 'B',
      academicYearId: academicYear.id,
      courseId: 'primaria-3-course',
      tutorId: teachers[1]?.id, // Ana López
      studentIds: students.slice(3, 6).map(s => s.id) // Siguientes 3 estudiantes
    },
    {
      name: '4º A Primaria',
      section: 'A', 
      academicYearId: academicYear.id,
      courseId: 'primaria-4-course',
      tutorId: teachers[2]?.id, // Carlos Ruiz
      studentIds: students.slice(6, 9).map(s => s.id)
    },
    {
      name: '5º A Primaria',
      section: 'A',
      academicYearId: academicYear.id, 
      courseId: 'primaria-5-course',
      tutorId: teachers[3]?.id, // Laura Martínez
      studentIds: students.slice(9, 12).map(s => s.id)
    },
    {
      name: '6º A Primaria',
      section: 'A',
      academicYearId: academicYear.id,
      courseId: 'primaria-6-course', 
      tutorId: teachers[4]?.id, // Diego Fernández
      studentIds: students.slice(12, 15).map(s => s.id)
    }
  ];

  console.log('🏫 Creando grupos de clase...');

  for (const classGroup of classGroups) {
    try {
      // Primero intentamos crear sin datos que faltan para verificar que el backend funciona
      const simpleClassGroup = {
        name: classGroup.name,
        section: classGroup.section
        // Omitimos IDs que no existen por ahora
      };
      
      console.log(`  → Creando: ${classGroup.name}`);
      // Comentamos la creación real hasta tener los endpoints correctos
      // const response = await axios.post(`${API_URL}/class-groups`, simpleClassGroup, config);
      console.log(`  ✓ Grupo ${classGroup.name} preparado para creación`);
      
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`  → Grupo ${classGroup.name} ya existe`);
      } else {
        console.error(`  ✗ Error creando ${classGroup.name}:`, error.response?.data || error.message);
      }
    }
  }

  return classGroups;
}

// Función principal
async function main() {
  try {
    console.log('🔐 Iniciando sesión...');
    const token = await login();
    console.log('✅ Login exitoso');
    
    console.log('\n📊 Obteniendo datos existentes...');
    const existingData = await getExistingData(token);
    
    console.log('\n📅 Configurando año académico...');
    const academicYear = await createAcademicYear(token);
    
    console.log('\n🏫 Preparando grupos de clase...');
    const classGroups = await createClassGroups(token, academicYear, existingData);
    
    console.log('\n✅ ¡Datos preparados exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`  - Profesores disponibles: ${existingData.teachers.length}`);
    console.log(`  - Estudiantes disponibles: ${existingData.students.length}`);
    console.log(`  - Grupos de clase planificados: ${classGroups.length}`);
    
    console.log('\n⚠️  NOTA: Para completar la creación de grupos de clase:');
    console.log('   1. Primero necesitamos reconstruir el backend con el nuevo módulo');
    console.log('   2. Luego crear/verificar los cursos académicos necesarios');
    console.log('   3. Finalmente ejecutar la creación real de grupos de clase');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

main();