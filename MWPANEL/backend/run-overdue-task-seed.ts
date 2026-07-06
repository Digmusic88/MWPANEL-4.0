/**
 * Script para ejecutar el seed de la plantilla de tareas vencidas
 */

import { DataSource } from 'typeorm';
import { databaseConfig } from './src/database/data-source';
import { seedOverdueTaskTemplate } from './src/database/seeds/overdue-task-template.seed';

async function runSeed() {
  console.log('🌱 Iniciando seed de plantilla de tareas vencidas...');
  
  const dataSource = new DataSource(databaseConfig);
  
  try {
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');
    
    await seedOverdueTaskTemplate(dataSource);
    console.log('✅ Seed de plantilla de tareas vencidas completado');
    
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Conexión a base de datos cerrada');
  }
}

runSeed();