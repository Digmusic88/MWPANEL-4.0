import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

@ApiTags('Usuarios')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está en uso' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener lista de usuarios' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.usersService.findAll(page, limit, role, search);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byRole: {
          type: 'object',
          properties: {
            admin: { type: 'number' },
            teacher: { type: 'number' },
            student: { type: 'number' },
            family: { type: 'number' },
          },
        },
        activeUsers: { type: 'number' },
        inactiveUsers: { type: 'number' },
      },
    },
  })
  async getStats(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    activeUsers: number;
    inactiveUsers: number;
  }> {
    return this.usersService.getStats();
  }

  @Get('by-role/:role')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  @ApiParam({ name: 'role', enum: UserRole })
  @ApiResponse({ status: 200, description: 'Usuarios obtenidos exitosamente' })
  async getUsersByRole(@Param('role') role: UserRole): Promise<User[]> {
    return this.usersService.getUsersByRole(role);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido exitosamente' })
  async getMyProfile(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El email ya está en uso' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Actualizar perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto | UpdateStudentProfileDto,
  ): Promise<User> {
    // Si es estudiante, solo puede cambiar contraseña y avatar
    if (user.role === UserRole.STUDENT) {
      const studentDto = updateProfileDto as UpdateStudentProfileDto;
      return this.usersService.updateStudentProfile(user.id, studentDto);
    }

    // Para otros roles, usar el DTO completo
    return this.usersService.updateProfile(user.id, updateProfileDto as UpdateProfileDto);
  }

  @Patch(':id/profile')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar perfil de usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  @Post('profile/me/photo')
  @UseInterceptors(FileInterceptor('photo', {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, callback) => {
      console.log('🔍 [fileFilter] File received:', { 
        originalname: file.originalname, 
        mimetype: file.mimetype, 
        size: file.size 
      });
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        console.error('❌ [fileFilter] Invalid file type:', file.originalname);
        return callback(new Error('Solo se permiten archivos de imagen (JPG, JPEG, PNG, GIF)'), false);
      }
      console.log('✅ [fileFilter] File type valid:', file.originalname);
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Subir foto de perfil del usuario actual' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Foto de perfil actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o muy grande' })
  async uploadMyPhoto(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; avatarUrl: string }> {
    return this.usersService.uploadProfilePhoto(user.id, file);
  }

  @Post(':id/photo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('photo', {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, callback) => {
      console.log('🔍 [fileFilter] File received:', { 
        originalname: file.originalname, 
        mimetype: file.mimetype, 
        size: file.size 
      });
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        console.error('❌ [fileFilter] Invalid file type:', file.originalname);
        return callback(new Error('Solo se permiten archivos de imagen (JPG, JPEG, PNG, GIF)'), false);
      }
      console.log('✅ [fileFilter] File type valid:', file.originalname);
      callback(null, true);
    },
  }))
  @ApiOperation({ summary: 'Subir foto de perfil de usuario (solo admin)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Foto de perfil actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o muy grande' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async uploadUserPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; avatarUrl: string }> {
    console.log('🔍 [uploadUserPhoto] Controller called for user:', id);
    console.log('🔍 [uploadUserPhoto] File in controller:', file ? 'FILE_PRESENT' : 'NO_FILE');
    
    try {
      if (!file) {
        console.error('❌ [uploadUserPhoto] No file received in controller');
        throw new BadRequestException('No se ha recibido ningún archivo');
      }
      
      console.log('🔍 [uploadUserPhoto] File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer ? 'BUFFER_PRESENT' : 'NO_BUFFER'
      });
      
      return this.usersService.uploadProfilePhoto(id, file);
    } catch (error) {
      console.error('❌ [uploadUserPhoto] Controller error:', error);
      throw error;
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.usersService.remove(id);
    return { message: 'Usuario desactivado exitosamente' };
  }

  @Get('profile/photo/:filename')
  @ApiOperation({ summary: 'Servir foto de perfil' })
  @ApiParam({ name: 'filename', type: 'string' })
  @ApiResponse({ status: 200, description: 'Imagen de perfil' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  async getProfilePhoto(@Param('filename') filename: string, @Res() res) {
    return this.usersService.getProfilePhoto(filename, res);
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restaurar usuario' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario restaurado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async restore(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.restore(id);
  }
}