import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Res,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { BulkResendCredentialsDto } from './dto/bulk-resend-credentials.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CredentialsPDFService } from '../users/services/credentials-pdf.service';

@ApiTags('Familias')
@Controller('families')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FamiliesController {
  constructor(
    private readonly familiesService: FamiliesService,
    private readonly credentialsPDFService: CredentialsPDFService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva familia' })
  @ApiResponse({ status: 201, description: 'Familia creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  create(@Body() createFamilyDto: CreateFamilyDto) {
    return this.familiesService.create(createFamilyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener todas las familias' })
  @ApiResponse({ status: 200, description: 'Lista de familias' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    const includeInactiveBool = includeInactive === 'true';
    return this.familiesService.findAll(includeInactiveBool);
  }

  @Get('available-students')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estudiantes disponibles para asignar a familias' })
  @ApiResponse({ status: 200, description: 'Lista de estudiantes disponibles' })
  getAvailableStudents() {
    return this.familiesService.getAvailableStudents();
  }

  @Get('dashboard/my-family')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener datos del dashboard para la familia logueada' })
  @ApiResponse({ status: 200, description: 'Datos del dashboard familiar' })
  getMyFamilyDashboard(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.familiesService.getFamilyDashboard(userId);
  }

  @Get('my-children')
  @Roles(UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener los hijos de la familia logueada para actividades' })
  @ApiResponse({ status: 200, description: 'Lista de hijos de la familia' })
  getMyChildren(@Request() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.familiesService.getMyChildren(userId);
  }



  @Post(':id/resend-credentials/:contactType')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reenviar credenciales a contacto familiar',
    description: 'Reenvía las credenciales de acceso por correo electrónico al contacto familiar especificado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Credenciales reenviadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Credenciales reenviadas exitosamente' },
        email: { type: 'string', example: 'padre@ejemplo.com' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Familia o contacto no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async resendCredentials(
    @Param('id') familyId: string,
    @Param('contactType') contactType: 'primary' | 'secondary',
    @Request() req: any
  ) {
    try {
      const currentUserId = req.user?.sub || req.user?.userId || req.user?.id;
      await this.familiesService.resendCredentials(familyId, contactType, currentUserId);
      
      // Obtener la familia para devolver el email al que se envió
      const family = await this.familiesService.findOne(familyId);
      const contact = contactType === 'primary' ? family.primaryContact : family.secondaryContact;
      
      return {
        message: 'Credenciales reenviadas exitosamente',
        email: contact?.email || '',
        contactType
      };
    } catch (error) {
      console.error(`Error reenviando credenciales:`, error);
      throw error;
    }
  }

  @Post('bulk-resend-credentials')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reenviar credenciales de forma masiva',
    description: 'Reenvía las credenciales de acceso por correo electrónico a múltiples contactos familiares seleccionados'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Proceso de envío masivo completado',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Envío masivo completado' },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            successful: { type: 'number', example: 4 },
            failed: { type: 'number', example: 1 }
          }
        },
        success: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              familyId: { type: 'string', example: 'uuid' },
              contactType: { type: 'string', example: 'primary' },
              email: { type: 'string', example: 'padre@email.com' }
            }
          }
        },
        failures: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              familyId: { type: 'string', example: 'uuid' },
              contactType: { type: 'string', example: 'primary' },
              email: { type: 'string', example: 'padre@email.com' },
              error: { type: 'string', example: 'Email no válido' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async bulkResendCredentials(
    @Body() bulkResendDto: BulkResendCredentialsDto,
    @Request() req: any
  ) {
    try {
      const currentUserId = req.user?.sub || req.user?.userId || req.user?.id;
      
      const result = await this.familiesService.bulkResendCredentials(
        bulkResendDto.familyContacts,
        currentUserId
      );

      return {
        message: 'Envío masivo completado',
        summary: result.summary,
        success: result.success,
        failures: result.failures
      };
    } catch (error) {
      console.error(`Error en envío masivo de credenciales:`, error);
      throw error;
    }
  }

  @Get('children/:familyId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener los hijos de una familia específica (para admins y profesores)' })
  @ApiResponse({ status: 200, description: 'Lista de hijos de la familia' })
  getFamilyChildren(@Param('familyId') familyId: string) {
    return this.familiesService.getMyChildren(familyId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener una familia por ID' })
  @ApiResponse({ status: 200, description: 'Datos de la familia' })
  @ApiResponse({ status: 404, description: 'Familia no encontrada' })
  findOne(@Param('id') id: string) {
    return this.familiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar una familia' })
  @ApiResponse({ status: 200, description: 'Familia actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Familia no encontrada' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  update(@Param('id') id: string, @Body() updateFamilyDto: UpdateFamilyDto) {
    return this.familiesService.update(id, updateFamilyDto);
  }

  @Get('credentials/download')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generar y descargar PDF con credenciales de familias' })
  @ApiResponse({ 
    status: 200, 
    description: 'PDF con credenciales generado exitosamente',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="credenciales_familias.pdf"' }
    }
  })
  async downloadFamiliesCredentials(
    @Res() res: Response,
    @Query('includeInactive') includeInactive?: string
  ) {
    try {
      const includeInactiveUsers = includeInactive === 'true';
      
      const result = await this.credentialsPDFService.generateCredentialsPDF({
        role: UserRole.FAMILY,
        includeInactiveUsers
      });

      // Configurar headers para descarga del PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.size);

      // Enviar el archivo
      res.sendFile(result.filePath, (error) => {
        if (error) {
          console.error('Error sending PDF file:', error);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error al enviar el archivo PDF' });
          }
        } else {
          // Limpiar archivo después de enviarlo (opcional)
          setTimeout(() => {
            try {
              require('fs').unlinkSync(result.filePath);
            } catch (cleanupError) {
              console.warn('Could not clean up PDF file:', cleanupError);
            }
          }, 5000);
        }
      });
    } catch (error) {
      console.error('Error generating families credentials PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          message: 'Error al generar PDF de credenciales',
          error: error.message 
        });
      }
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una familia (soft delete)' })
  @ApiResponse({ status: 204, description: 'Familia eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Familia no encontrada' })
  remove(@Param('id') id: string) {
    return this.familiesService.remove(id);
  }

}