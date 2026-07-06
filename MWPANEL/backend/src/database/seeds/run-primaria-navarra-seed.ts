import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { seedPrimariaNavarra } from './primaria-navarra.seed';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'mwpanel',
  password: process.env.DB_PASSWORD || 'changeme-strong-password',
  database: process.env.DB_NAME || 'mwpanel',
  // Dos niveles: las entidades viven en modules/ (hermano de database/).
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false, // CRÍTICO: nunca auto-sincronizar el esquema en producción
  logging: false,
});

async function main() {
  await AppDataSource.initialize();
  try {
    await seedPrimariaNavarra(AppDataSource);
    console.log('Primaria Navarra seed completado.');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error('Error en el seed de Primaria Navarra:', e);
  process.exit(1);
});
