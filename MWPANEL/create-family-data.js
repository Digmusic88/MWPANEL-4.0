const axios = require('axios');

async function createFamilyTestData() {
  console.log('🔧 CREAR DATOS DE PRUEBA PARA FAMILIAS');
  console.log('======================================');
  
  console.log('🎯 OBJETIVO: Crear una familia con estudiantes y tareas para probar alertas');
  console.log('');
  
  // Para crear datos de prueba, necesitaríamos:
  console.log('📋 PASOS NECESARIOS:');
  console.log('1. Crear un registro en la tabla "families"');
  console.log('2. Asociar usuarios family como primaryContact');
  console.log('3. Crear estudiantes con familyId válido');
  console.log('4. Asignar tareas a esos estudiantes');
  console.log('5. Dejar algunas tareas sin entregar y vencidas');
  
  console.log('\n🔍 ANÁLISIS DEL PROBLEMA:');
  console.log('=========================');
  console.log('✅ Sistema de alertas funcionando (API responde correctamente)');
  console.log('✅ Autenticación family funcionando');
  console.log('❌ No hay registros en tabla families');
  console.log('❌ No hay estudiantes asociados a familias');
  console.log('❌ No hay tareas para generar alertas');
  
  console.log('\n💡 SOLUCIONES POSIBLES:');
  console.log('======================');
  console.log('');
  console.log('OPCIÓN 1: Crear datos de prueba manualmente');
  console.log('- Crear familia en DB');
  console.log('- Asociar estudiantes existentes');
  console.log('- Crear tareas vencidas');
  console.log('');
  console.log('OPCIÓN 2: Usar datos existentes');
  console.log('- Buscar estudiantes sin familia asociada');
  console.log('- Crear familia y asociarlos');
  console.log('- Usar tareas existentes');
  console.log('');
  console.log('OPCIÓN 3: Verificar si hay datos pero mal asociados');
  console.log('- Revisar relaciones entre usuarios family y registros families');
  console.log('- Corregir primaryContactId/secondaryContactId');
  
  // Intentar un enfoque simple: verificar si hay estudiantes en el sistema
  console.log('\n🔍 Intentando verificar estudiantes mediante login teacher...');
  
  try {
    const teacherLogin = await axios.post('https://plataforma.mundoworld.school/api/auth/login', {
      email: 'profesor@mwpanel.com',
      password: 'profesor123'
    });
    
    const token = teacherLogin.data.accessToken;
    console.log('✅ Teacher login exitoso');
    
    // Intentar obtener estudiantes desde perspectiva teacher
    try {
      const studentsResponse = await axios.get('https://plataforma.mundoworld.school/api/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📚 Total estudiantes en sistema:', studentsResponse.data.length);
      
      if (studentsResponse.data.length > 0) {
        console.log('\n👶 ESTUDIANTES ENCONTRADOS:');
        studentsResponse.data.slice(0, 5).forEach((student, index) => {
          console.log(`${index + 1}. ${student.firstName || 'Sin nombre'} ${student.lastName || ''}`);
          console.log(`   ID: ${student.id}`);
          console.log(`   Family ID: ${student.familyId || 'SIN FAMILIA'}`);
          console.log(`   Class Group: ${student.classGroup?.name || 'Sin clase'}`);
          console.log('');
        });
        
        // Contar estudiantes sin familia
        const studentsWithoutFamily = studentsResponse.data.filter(s => !s.familyId);
        console.log(`🔍 Estudiantes SIN familia: ${studentsWithoutFamily.length}`);
        console.log(`👪 Estudiantes CON familia: ${studentsResponse.data.length - studentsWithoutFamily.length}`);
        
        if (studentsWithoutFamily.length > 0) {
          console.log('\n💡 RECOMENDACIÓN:');
          console.log('Podemos crear una familia y asociar estudiantes existentes');
          console.log('Esto permitirá probar el sistema de alertas con datos reales');
        }
      } else {
        console.log('❌ No hay estudiantes en el sistema');
        console.log('💡 Necesitamos crear estudiantes antes de poder probar alertas');
      }
      
    } catch (studentsError) {
      console.log('❌ Error obteniendo estudiantes:', studentsError.response?.status, studentsError.response?.statusText);
    }
    
  } catch (teacherError) {
    console.log('❌ Error login teacher:', teacherError.response?.status, teacherError.response?.statusText);
  }
  
  console.log('\n🎯 PRÓXIMO PASO RECOMENDADO:');
  console.log('============================');
  console.log('1. Crear un script que genere datos de familia válidos');
  console.log('2. Asociar estudiantes existentes a la familia');
  console.log('3. Crear tareas vencidas para probar alertas');
  console.log('4. Verificar que el sistema de alertas detecte los problemas');
}

createFamilyTestData();