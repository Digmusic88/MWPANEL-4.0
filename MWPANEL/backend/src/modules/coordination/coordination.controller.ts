import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CoordinationService } from './coordination.service';
import { CreateCoordinationSheetDto } from './dto/create-coordination-sheet.dto';
import { UpdateCoordinationSheetDto } from './dto/update-coordination-sheet.dto';
import { CreateCoordinationItemDto } from './dto/create-coordination-item.dto';
import { UpdateCoordinationItemDto } from './dto/update-coordination-item.dto';

@ApiTags('Coordination')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coordination')
export class CoordinationController {
  constructor(private readonly coordinationService: CoordinationService) {}

  @Post('sheets')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new coordination sheet' })
  @ApiResponse({ status: 201, description: 'Sheet created successfully' })
  async create(@Body() createDto: CreateCoordinationSheetDto, @Request() req) {
    return await this.coordinationService.create(createDto, req.user.id);
  }

  @Get('sheets')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all coordination sheets' })
  @ApiResponse({ status: 200, description: 'List of coordination sheets' })
  async findAll(@Request() req) {
    console.log(`[DEBUG] CoordinationController.findAll called for user ${req.user.id} (${req.user.role})`);
    try {
      const result = await this.coordinationService.findAll(req.user.id, req.user.role);
      console.log(`[DEBUG] CoordinationController.findAll success, returning ${result.length} items`);
      return result;
    } catch (error) {
      console.error('[ERROR] CoordinationController.findAll failed:', error);
      throw error;
    }
  }

  @Get('sheets/stats')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get coordination statistics' })
  @ApiResponse({ status: 200, description: 'Coordination statistics' })
  async getStats(@Request() req) {
    return await this.coordinationService.getStats(req.user.id, req.user.role);
  }

  @Get('sheets/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get a specific coordination sheet' })
  @ApiResponse({ status: 200, description: 'Coordination sheet details' })
  async findOne(@Param('id') id: string, @Request() req) {
    return await this.coordinationService.findOne(id, req.user.id);
  }

  @Put('sheets/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a coordination sheet' })
  @ApiResponse({ status: 200, description: 'Sheet updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCoordinationSheetDto,
    @Request() req
  ) {
    return await this.coordinationService.update(id, updateDto, req.user.id, req.user.role);
  }

  @Delete('sheets/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a coordination sheet' })
  @ApiResponse({ status: 200, description: 'Sheet deleted successfully' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.coordinationService.remove(id, req.user.id, req.user.role);
    return { message: 'Hoja de coordinación eliminada exitosamente' };
  }

  // Coordination Items endpoints
  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new coordination item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  async createItem(@Body() createItemDto: CreateCoordinationItemDto, @Request() req) {
    return await this.coordinationService.createItem(createItemDto, req.user.id);
  }

  @Get('items')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get coordination items by sheet ID' })
  @ApiResponse({ status: 200, description: 'List of coordination items' })
  async findItemsBySheet(@Query('sheet_id') sheetId: string, @Request() req) {
    return await this.coordinationService.findItemsBySheet(sheetId, req.user.id, req.user.role);
  }

  @Get('items/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get a specific coordination item' })
  @ApiResponse({ status: 200, description: 'Coordination item details' })
  async findOneItem(@Param('id') id: string, @Request() req) {
    return await this.coordinationService.findOneItem(id, req.user.id);
  }

  @Put('items/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a coordination item' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  async updateItem(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateCoordinationItemDto,
    @Request() req
  ) {
    return await this.coordinationService.updateItem(id, updateItemDto, req.user.id, req.user.role);
  }

  @Delete('items/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a coordination item' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  async removeItem(@Param('id') id: string, @Request() req) {
    await this.coordinationService.removeItem(id, req.user.id, req.user.role);
    return { message: 'Item de coordinación eliminado exitosamente' };
  }

  @Post('items/:id/toggle')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Toggle completion status of a coordination item' })
  @ApiResponse({ status: 200, description: 'Item completion toggled successfully' })
  async toggleItemCompletion(@Param('id') id: string, @Request() req) {
    return await this.coordinationService.toggleItemCompletion(id, req.user.id, req.user.role);
  }

  @Patch('sheets/:id/toggle-active')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Toggle active status of a coordination sheet' })
  @ApiResponse({ status: 200, description: 'Sheet status toggled successfully' })
  async toggleActiveStatus(@Param('id') id: string, @Request() req) {
    return await this.coordinationService.toggleActiveStatus(id, req.user.id, req.user.role);
  }
}