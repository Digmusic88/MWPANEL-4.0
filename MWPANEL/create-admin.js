// Script para crear usuario admin inicial
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Crear admin user directamente
async function createAdmin() {
  const adminData = {
    email: 'admin@mwpanel.com',
    password: 'Admin123!',
    role: 'admin',
    firstName: 'Administrador',
    lastName: 'del Sistema',
    dateOfBirth: '1980-01-01',
    documentNumber: '00000001A',
    phone: '+34 600 000 001',
    address: 'Dirección Admin',
    isActive: true
  };

  try {
    console.log('🔧 Creando usuario administrador...');
    const response = await axios.post(`${API_URL}/auth/register`, adminData);
    console.log('✅ Admin creado exitosamente:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('→ Usuario admin ya existe');
      return null;
    } else {
      console.error('❌ Error creando admin:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Función principal
async function main() {
  try {
    await createAdmin();
    console.log('🎉 ¡Usuario admin listo!');
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

main();