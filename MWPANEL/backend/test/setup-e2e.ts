// E2E Test setup
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// Aumentar timeout para E2E tests
jest.setTimeout(60000);

// Configuración de base de datos de test
process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
process.env.DATABASE_USER = 'mwpanel_test';
process.env.DATABASE_PASSWORD = 'mwpanel_test';
process.env.DATABASE_NAME = 'mwpanel_test';

// Limpiar base de datos antes de cada test suite
let dataSource: DataSource;

beforeAll(async () => {
  // Configurar conexión a base de datos de test
  dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: true,
    dropSchema: true,
    entities: ['src/**/*.entity.ts'],
  });

  await dataSource.initialize();
});

afterAll(async () => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
});