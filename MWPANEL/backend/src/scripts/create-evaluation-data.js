const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../app.module');

async function createEvaluationData() {
  try {
    console.log('🚀 Iniciando aplicación NestJS...');
    const app = await NestFactory.createApplicationContext(AppModule);

    console.log('📝 Obteniendo servicio de evaluaciones...');
    const evaluationsService = app.get('EvaluationsService');

    console.log('📊 Creando datos de prueba para evaluaciones...');
    const result = await evaluationsService.createTestData();

    console.log('✅ Datos de evaluación creados exitosamente:');
    console.log(JSON.stringify(result, null, 2));

    await app.close();
    console.log('🎉 ¡Proceso completado exitosamente!');
  } catch (error) {
    console.error('❌ Error creando datos de evaluación:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createEvaluationData();