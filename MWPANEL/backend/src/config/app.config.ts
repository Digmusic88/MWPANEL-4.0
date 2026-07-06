import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // In production, no defaults for sensitive values
  const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    
    jwt: {
      secret: process.env.JWT_SECRET || (isProd ? undefined : 'dev-only-secret'),
      refreshSecret: process.env.JWT_REFRESH_SECRET || (isProd ? undefined : 'dev-only-refresh-secret'),
      expiresIn: process.env.JWT_EXPIRES_IN || '2h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    
    cors: {
      origin: process.env.CORS_ORIGIN || (isProd ? 'https://plataforma.mundoworld.school' : '*'),
    },
    
    admin: {
      email: process.env.ADMIN_EMAIL || (isProd ? undefined : 'admin@mwpanel.com'),
      password: process.env.ADMIN_PASSWORD || (isProd ? undefined : 'Admin123!'),
    },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  };

  // Validate required fields in production
  if (isProd) {
    const requiredFields = ['jwt.secret', 'jwt.refreshSecret', 'admin.email', 'admin.password'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      const value = field.split('.').reduce((obj, key) => obj?.[key], config);
      if (!value) {
        missingFields.push(field.toUpperCase().replace('.', '_'));
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missingFields.join(', ')}\n` +
        'Please set these variables in your .env file or environment.'
      );
    }
  }

  return config;
});