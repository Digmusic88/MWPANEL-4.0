import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete,
  Param, 
  Body, 
  Query, 
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { SharedNotesService } from '../services/shared-notes.service';
import { 
  ShareNoteDto, 
  SharedNotesQueryDto, 
  UpdateSharedNoteDto,
  ClassmateDto,
  StudentTeacherDto,
  SharedNoteResponseDto
} from '../dto/share-note.dto';

@Controller('student-notes/shared')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SharedNotesController {
  constructor(private readonly sharedNotesService: SharedNotesService) {}

  /**
   * Test endpoint para verificar que el controlador funciona
   */
  @Get('test')
  @Public()
  testEndpoint() {
    return {
      message: 'SharedNotesController is working!',
      timestamp: new Date().toISOString(),
      available_endpoints: ['classmates', 'teachers', 'received', 'sent', 'stats']
    };
  }

  /**
   * Obtener compañeros de clase del estudiante actual
   */
  @Get('classmates')
  @Roles(UserRole.STUDENT)
  async getClassmates(@Request() req): Promise<{
    success: boolean;
    data: ClassmateDto[];
    message: string;
  }> {
    const classmates = await this.sharedNotesService.getClassmates(req.user.sub);
    
    return {
      success: true,
      data: classmates,
      message: `Encontrados ${classmates.length} compañeros de clase`,
    };
  }

  /**
   * Obtener profesores del estudiante actual
   */
  @Get('teachers')
  @Roles(UserRole.STUDENT)
  async getStudentTeachers(@Request() req): Promise<{
    success: boolean;
    data: StudentTeacherDto[];
    message: string;
  }> {
    const teachers = await this.sharedNotesService.getStudentTeachers(req.user.sub);
    
    return {
      success: true,
      data: teachers,
      message: `Encontrados ${teachers.length} profesores`,
    };
  }

  /**
   * Compartir un apunte específico
   */
  @Post(':id/share')
  @Roles(UserRole.STUDENT)
  async shareNote(
    @Param('id', ParseUUIDPipe) noteId: string,
    @Body() shareNoteDto: ShareNoteDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const sharedNotes = await this.sharedNotesService.shareNote(
      noteId, 
      req.user.sub, 
      shareNoteDto
    );

    return {
      success: true,
      data: {
        sharedCount: sharedNotes.length,
        sharedWith: sharedNotes.map(sn => ({
          id: sn.id,
          sharedWithId: sn.sharedWithId,
          sharedWithType: sn.sharedWithType,
          message: sn.message,
          sharedAt: sn.sharedAt,
        })),
      },
      message: `Apunte compartido con ${sharedNotes.length} ${
        shareNoteDto.sharedWithType === 'student' ? 'compañeros' : 'profesores'
      }`,
    };
  }

  /**
   * Obtener apuntes compartidos conmigo
   */
  @Get('shared-with-me')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  async getSharedWithMe(
    @Query() query: SharedNotesQueryDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: {
      sharedNotes: SharedNoteResponseDto[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
    message: string;
  }> {
    const result = await this.sharedNotesService.getSharedWithMe(req.user.sub, query);

    return {
      success: true,
      data: {
        sharedNotes: result.sharedNotes,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      message: `Encontrados ${result.total} apuntes compartidos contigo`,
    };
  }

  /**
   * Obtener apuntes que he compartido
   */
  @Get('shared-by-me')
  @Roles(UserRole.STUDENT)
  async getSharedByMe(
    @Query() query: SharedNotesQueryDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: {
      sharedNotes: SharedNoteResponseDto[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
    message: string;
  }> {
    const result = await this.sharedNotesService.getSharedByMe(req.user.sub, query);

    return {
      success: true,
      data: {
        sharedNotes: result.sharedNotes,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      message: `Has compartido ${result.total} apuntes`,
    };
  }

  /**
   * Actualizar un apunte compartido
   */
  @Patch(':id')
  @Roles(UserRole.STUDENT)
  async updateSharedNote(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @Body() updateDto: UpdateSharedNoteDto,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const updatedSharedNote = await this.sharedNotesService.updateSharedNote(
      sharedNoteId, 
      req.user.sub, 
      updateDto
    );

    return {
      success: true,
      data: {
        id: updatedSharedNote.id,
        status: updatedSharedNote.status,
        message: updatedSharedNote.message,
        expiresAt: updatedSharedNote.expiresAt,
        permissions: updatedSharedNote.permissionsObject,
      },
      message: 'Apunte compartido actualizado correctamente',
    };
  }

  /**
   * Revocar acceso a un apunte compartido
   */
  @Delete(':id')
  @Roles(UserRole.STUDENT)
  async revokeSharedNote(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @Request() req,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.sharedNotesService.revokeSharedNote(sharedNoteId, req.user.sub);

    return {
      success: true,
      message: 'Acceso al apunte revocado correctamente',
    };
  }

  /**
   * Registrar acceso a un apunte compartido
   */
  @Post(':id/access')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  async recordAccess(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @Request() req,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.sharedNotesService.recordAccess(sharedNoteId, req.user.sub);

    return {
      success: true,
      message: 'Acceso registrado correctamente',
    };
  }

  /**
   * Obtener detalles de un apunte compartido específico
   */
  @Get(':id/details')
  @Roles(UserRole.STUDENT, UserRole.TEACHER)
  async getSharedNoteDetails(
    @Param('id', ParseUUIDPipe) sharedNoteId: string,
    @Request() req,
  ): Promise<{
    success: boolean;
    data: SharedNoteResponseDto;
    message: string;
  }> {
    // Este endpoint permitiría obtener detalles específicos de un apunte compartido
    // Para implementación futura si es necesario
    throw new Error('Endpoint not implemented yet');
  }
}