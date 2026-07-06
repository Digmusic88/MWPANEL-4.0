import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const databaseConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'mwpanel',
  password: process.env.DB_PASSWORD || 'changeme-strong-password',
  database: process.env.DB_NAME || 'mwpanel',
  entities: process.env.NODE_ENV === 'production' ? ['dist/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrations: process.env.NODE_ENV === 'production' ? ['dist/database/migrations/*.js'] : ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

export const AppDataSource = new DataSource(databaseConfig);