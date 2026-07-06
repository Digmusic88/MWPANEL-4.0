import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SystemAnnouncementService } from '../services/system-announcement.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { UserRole } from '../../users/entities/user.entity';

@Controller('system-announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemAnnouncementController {
  constructor(private readonly announcementService: SystemAnnouncementService) {}

  /**
   * Crear un nuevo anuncio (solo admin)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: CreateAnnouncementDto, @Request() req) {
    return this.announcementService.create(createDto, req.user.sub);
  }

  /**
   * Obtener todos los anuncios (solo admin)
   */
  @Get('admin')
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.announcementService.findAll();
  }

  /**
   * Obtener anuncios activos para el usuario actual
   */
  @Get('active')
  async findActive(@Request() req) {
    const userRole = req.user.role as UserRole;
    return this.announcementService.findActiveForRole(userRole);
  }

  /**
   * Obtener un anuncio específico
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  /**
   * Actualizar un anuncio (solo admin)
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateAnnouncementDto) {
    return this.announcementService.update(id, updateDto);
  }

  /**
   * Activar/desactivar un anuncio (solo admin)
   */
  @Put(':id/toggle')
  @Roles(UserRole.ADMIN)
  async toggleActive(@Param('id') id: string) {
    return this.announcementService.toggleActive(id);
  }

  /**
   * Eliminar un anuncio (solo admin)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.announcementService.remove(id);
    return { message: 'Anuncio eliminado exitosamente' };
  }
}
