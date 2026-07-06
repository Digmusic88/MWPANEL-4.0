// Script para crear un usuario admin temporal para gestión de grupos de clase
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function createAdminUser() {
  // Crear usuario admin directamente en la base de datos
  const userSQL = `
    INSERT INTO users (id, email, "passwordHash", role, "isActive") 
    VALUES (
      'admin-class-groups-2024', 
      'admin.classgroups@mwschool.es',
      '$2b$10$qXpHeJoSenaGix7k3nbI5.VhcApwae50IjvrUXQWSBkodDbQJyin.',
      'admin',
      true
    ) 
    ON CONFLICT (email) DO NOTHING;
  `;

  // Crear perfil para el admin
  const profileSQL = `
    INSERT INTO user_profiles (id, "firstName", "lastName", phone, dni, "userId") 
    VALUES (
      'profile-admin-class-groups-2024',
      'Admin',
      'Grupos de Clase',
      '+34 600 000 000',
      '00000000X',
      'admin-class-groups-2024'
    )
    ON CONFLICT ("userId") DO NOTHING;
  `;

  try {
    console.log('🔐 Creando usuario administrador temporal...');
    
    await execPromise(`docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "${userSQL}"`);
    console.log('✅ Usuario admin creado');
    
    await execPromise(`docker-compose exec -T postgres psql -U mwpanel -d mwpanel -c "${profileSQL}"`);
    console.log('✅ Perfil admin creado');
    
    console.log('\n📋 Credenciales del admin:');
    console.log('  Email: admin.classgroups@mwschool.es');
    console.log('  Password: password123');
    
    return {
      email: 'admin.classgroups@mwschool.es',
      password: 'password123'
    };
    
  } catch (error) {
    console.error('Error creando admin:', error.message);
    throw error;
  }
}

createAdminUser().then(() => {
  console.log('🎉 Admin creado exitosamente');
}).catch(error => {
  console.error('❌ Error:', error.message);
});