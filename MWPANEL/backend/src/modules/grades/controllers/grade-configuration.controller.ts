/**
 * @archivo: grade-configuration.controller.ts
 * @módulo: Grades - Controllers
 * @función: API endpoints para configuración de ponderaciones de calificaciones
 * @crítico: SÍ - API para sistema de evaluación personalizable
 * @actualizado: Julio 2025 - Implementación completa
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { GradeConfigurationService } from '../services/grade-configuration.service';
import { GradeConfiguration } from '../entities/grade-configuration.entity';
import { CreateGradeConfigurationDto, UpdateGradeConfigurationDto } from '../dto/grade-configuration.dto';

@ApiTags('centralized-grades')
@ApiBearerAuth()
@Controller('grade-configurations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradeConfigurationController {
  constructor(private readonly gradeConfigService: GradeConfigurationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create new grade weight configuration' })
  @ApiResponse({ 
    status: 201, 
    description: 'Grade configuration created successfully',
    type: GradeConfiguration,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Configuration already exists' })
  async create(
    @Body() createDto: CreateGradeConfigurationDto,
    @CurrentUser() user: any
  ): Promise<GradeConfiguration> {
    try {
      // Si no se especifica teacherId y el usuario es profesor, usar su ID
      if (!createDto.teacherId && user.role === 'teacher') {
        createDto.teacherId = user.teacherId;
      }

      return await this.gradeConfigService.create(createDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error creating grade configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get grade configurations with filters' })
  @ApiQuery({ name: 'teacherId', required: false, description: 'Filter by teacher ID' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Filter by subject ID' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiQuery({ name: 'educationalLevelId', required: false, description: 'Filter by educational level ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Grade configurations retrieved successfully',
    type: [GradeConfiguration],
  })
  async findAll(
    @Query() query: {
      teacherId?: string;
      subjectId?: string;
      courseId?: string;
      educationalLevelId?: string;
    },
    @CurrentUser() user: any
  ): Promise<GradeConfiguration[]> {
    try {
      // Si el usuario es profesor y no se especifica teacherId, usar su ID
      if (user.role === 'teacher' && !query.teacherId) {
        query.teacherId = user.teacherId;
      }

      return await this.gradeConfigService.findAll(query);
    } catch (error) {
      throw new HttpException(
        `Error fetching grade configurations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get specific grade configuration by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Grade configuration retrieved successfully',
    type: GradeConfiguration,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async findOne(@Param('id') id: string): Promise<GradeConfiguration> {
    try {
      return await this.gradeConfigService.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error fetching grade configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update existing grade configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Grade configuration updated successfully',
    type: GradeConfiguration,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGradeConfigurationDto
  ): Promise<GradeConfiguration> {
    console.log('🚨🚨🚨 CONTROLLER REACHED SUCCESSFULLY!');
    console.log('🎯 [DEBUG] Update method called with:');
    console.log('🎯 [DEBUG] Param ID:', id);
    console.log('🎯 [DEBUG] DTO type:', typeof updateDto);
    console.log('🎯 [DEBUG] DTO constructor:', updateDto.constructor.name);
    console.log('🎯 [DEBUG] DTO keys:', Object.keys(updateDto || {}));
    console.log('🚨🚨🚨 CONTROLLER REACHED! Method update called');
    console.log('🎯 [GradeConfigController] PATCH Request received:');
    console.log('🎯 [GradeConfigController] ID:', id);
    console.log('🎯 [GradeConfigController] Body:', JSON.stringify(updateDto, null, 2));
    
    // 🔍 DEBUG: Specific logging for weightConfiguration
    if (updateDto.weightConfiguration) {
      console.log('🔍 [DEBUG] Weight Configuration Details:');
      Object.entries(updateDto.weightConfiguration).forEach(([key, config]) => {
        console.log(`  ${key}:`, {
          weight: config.weight,
          enabled: config.enabled,
          minimumItems: config.minimumItems,
          scale: config.scale || 'MISSING!',
          hasScale: !!config.scale
        });
      });
    }
    
    try {
      const result = await this.gradeConfigService.update(id, updateDto);
      console.log('🎯 [GradeConfigController] Update successful');
      return result;
    } catch (error) {
      console.error('🎯 [GradeConfigController] Update failed:', error.message);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error updating grade configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete grade configuration (soft delete)' })
  @ApiResponse({ status: 200, description: 'Configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.gradeConfigService.remove(id);
      return { message: 'Grade configuration deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error deleting grade configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('teacher/:teacherId/subject/:subjectId')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get configuration by teacher and subject' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Optional course ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration retrieved successfully',
    type: GradeConfiguration,
  })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async findByTeacherAndSubject(
    @Param('teacherId') teacherId: string,
    @Param('subjectId') subjectId: string,
    @Query('courseId') courseId?: string,
    @CurrentUser() user?: any
  ): Promise<GradeConfiguration | null> {
    try {
      // Verificar permisos si el usuario es profesor
      if (user.role === 'teacher' && user.teacherId !== teacherId) {
        throw new HttpException(
          'You can only access your own configurations',
          HttpStatus.FORBIDDEN
        );
      }

      return await this.gradeConfigService.findByTeacherAndSubject(
        teacherId,
        subjectId,
        courseId
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error fetching configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('create-default')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create default configuration for teacher and subject' })
  @ApiResponse({ 
    status: 201, 
    description: 'Default configuration created successfully',
    type: GradeConfiguration,
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing required fields' })
  @ApiResponse({ status: 409, description: 'Configuration already exists' })
  async createDefault(
    @Body() body: {
      teacherId?: string;
      subjectId: string;
      educationalLevelId: string;
      courseId?: string;
    },
    @CurrentUser() user: any
  ): Promise<GradeConfiguration> {
    try {
      // Si no se especifica teacherId y el usuario es profesor, usar su ID
      const teacherId = body.teacherId || (user.role === 'teacher' ? user.teacherId : null);
      
      if (!teacherId) {
        throw new HttpException(
          'Teacher ID is required',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.gradeConfigService.createDefaultConfiguration(
        teacherId,
        body.subjectId,
        body.educationalLevelId,
        body.courseId
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error creating default configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}