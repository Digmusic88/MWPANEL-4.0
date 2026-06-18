import { Controller, Get } from '@nestjs/common';
@Controller('health')
export class HealthController {
  @Get('status')
  status() { return { status: 'OK', service: 'secretaria-api', timestamp: new Date().toISOString() }; }
}
