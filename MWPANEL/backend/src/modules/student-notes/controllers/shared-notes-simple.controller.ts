import { Controller, Get } from '@nestjs/common';

@Controller('student-notes/shared')
export class SharedNotesSimpleController {
  
  @Get('test')
  testEndpoint() {
    return {
      message: 'SharedNotesController is working!',
      timestamp: new Date().toISOString()
    };
  }
}