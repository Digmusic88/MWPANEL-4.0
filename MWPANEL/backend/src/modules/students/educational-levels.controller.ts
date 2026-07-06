import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EducationalLevelsService } from './services/educational-levels.service';
import { EducationalLevel } from './entities/educational-level.entity';
import { CreateEducationalLevelDto } from './dto/create-educational-level.dto';
import { UpdateEducationalLevelDto } from './dto/update-educational-level.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('educational-levels')
@Controller('educational-levels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EducationalLevelsController {
  constructor(private readonly educationalLevelsService: EducationalLevelsService) {}

  @Get('courses/all')
  @ApiOperation({ summary: 'Obtener todos los cursos aplanados para formularios' })
  @ApiResponse({ status: 200, description: 'Lista de todos los cursos con información del nivel educativo' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getAllCourses() {
    const educationalLevels = await this.educationalLevelsService.findAll();
    const courses = [];
    
    for (const level of educationalLevels) {
      for (const cycle of level.cycles || []) {
        for (const course of cycle.courses || []) {
          courses.push({
            id: course.id,
            name: course.name,
            code: course.code,
            order: course.order,
            ageReference: course.ageReference,
            academicYear: course.academicYear,
            educationalLevel: {
              id: level.id,
              name: level.name,
              code: level.code
            },
            cycle: {
              id: cycle.id,
              name: cycle.name,
              order: cycle.order
            }
          });
        }
      }
    }
    
    // Sort by educational level and then by course order
    courses.sort((a, b) => {
      if (a.educationalLevel.code !== b.educationalLevel.code) {
        const order = { 'INFANTIL': 1, 'PRIMARIA': 2, 'SECUNDARIA': 3 };
        return (order[a.educationalLevel.code] || 999) - (order[b.educationalLevel.code] || 999);
      }
      return a.order - b.order;
    });
    
    return courses;
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los niveles educativos' })
  @ApiResponse({ status: 200, description: 'Lista de niveles educativos' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findAll(): Promise<EducationalLevel[]> {
    console.log('🎯 EducationalLevelsController.findAll() called');
    const result = await this.educationalLevelsService.findAll();
    console.log('🎯 Controller received result with', result.length, 'educational levels');
    result.forEach((level, index) => {
      console.log(`🎯 Level ${index + 1}: ${level.name} has ${level.cycles?.length || 0} cycles`);
    });
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un nivel educativo por ID' })
  @ApiResponse({ status: 200, description: 'Nivel educativo encontrado' })
  @ApiResponse({ status: 404, description: 'Nivel educativo no encontrado' })
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async findOne(@Param('id') id: string): Promise<EducationalLevel> {
    return this.educationalLevelsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo nivel educativo' })
  @ApiResponse({ status: 201, description: 'Nivel educativo creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Conflicto - código o nombre ya existe' })
  @Roles(UserRole.ADMIN)
  async create(@Body() createEducationalLevelDto: CreateEducationalLevelDto): Promise<EducationalLevel> {
    return this.educationalLevelsService.create(createEducationalLevelDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un nivel educativo' })
  @ApiResponse({ status: 200, description: 'Nivel educativo actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Nivel educativo no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto - código o nombre ya existe' })
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateEducationalLevelDto: UpdateEducationalLevelDto,
  ): Promise<EducationalLevel> {
    return this.educationalLevelsService.update(id, updateEducationalLevelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un nivel educativo' })
  @ApiResponse({ status: 200, description: 'Nivel educativo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Nivel educativo no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto - nivel educativo tiene estudiantes asociados' })
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.educationalLevelsService.remove(id);
    return { message: 'Nivel educativo eliminado exitosamente' };
  }
}