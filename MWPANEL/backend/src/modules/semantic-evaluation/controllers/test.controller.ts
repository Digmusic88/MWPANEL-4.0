import { Controller, Get } from '@nestjs/common';

@Controller('semantic-test')
export class SemanticTestController {
  @Get('ping')
  ping(): { message: string } {
    return { message: 'Semantic module is working!' };
  }

  @Get('health')
  health(): { status: string; timestamp: string } {
    return { 
      status: 'OK', 
      timestamp: new Date().toISOString() 
    };
  }
}