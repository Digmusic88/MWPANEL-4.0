import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { MeetingsService } from '../services/meetings.service';
import {
  CreateMeetingSlotDto,
  CreateBulkSlotsDto,
  MeetingFiltersDto,
  MeetingSlotResponseDto,
  MeetingPeriodResponseDto,
  CancelBookingDto,
} from '../dto';

@Controller('teacher/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherMeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('periods')
  async getActivePeriods(): Promise<{ periods: MeetingPeriodResponseDto[] }> {
    const periods = await this.meetingsService.getAllPeriods();
    const activePeriods = periods.filter(period => period.isActive);
    
    return {
      periods: activePeriods.map(period => this.transformPeriodResponse(period)),
    };
  }

  @Post('slots')
  @HttpCode(HttpStatus.CREATED)
  async createSlot(
    @Body() createDto: CreateMeetingSlotDto,
    @CurrentUser('id') teacherId: string,
  ): Promise<{ message: string; slot: MeetingSlotResponseDto }> {
    const slot = await this.meetingsService.createSlot(createDto, teacherId);
    
    return {
      message: 'Slot de reunión creado exitosamente',
      slot: this.transformSlotResponse(slot),
    };
  }

  @Post('slots/bulk')
  @HttpCode(HttpStatus.CREATED)
  async createBulkSlots(
    @Body() createDto: CreateBulkSlotsDto,
    @CurrentUser('id') teacherId: string,
  ): Promise<{ message: string; slots: MeetingSlotResponseDto[] }> {
    // Temporary debug log to see the received data
    console.log('=== DEBUG BULK SLOTS ===');
    console.log('Received createDto:', JSON.stringify(createDto, null, 2));
    console.log('createDto.slots type:', typeof createDto.slots);
    console.log('createDto.slots isArray:', Array.isArray(createDto.slots));
    console.log('========================');
    
    const slots = await this.meetingsService.createBulkSlots(createDto, teacherId);
    
    return {
      message: `${slots.length} slots de reunión creados exitosamente`,
      slots: slots.map(slot => this.transformSlotResponse(slot)),
    };
  }

  @Get('slots')
  async getMySlots(
    @CurrentUser('id') teacherId: string,
    @Query() filters: MeetingFiltersDto,
  ): Promise<{ slots: MeetingSlotResponseDto[] }> {
    const slots = await this.meetingsService.getTeacherSlots(teacherId, filters);
    
    return {
      slots: slots.map(slot => this.transformSlotResponse(slot)),
    };
  }

  @Get('families')
  async getMyFamilies(
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    families: Array<{
      family: {
        id: string;
        primaryContact: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
        secondaryContact?: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      };
      students: Array<{
        id: string;
        enrollmentNumber: string;
        user: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      }>;
    }>;
  }> {
    const families = await this.meetingsService.getTeacherFamilies(teacherId);

    return { families };
  }

  @Delete('slots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSlot(
    @Param('id') slotId: string,
    @CurrentUser('id') teacherId: string,
  ): Promise<void> {
    await this.meetingsService.deleteSlot(slotId, teacherId);
  }

  @Get('slots/:id/calendar-export')
  async exportSlotToCalendar(
    @Param('id') slotId: string,
    @CurrentUser('id') teacherId: string,
  ): Promise<{ icalContent: string }> {
    // TODO: Implement calendar export functionality
    return {
      icalContent: '',
    };
  }

  /**
   * Obtener todas las reservas (bookings) de los slots del profesor
   * Incluye tanto las confirmadas como las canceladas para tener historial completo
   */
  @Get('bookings')
  async getMyBookings(
    @CurrentUser('id') teacherId: string,
    @Query() filters: MeetingFiltersDto,
  ): Promise<{
    bookings: Array<{
      id: string;
      status: string;
      bookingDate: string;
      cancelledAt?: string;
      cancelReason?: string;
      notes?: string;
      slot: {
        id: string;
        startDatetime: string;
        durationMinutes: number;
        formattedTimeSlot: string;
      };
      family: {
        id: string;
        primaryContact: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      };
      student?: {
        id: string;
        enrollmentNumber: string;
        user: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      };
    }>;
  }> {
    console.log('🔍 [Controller] getMyBookings called with teacherId (userId):', teacherId);
    console.log('🔍 [Controller] Filters:', JSON.stringify(filters));

    const bookings = await this.meetingsService.getTeacherBookings(teacherId, filters);

    console.log(`🔍 [Controller] Found ${bookings.length} bookings for teacher`);
    if (bookings.length > 0) {
      console.log('🔍 [Controller] First booking:', JSON.stringify({
        id: bookings[0].id,
        status: bookings[0].status,
        slotId: bookings[0].slot?.id,
        familyId: bookings[0].family?.id
      }));
    }

    return {
      bookings: bookings.map(booking => ({
        id: booking.id,
        status: booking.status,
        bookingDate: booking.bookingDate.toISOString(),
        cancelledAt: booking.cancelledAt?.toISOString(),
        cancelReason: booking.cancelReason,
        notes: booking.notes,
        slot: {
          id: booking.slot.id,
          startDatetime: booking.slot.startDatetime.toISOString(),
          durationMinutes: booking.slot.durationMinutes,
          formattedTimeSlot: booking.slot.getFormattedTimeSlot(),
        },
        family: {
          id: booking.family.id,
          primaryContact: {
            id: booking.family.primaryContact.id,
            email: booking.family.primaryContact.email,
            profile: booking.family.primaryContact.profile ? {
              firstName: booking.family.primaryContact.profile.firstName,
              lastName: booking.family.primaryContact.profile.lastName,
            } : undefined,
          },
        },
        student: booking.student ? {
          id: booking.student.id,
          enrollmentNumber: booking.student.enrollmentNumber,
          user: {
            id: booking.student.user.id,
            email: booking.student.user.email,
            profile: booking.student.user.profile ? {
              firstName: booking.student.user.profile.firstName,
              lastName: booking.student.user.profile.lastName,
            } : undefined,
          },
        } : undefined,
      })),
    };
  }

  /**
   * Cancelar una reserva (booking) desde el panel del profesor
   * Esto libera el slot para que otra familia pueda reservarlo
   */
  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('id') bookingId: string,
    @Body() cancelDto: CancelBookingDto,
    @CurrentUser('id') teacherId: string,
  ): Promise<{ message: string }> {
    // Verificar que la reserva pertenece a un slot del profesor
    const booking = await this.meetingsService.getBookingById(bookingId);

    if (booking.slot.teacher.user.id !== teacherId) {
      throw new HttpException(
        'No tienes permisos para cancelar esta reserva',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.meetingsService.cancelBookingById(bookingId, cancelDto);

    return {
      message: 'Reserva cancelada exitosamente. El slot ahora está disponible.',
    };
  }

  /**
   * Obtener espacios disponibles para una fecha/hora específica
   */
  @Get('available-spaces')
  async getAvailableSpaces(
    @Query('startDatetime') startDatetime: string,
    @Query('durationMinutes') durationMinutes: string,
  ): Promise<{ spaces: Array<any> }> {
    const startDate = new Date(startDatetime);
    const duration = parseInt(durationMinutes, 10);

    const spaces = await this.meetingsService.getAvailableSpaces(startDate, duration);

    return { spaces };
  }

  /**
   * Confirmar una reserva y opcionalmente asignar espacio
   */
  @Post('bookings/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmBooking(
    @Param('id') bookingId: string,
    @CurrentUser('id') teacherId: string,
    @Body() body: { spaceId?: string; notes?: string },
  ): Promise<{ message: string; booking: any }> {
    console.log('🔍 [Controller] confirmBooking called with:', { bookingId, teacherId, body });

    const booking = await this.meetingsService.confirmBookingByTeacher(
      bookingId,
      teacherId,
      body.spaceId,
      body.notes,
    );

    return {
      message: 'Reserva confirmada exitosamente',
      booking: {
        id: booking.id,
        status: booking.status,
        spaceName: booking.space?.name || 'Sin asignar',
        spaceColor: booking.space?.color,
        spaceLocation: booking.space?.location,
      },
    };
  }

  /**
   * Denegar/Rechazar una reserva pendiente
   */
  @Post('bookings/:id/deny')
  @HttpCode(HttpStatus.OK)
  async denyBooking(
    @Param('id') bookingId: string,
    @CurrentUser('id') teacherId: string,
    @Body() body: { reason: string },
  ): Promise<{ message: string; booking: any }> {
    console.log('🔍 [Controller] denyBooking called with:', { bookingId, teacherId, reason: body.reason });

    const booking = await this.meetingsService.denyBookingByTeacher(
      bookingId,
      teacherId,
      body.reason,
    );

    return {
      message: 'Reserva denegada exitosamente. El slot está disponible nuevamente.',
      booking: {
        id: booking.id,
        status: booking.status,
        cancelReason: booking.cancelReason,
      },
    };
  }

  /**
   * Asignar o cambiar espacio de una reserva confirmada
   */
  @Post('bookings/:id/assign-space')
  @HttpCode(HttpStatus.OK)
  async assignSpace(
    @Param('id') bookingId: string,
    @CurrentUser('id') teacherId: string,
    @Body() body: { spaceId: string | null },
  ): Promise<{ message: string; booking: any }> {
    console.log('🔍 [Controller] assignSpace called with:', { bookingId, teacherId, spaceId: body.spaceId });

    const booking = await this.meetingsService.assignSpaceByTeacher(
      bookingId,
      teacherId,
      body.spaceId,
    );

    return {
      message: body.spaceId
        ? 'Espacio asignado exitosamente'
        : 'Espacio removido exitosamente',
      booking: {
        id: booking.id,
        spaceName: booking.space?.name || 'Sin asignar',
        spaceColor: booking.space?.color,
        spaceLocation: booking.space?.location,
      },
    };
  }

  /**
   * Obtener el conteo de reservas pendientes de confirmar
   * Para el sistema de notificaciones y badges
   */
  @Get('bookings/pending/count')
  @HttpCode(HttpStatus.OK)
  async getPendingBookingsCount(
    @CurrentUser('id') teacherId: string,
  ): Promise<{ count: number }> {
    const count = await this.meetingsService.getPendingBookingsCount(teacherId);

    return { count };
  }

  /**
   * Obtener familias sin reserva en un período específico
   * Solo devuelve familias que aún no tienen reunión reservada en el período
   */
  @Get('periods/:periodId/families-without-booking')
  @HttpCode(HttpStatus.OK)
  async getFamiliesWithoutBooking(
    @Param('periodId') periodId: string,
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    families: Array<{
      family: {
        id: string;
        primaryContact: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      };
      students: Array<{
        id: string;
        enrollmentNumber: string;
        user: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      }>;
    }>;
  }> {
    console.log('🔍 [Controller] getFamiliesWithoutBooking called with:', { periodId, teacherId });

    const families = await this.meetingsService.getFamiliesWithoutBookingInPeriod(periodId, teacherId);

    console.log(`🔍 [Controller] Found ${families.length} families without booking`);

    return { families };
  }

  /**
   * Asignar manualmente un slot a una familia específica
   * El profesor puede asignar un slot disponible a una familia que no ha reservado
   */
  @Post('slots/:slotId/assign-family')
  @HttpCode(HttpStatus.OK)
  async assignSlotToFamily(
    @Param('slotId') slotId: string,
    @CurrentUser('id') teacherId: string,
    @Body() body: { familyId: string; studentId: string; notes?: string },
  ): Promise<{ message: string; booking: any }> {
    console.log('🔍 [Controller] assignSlotToFamily called with:', { slotId, teacherId, body });

    const booking = await this.meetingsService.assignSlotToFamily(
      slotId,
      teacherId,
      body.familyId,
      body.studentId,
      body.notes,
    );

    return {
      message: 'Slot asignado exitosamente a la familia',
      booking: {
        id: booking.id,
        status: booking.status,
        familyName: booking.family?.primaryContact?.profile
          ? `${booking.family.primaryContact.profile.firstName} ${booking.family.primaryContact.profile.lastName}`
          : booking.family?.primaryContact?.email || 'Sin nombre',
        studentName: booking.student?.user?.profile
          ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
          : booking.student?.user?.email || 'Sin nombre',
        slotDate: booking.slot?.startDatetime,
      },
    };
  }

  /**
   * Obtener historial de reuniones con una familia específica
   * Devuelve todas las reservas (pasadas y futuras) entre el profesor y la familia
   */
  @Get('families/:familyId/history')
  @HttpCode(HttpStatus.OK)
  async getFamilyMeetingsHistory(
    @Param('familyId') familyId: string,
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    family: {
      id: string;
      primaryContact: {
        id: string;
        email: string;
        profile?: {
          firstName: string;
          lastName: string;
        };
      };
    };
    bookings: Array<{
      id: string;
      status: string;
      notes: string | null;
      cancelReason: string | null;
      spaceId: string | null;
      createdAt: string;
      slot: {
        id: string;
        startDatetime: string;
        durationMinutes: number;
      };
      student: {
        id: string;
        enrollmentNumber: string;
        user: {
          id: string;
          email: string;
          profile?: {
            firstName: string;
            lastName: string;
          };
        };
      };
    }>;
    stats: {
      total: number;
      confirmed: number;
      cancelled: number;
      pending: number;
      completed: number;
    };
  }> {
    console.log('🔍 [Controller] getFamilyMeetingsHistory called with:', { familyId, teacherId });

    const result = await this.meetingsService.getFamilyMeetingsHistoryForTeacher(familyId, teacherId);

    return result;
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

  private transformSlotResponse(slot: any): MeetingSlotResponseDto {
    return {
      id: slot.id,
      startDatetime: slot.startDatetime.toISOString(),
      durationMinutes: slot.durationMinutes,
      isAvailable: slot.isAvailable,
      notes: slot.notes,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
      period: slot.period ? {
        id: slot.period.id,
        name: slot.period.name,
      } : undefined,
      teacher: slot.teacher ? {
        id: slot.teacher.id,
        employeeNumber: slot.teacher.employeeNumber,
        user: {
          id: slot.teacher.user.id,
          email: slot.teacher.user.email,
          profile: slot.teacher.user.profile ? {
            firstName: slot.teacher.user.profile.firstName,
            lastName: slot.teacher.user.profile.lastName,
          } : undefined,
        },
      } : undefined,
      endDatetime: slot.getEndDatetime().toISOString(),
      formattedTimeSlot: slot.getFormattedTimeSlot(),
      isBookable: slot.isBookable(),
      hasActiveBooking: slot.hasActiveBooking(),
    };
  }
}