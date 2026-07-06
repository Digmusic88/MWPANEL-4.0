import { 
  Controller, 
  Post, 
  Body, 
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Get,
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { EnrollmentService } from './enrollment.service';
import { BulkImportService } from './services/bulk-import.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Inscripción')
@Controller('enrollment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly bulkImportService: BulkImportService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Procesar inscripción de estudiante y familia' })
  @ApiResponse({ status: 201, description: 'Inscripción completada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  async createEnrollment(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    // No volcar el DTO completo: contiene contraseñas en claro. Log solo identificadores no sensibles.
    console.log(
      'Received enrollment for student:',
      createEnrollmentDto?.student?.email ?? '(sin email)',
      '| family primary:',
      createEnrollmentDto?.family?.primaryContact?.email ?? '(sin email)',
    );
    try {
      return await this.enrollmentService.processEnrollment(createEnrollmentDto);
    } catch (error) {
      console.error('Enrollment processing error:', error);
      throw error;
    }
  }

  @Post('test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'SOLO PARA TESTING - Crear inscripción con datos de prueba' })
  @ApiResponse({ status: 201, description: 'Inscripción de prueba creada exitosamente' })
  async createTestEnrollment() {
    console.log('Creating test enrollment with sample data...');
    
    const testData = {
      student: {
        firstName: 'Juan Carlos',
        lastName: 'Pérez González',
        email: 'juan.perez@test.com',
        password: 'password123',
        birthDate: '2010-05-15',
        documentNumber: '12345678A',
        phone: '666123456',
        // enrollmentNumber will be auto-generated
        educationalLevelId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        courseId: null,
        classGroupIds: []
      },
      family: {
        primaryContact: {
          firstName: 'María',
          lastName: 'González López',
          email: 'maria.gonzalez@test.com',
          password: 'password123',
          phone: '666987654',
          documentNumber: '87654321B',
          dateOfBirth: '1985-03-20',
          address: 'Calle Mayor 123, Madrid',
          occupation: 'Enfermera',
        },
        secondaryContact: {
          firstName: 'Carlos',
          lastName: 'Pérez Martín',
          email: 'carlos.perez@test.com',
          password: 'password123',
          phone: '666555444',
          documentNumber: '11223344C',
          dateOfBirth: '1982-08-10',
          address: 'Calle Mayor 123, Madrid',
          occupation: 'Ingeniero',
        },
        relationship: 'mother'
      }
    };

    try {
      console.log('Test data being processed:', JSON.stringify(testData, null, 2));
      return await this.enrollmentService.processEnrollment(testData as any);
    } catch (error) {
      console.error('Test enrollment error:', error);
      throw error;
    }
  }

  @Post('bulk-import')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importación masiva de estudiantes y familias desde archivo Excel/CSV' })
  @ApiResponse({ status: 200, description: 'Archivo procesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en el archivo o datos inválidos' })
  async bulkImport(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    console.log('Processing bulk import file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    try {
      const result = await this.bulkImportService.processBulkImport(file);
      console.log('Bulk import completed:', {
        totalRows: result.totalRows,
        successful: result.successfulImports,
        failed: result.failedImports,
        errorsCount: result.errors.length
      });
      return result;
    } catch (error) {
      console.error('Bulk import error:', error);
      throw error;
    }
  }

  @Get('template')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Descargar plantilla Excel para importación masiva' })
  @ApiResponse({ status: 200, description: 'Plantilla Excel generada exitosamente' })
  async downloadTemplate(@Res() res: Response) {
    try {
      const template = await this.bulkImportService.generateTemplate();
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla_inscripcion_masiva.xlsx"',
        'Content-Length': template.length.toString(),
      });

      res.send(template);
    } catch (error) {
      console.error('Template generation error:', error);
      throw error;
    }
  }

  @Post('bulk-import-simplified')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importación masiva simplificada - Solo datos básicos necesarios' })
  @ApiResponse({ status: 200, description: 'Archivo procesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en el archivo o datos inválidos' })
  async bulkImportSimplified(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    console.log('Processing simplified bulk import file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    try {
      const result = await this.bulkImportService.processSimplifiedBulkImport(file);
      console.log('Simplified bulk import completed:', {
        totalRows: result.totalRows,
        successful: result.successfulImports,
        failed: result.failedImports,
        errorsCount: result.errors.length
      });
      return result;
    } catch (error) {
      console.error('Simplified bulk import error:', error);
      throw error;
    }
  }

  @Get('template-simplified')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Descargar plantilla Excel simplificada para importación con datos reducidos' })
  @ApiResponse({ status: 200, description: 'Plantilla Excel simplificada generada exitosamente' })
  async downloadSimplifiedTemplate(@Res() res: Response) {
    try {
      const template = await this.bulkImportService.generateSimplifiedTemplate();
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla_inscripcion_simplificada.xlsx"',
        'Content-Length': template.length.toString(),
      });

      res.send(template);
    } catch (error) {
      console.error('Simplified template generation error:', error);
      throw error;
    }
  }
}