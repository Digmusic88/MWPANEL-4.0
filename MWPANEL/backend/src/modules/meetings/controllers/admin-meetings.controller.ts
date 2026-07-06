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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { MeetingsService } from '../services/meetings.service';
import {
  CreateMeetingPeriodDto,
  UpdateMeetingPeriodDto,
  MeetingPeriodResponseDto,
  UpdateBookingDto,
} from '../dto';

@Controller('admin/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('periods')
  @HttpCode(HttpStatus.CREATED)
  async createPeriod(
    @Body() createDto: CreateMeetingPeriodDto,
    @CurrentUser('id') adminId: string,
  ): Promise<{ message: string; period: MeetingPeriodResponseDto }> {
    const period = await this.meetingsService.createPeriod(createDto, adminId);
    
    return {
      message: 'Período de reuniones creado exitosamente',
      period: this.transformPeriodResponse(period),
    };
  }

  @Get('periods')
  async getAllPeriods(): Promise<{ periods: MeetingPeriodResponseDto[] }> {
    const periods = await this.meetingsService.getAllPeriods();
    
    return {
      periods: periods.map(period => this.transformPeriodResponse(period)),
    };
  }

  @Get('periods/:id')
  async getPeriodById(
    @Param('id') id: string,
  ): Promise<{ period: MeetingPeriodResponseDto }> {
    const period = await this.meetingsService.getPeriodById(id);
    
    return {
      period: this.transformPeriodResponse(period),
    };
  }

  @Put('periods/:id')
  async updatePeriod(
    @Param('id') id: string,
    @Body() updateDto: UpdateMeetingPeriodDto,
  ): Promise<{ message: string; period: MeetingPeriodResponseDto }> {
    const period = await this.meetingsService.updatePeriod(id, updateDto);
    
    return {
      message: 'Período de reuniones actualizado exitosamente',
      period: this.transformPeriodResponse(period),
    };
  }

  @Delete('periods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePeriod(@Param('id') id: string): Promise<void> {
    await this.meetingsService.deletePeriod(id);
  }

  @Get('periods/:id/stats')
  async getPeriodStats(
    @Param('id') id: string,
  ): Promise<{
    period: MeetingPeriodResponseDto;
    stats: {
      totalSlots: number;
      availableSlots: number;
      bookedSlots: number;
      uniqueTeachers: number;
      uniqueFamilies: number;
      slotsByTeacher: Array<{
        teacherId: string;
        teacherName: string;
        teacherEmail: string;
        totalSlots: number;
        availableSlots: number;
        bookedSlots: number;
      }>;
      recentBookings: Array<{
        id: string;
        familyName: string;
        studentName: string;
        teacherName: string;
        slotDate: Date;
        status: string;
        bookedAt: Date;
      }>;
    };
  }> {
    const period = await this.meetingsService.getPeriodById(id);
    const stats = await this.meetingsService.getPeriodStatistics(id);

    return {
      period: this.transformPeriodResponse(period),
      stats,
    };
  }

  @Get('periods/:id/calendar')
  async getPeriodCalendarSlots(
    @Param('id') id: string,
  ): Promise<{
    slots: Array<{
      id: string;
      startDatetime: Date;
      endDatetime: Date;
      durationMinutes: number;
      isAvailable: boolean;
      teacher: {
        id: string;
        name: string;
        email: string;
      };
      booking?: {
        id: string;
        familyName: string;
        studentName: string;
        status: string;
        bookedAt: Date;
        notes?: string;
      };
    }>;
  }> {
    const slots = await this.meetingsService.getPeriodCalendarSlots(id);

    return { slots };
  }

  @Get('bookings/:id')
  async getBookingById(
    @Param('id') id: string,
  ): Promise<{ booking: any }> {
    const booking = await this.meetingsService.getBookingById(id);

    return {
      booking: {
        id: booking.id,
        familyName: booking.family?.primaryContact?.profile
          ? `${booking.family.primaryContact.profile.firstName} ${booking.family.primaryContact.profile.lastName}`
          : 'Sin nombre',
        studentName: booking.student?.user?.profile
          ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
          : 'No especificado',
        teacherName: booking.slot?.teacher?.user?.profile
          ? `${booking.slot.teacher.user.profile.firstName} ${booking.slot.teacher.user.profile.lastName}`
          : 'Sin nombre',
        slotDate: this.dateToString(booking.slot.startDatetime),
        slotTime: `${this.timeToString(booking.slot.startDatetime)} - ${this.timeToString(booking.slot.getEndDatetime())}`,
        spaceId: booking.spaceId,
        spaceName: booking.space?.name || null,
        spaceColor: booking.space?.color,
        status: booking.status,
        notes: booking.notes,
        bookedAt: booking.bookingDate,
      },
    };
  }

  @Put('bookings/:id')
  async updateBooking(
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingDto,
  ): Promise<{ message: string; booking: any }> {
    const booking = await this.meetingsService.updateBooking(id, updateDto);

    return {
      message: 'Reserva actualizada exitosamente',
      booking: {
        id: booking.id,
        familyName: booking.family?.primaryContact?.profile
          ? `${booking.family.primaryContact.profile.firstName} ${booking.family.primaryContact.profile.lastName}`
          : 'Sin nombre',
        studentName: booking.student?.user?.profile
          ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
          : 'No especificado',
        teacherName: booking.slot?.teacher?.user?.profile
          ? `${booking.slot.teacher.user.profile.firstName} ${booking.slot.teacher.user.profile.lastName}`
          : 'Sin nombre',
        spaceName: booking.space?.name || 'Sin asignar',
        spaceColor: booking.space?.color,
        status: booking.status,
        notes: booking.notes,
        bookedAt: booking.bookingDate,
      },
    };
  }

  private dateToString(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private timeToString(date: Date): string {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private transformPeriodResponse(period: any): MeetingPeriodResponseDto {
    // Helper function to safely convert date to string
    const dateToString = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string') return date.split('T')[0];
      if (date instanceof Date) return date.toISOString().split('T')[0];
      return new Date(date).toISOString().split('T')[0];
    };

    // Helper function to safely convert date to ISO string
    const dateToISOString = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string') return new Date(date).toISOString();
      if (date instanceof Date) return date.toISOString();
      return new Date(date).toISOString();
    };

    return {
      id: period.id,
      name: period.name,
      isActive: period.isActive,
      startDate: dateToString(period.startDate),
      endDate: dateToString(period.endDate),
      bookingDeadline: dateToString(period.bookingDeadline),
      description: period.description,
      createdAt: dateToISOString(period.createdAt),
      updatedAt: dateToISOString(period.updatedAt),
      createdBy: {
        id: period.createdBy.id,
        email: period.createdBy.email,
        profile: period.createdBy.profile ? {
          firstName: period.createdBy.profile.firstName,
          lastName: period.createdBy.profile.lastName,
        } : undefined,
      },
      isBookingOpen: period.isBookingOpen(),
    };
  }
}