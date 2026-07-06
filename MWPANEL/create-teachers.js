// Script para crear profesores de prueba usando la API
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Primero necesitamos hacer login para obtener un token
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@mw-school.es',
      password: 'admin123'
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Crear profesores de prueba
async function createTeachers(token) {
  const teachers = [
    {
      employeeNumber: 'EMP001',
      email: 'maria.garcia@mwschool.es',
      password: 'password123',
      firstName: 'María',
      lastName: 'García López',
      dateOfBirth: '1985-05-15',
      documentNumber: '12345678A',
      phone: '+34 666 111 222',
      address: 'Calle Mayor 123, Madrid',
      education: 'Licenciada en Matemáticas, Máster en Educación',
      hireDate: '2020-09-01',
      department: 'Departamento de Ciencias',
      position: 'Profesora Titular',
      specialties: ['Matemáticas', 'Física'],
      isActive: true
    },
    {
      employeeNumber: 'EMP002',
      email: 'ana.lopez@mwschool.es',
      password: 'password123',
      firstName: 'Ana',
      lastName: 'López Martín',
      dateOfBirth: '1982-08-20',
      documentNumber: '23456789B',
      phone: '+34 666 333 444',
      address: 'Avenida de la Paz 45, Madrid',
      education: 'Licenciada en Filología Hispánica',
      hireDate: '2019-09-01',
      department: 'Departamento de Humanidades',
      position: 'Profesora Titular',
      specialties: ['Lengua y Literatura', 'Historia'],
      isActive: true
    },
    {
      employeeNumber: 'EMP003',
      email: 'carlos.ruiz@mwschool.es',
      password: 'password123',
      firstName: 'Carlos',
      lastName: 'Ruiz Sánchez',
      dateOfBirth: '1990-03-10',
      documentNumber: '34567890C',
      phone: '+34 666 555 666',
      address: 'Plaza España 8, Madrid',
      education: 'Licenciado en Ciencias del Deporte',
      hireDate: '2021-09-01',
      department: 'Departamento de Educación Física',
      position: 'Profesor de Educación Física',
      specialties: ['Educación Física', 'Deportes'],
      isActive: true
    },
    {
      employeeNumber: 'EMP004',
      email: 'laura.martinez@mwschool.es',
      password: 'password123',
      firstName: 'Laura',
      lastName: 'Martínez Jiménez',
      dateOfBirth: '1987-11-25',
      documentNumber: '45678901D',
      phone: '+34 666 777 888',
      address: 'Calle Serrano 67, Madrid',
      education: 'Licenciada en Biología, Máster en Educación Ambiental',
      hireDate: '2018-09-01',
      department: 'Departamento de Ciencias',
      position: 'Profesora de Ciencias Naturales',
      specialties: ['Biología', 'Ciencias Naturales'],
      isActive: true
    },
    {
      employeeNumber: 'EMP005',
      email: 'diego.fernandez@mwschool.es',
      password: 'password123',
      firstName: 'Diego',
      lastName: 'Fernández Romero',
      dateOfBirth: '1984-07-12',
      documentNumber: '56789012E',
      phone: '+34 666 999 000',
      address: 'Calle Alcalá 234, Madrid',
      education: 'Licenciado en Geografía e Historia',
      hireDate: '2017-09-01',
      department: 'Departamento de Humanidades',
      position: 'Profesor de Historia',
      specialties: ['Historia', 'Geografía'],
      isActive: true
    }
  ];

  const config = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  for (const teacher of teachers) {
    try {
      const response = await axios.post(`${API_URL}/teachers`, teacher, config);
      console.log(`✓ Profesor creado: ${teacher.firstName} ${teacher.lastName} (${teacher.employeeNumber})`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`→ Profesor ya existe: ${teacher.firstName} ${teacher.lastName}`);
      } else {
        console.error(`✗ Error creando profesor ${teacher.firstName} ${teacher.lastName}:`, error.response?.data || error.message);
      }
    }
  }
}

// Función principal
async function main() {
  try {
    console.log('🔐 Iniciando sesión...');
    const token = await login();
    console.log('✅ Login exitoso');
    
    console.log('\n👨‍🏫 Creando profesores...');
    await createTeachers(token);
    
    console.log('\n🎉 ¡Profesores creados exitosamente!');
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

main();