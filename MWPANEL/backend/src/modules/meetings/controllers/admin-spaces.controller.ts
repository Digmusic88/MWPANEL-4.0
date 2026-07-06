import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { MeetingsService } from '../services/meetings.service';
import {
  CreateMeetingSpaceDto,
  UpdateMeetingSpaceDto,
  MeetingSpaceResponseDto,
  CheckSpaceAvailabilityDto,
  SpaceAvailabilityResponseDto,
} from '../dto';

@Controller('admin/meetings/spaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSpacesController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSpace(
    @Body() createDto: CreateMeetingSpaceDto,
  ): Promise<{ message: string; space: MeetingSpaceResponseDto }> {
    const space = await this.meetingsService.createSpace(createDto);

    return {
      message: 'Espacio creado exitosamente',
      space: this.transformSpaceResponse(space),
    };
  }

  @Get()
  async getAllSpaces(): Promise<{ spaces: MeetingSpaceResponseDto[] }> {
    const spaces = await this.meetingsService.getAllSpaces();

    return {
      spaces: spaces.map((space) => this.transformSpaceResponse(space)),
    };
  }

  @Get('active')
  async getActiveSpaces(): Promise<{ spaces: MeetingSpaceResponseDto[] }> {
    const spaces = await this.meetingsService.getActiveSpaces();

    return {
      spaces: spaces.map((space) => this.transformSpaceResponse(space)),
    };
  }

  @Get(':id')
  async getSpaceById(
    @Param('id') id: string,
  ): Promise<{ space: MeetingSpaceResponseDto }> {
    const space = await this.meetingsService.getSpaceById(id);

    return {
      space: this.transformSpaceResponse(space),
    };
  }

  @Put(':id')
  async updateSpace(
    @Param('id') id: string,
    @Body() updateDto: UpdateMeetingSpaceDto,
  ): Promise<{ message: string; space: MeetingSpaceResponseDto }> {
    const space = await this.meetingsService.updateSpace(id, updateDto);

    return {
      message: 'Espacio actualizado exitosamente',
      space: this.transformSpaceResponse(space),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSpace(@Param('id') id: string): Promise<void> {
    await this.meetingsService.deleteSpace(id);
  }

  @Post('check-availability')
  async checkAvailability(
    @Body() checkDto: CheckSpaceAvailabilityDto,
  ): Promise<SpaceAvailabilityResponseDto> {
    return await this.meetingsService.checkSpaceAvailability(
      checkDto.spaceId,
      new Date(checkDto.startDatetime),
      checkDto.durationMinutes,
    );
  }

  private transformSpaceResponse(space: any): MeetingSpaceResponseDto {
    return {
      id: space.id,
      name: space.name,
      type: space.type,
      location: space.location,
      capacity: space.capacity,
      description: space.description,
      color: space.color,
      isActive: space.isActive,
      createdAt: space.createdAt?.toISOString() || '',
      updatedAt: space.updatedAt?.toISOString() || '',
    };
  }
}
