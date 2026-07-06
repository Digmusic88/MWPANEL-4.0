import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  // Temporarily skip DATABASE_URL parsing to avoid URL parsing errors
  // Use individual env variables directly
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER || 'mwpanel',
    password: process.env.DB_PASSWORD || 'mwpanel123',
    name: process.env.DB_NAME || 'mwpanel',
  };
});