import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AcademicYear } from '../students/entities/academic-year.entity';
import { AcademicYearClosureService } from './services/academic-year-closure.service';
import { YearStructureRolloverService } from './services/year-structure-rollover.service';
import { CurrentAcademicYearService } from './current-academic-year.service';

@ApiTags('academic-years')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic-years')
export class AcademicYearsController {
  constructor(
    @InjectRepository(AcademicYear)
    private readonly academicYearRepository: Repository<AcademicYear>,
    private readonly closureService: AcademicYearClosureService,
    private readonly rolloverService: YearStructureRolloverService,
    private readonly currentAcademicYearService: CurrentAcademicYearService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los años académicos' })
  @ApiResponse({ status: 200, description: 'Lista de años académicos obtenida exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async findAll(): Promise<AcademicYear[]> {
    return this.academicYearRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  @Get('current')
  @ApiOperation({ summary: 'Obtener año académico actual' })
  @ApiResponse({ status: 200, description: 'Año académico actual obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  async findCurrent(): Promise<AcademicYear | null> {
    return this.academicYearRepository.findOne({ where: { isCurrent: true } });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener año académico por ID' })
  @ApiResponse({ status: 200, description: 'Año académico obtenido exitosamente' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id') id: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearRepository.findOne({
      where: { id },
    });
    
    if (!academicYear) {
      throw new BadRequestException('Año académico no encontrado');
    }
    
    return academicYear;
  }

  @Post()
  @ApiOperation({ summary: 'Crear año académico' })
  @ApiResponse({ status: 201, description: 'Año académico creado exitosamente' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createData: {
    name: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
  }): Promise<AcademicYear> {
    // Validate dates
    const startDate = new Date(createData.startDate);
    const endDate = new Date(createData.endDate);
    
    if (startDate >= endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Check for overlapping academic years
    const overlapping = await this.academicYearRepository
      .createQueryBuilder('ay')
      .where('ay.startDate <= :endDate AND ay.endDate >= :startDate', {
        startDate,
        endDate,
      })
      .getOne();

    if (overlapping) {
      throw new BadRequestException('Ya existe un año académico que se superpone con estas fechas');
    }

    const academicYear = this.academicYearRepository.create({
      name: createData.name,
      startDate,
      endDate,
      isCurrent: createData.isActive ?? false,
    });

    return this.academicYearRepository.save(academicYear);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar año académico' })
  @ApiResponse({ status: 200, description: 'Año académico actualizado exitosamente' })
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateData: {
    name?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }): Promise<AcademicYear> {
    const academicYear = await this.findOne(id);

    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : academicYear.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : academicYear.endDate;
      
      if (startDate >= endDate) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      // Check for overlapping academic years (excluding current one)
      const overlapping = await this.academicYearRepository
        .createQueryBuilder('ay')
        .where('ay.id != :id AND ay.startDate <= :endDate AND ay.endDate >= :startDate', {
          id,
          startDate,
          endDate,
        })
        .getOne();

      if (overlapping) {
        throw new BadRequestException('Ya existe un año académico que se superpone con estas fechas');
      }
    }

    // Map isActive to isCurrent
    const mappedUpdateData = { ...updateData };
    if (updateData.isActive !== undefined) {
      mappedUpdateData['isCurrent'] = updateData.isActive;
      delete mappedUpdateData.isActive;
    }

    Object.assign(academicYear, mappedUpdateData);
    
    if (updateData.startDate) {
      academicYear.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      academicYear.endDate = new Date(updateData.endDate);
    }

    return this.academicYearRepository.save(academicYear);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activar año académico' })
  @ApiResponse({ status: 200, description: 'Año académico activado exitosamente' })
  @Roles(UserRole.ADMIN)
  async activate(@Param('id') id: string): Promise<AcademicYear> {
    await this.findOne(id); // 404/BadRequest si no existe
    const result = await this.academicYearRepository.manager.transaction(async (mgr) => {
      await mgr.update(AcademicYear, {}, { isCurrent: false });
      await mgr.update(AcademicYear, { id }, { isCurrent: true, isArchived: false, archivedAt: null });
      return mgr.findOne(AcademicYear, { where: { id } });
    });
    this.currentAcademicYearService.invalidate();
    return result;
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archivar año académico' })
  @Roles(UserRole.ADMIN)
  async archive(@Param('id') id: string): Promise<AcademicYear> {
    const year = await this.findOne(id);
    if (year.isCurrent) {
      throw new ConflictException('No se puede archivar el año académico activo; activa otro año antes de archivarlo');
    }
    if (year.isArchived) return year; // idempotente
    year.isArchived = true;
    year.archivedAt = new Date();
    const saved = await this.academicYearRepository.save(year);
    this.currentAcademicYearService.invalidate();
    return saved;
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Cerrar el año: reconstruye el expediente y lo archiva (solo lectura)' })
  @Roles(UserRole.ADMIN)
  async close(@Param('id') id: string) {
    return this.closureService.closeYear(id);
  }

  @Put(':id/unarchive')
  @ApiOperation({ summary: 'Desarchivar año académico' })
  @Roles(UserRole.ADMIN)
  async unarchive(@Param('id') id: string): Promise<AcademicYear> {
    const year = await this.findOne(id);
    year.isArchived = false;
    year.archivedAt = null;
    const saved = await this.academicYearRepository.save(year);
    this.currentAcademicYearService.invalidate();
    return saved;
  }

  @Post(':id/clone-structure')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clonar la estructura (grupos/asignaciones/tutorías) de otro año a este, sin alumnos' })
  async cloneStructure(
    @Param('id') id: string,
    @Query('sourceYearId') sourceYearId: string,
  ) {
    if (!sourceYearId) {
      throw new BadRequestException('Falta sourceYearId');
    }
    return this.rolloverService.cloneStructure(sourceYearId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar año académico' })
  @ApiResponse({ status: 200, description: 'Año académico eliminado exitosamente' })
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    const academicYear = await this.findOne(id);
    try {
      await this.academicYearRepository.remove(academicYear);
    } catch (e: any) {
      if (e?.code === '23503') {
        throw new ConflictException('No se puede eliminar: el año académico tiene datos asociados (grupos, asignaciones, periodos, matrículas…). Archívalo en su lugar.');
      }
      throw e;
    }
    return { message: 'Año académico eliminado exitosamente' };
  }
}