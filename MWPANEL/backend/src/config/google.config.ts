import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export default registerAs('google', () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Try to load credentials from file or environment
  let credentials = null;
  
  // First, try environment variable (recommended for production)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    } catch (error) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS from environment');
    }
  }
  
  // Then, try file (development and production)
  if (!credentials) {
    const credentialsPaths = [
      '/app/google-credentials.json', // Production container path
      path.join(process.cwd(), 'google-credentials.json'), // Development path
      path.join(__dirname, '../../../google-credentials.json') // Alternative path
    ];
    
    for (const credentialsPath of credentialsPaths) {
      if (fs.existsSync(credentialsPath)) {
        try {
          const fileContent = fs.readFileSync(credentialsPath, 'utf8');
          credentials = JSON.parse(fileContent);
          console.log(`✅ Google credentials loaded from: ${credentialsPath}`);
          break;
        } catch (error) {
          console.error(`Failed to read google-credentials.json file from ${credentialsPath}:`, error);
        }
      }
    }
  }
  
  // Validate credentials structure
  if (credentials && (!credentials.client_email || !credentials.private_key)) {
    console.error('Invalid Google credentials structure');
    credentials = null;
  }
  
  // In production, credentials are required
  if (isProd && !credentials) {
    console.error(
      'Google Service Account credentials not found in production!\n' +
      'Please set GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable with the JSON content.'
    );
  }
  
  return {
    credentials,
    sharedDriveName: process.env.GOOGLE_SHARED_DRIVE_NAME || '12. Plataforma (Recursos dicácticos compartidos)',
    enabled: !!credentials,
  };
});