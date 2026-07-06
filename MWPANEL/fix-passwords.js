const bcrypt = require('bcrypt');

// Script para resetear todas las contraseñas hasheándolas correctamente
// Este script debe ejecutarse dentro del contenedor backend

async function fixPasswords() {
  console.log('🔧 Fixing password hashes...');
  
  // Simulación de lo que haría nuestro fix:
  // 1. Cargar usuarios con problemas de contraseña
  // 2. Rehashear contraseñas usando bcrypt.hash()
  // 3. Actualizar la base de datos
  
  const testPasswords = {
    'test@admin.com': 'admin123',
    'familia1@mwpanel.com': 'familia123',
    'profesor@mwpanel.com': 'profesor123',
    'estudiante@mwpanel.com': 'estudiante123'
  };
  
  console.log('Test passwords to be hashed:');
  for (const [email, password] of Object.entries(testPasswords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${email}: ${password} -> ${hash}`);
  }
}

fixPasswords().catch(console.error);