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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { MeetingsService } from '../services/meetings.service';
import {
  BookMeetingSlotDto,
  CancelBookingDto,
  MeetingFiltersDto,
  MeetingSlotForFamilyDto,
  MeetingBookingResponseDto,
  MeetingPeriodResponseDto,
} from '../dto';

@Controller('family/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FAMILY)
export class FamilyMeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get('periods')
  async getActivePeriods(): Promise<{ periods: MeetingPeriodResponseDto[] }> {
    const periods = await this.meetingsService.getAllPeriods();
    const activePeriods = periods.filter(period => period.isActive && period.isBookingOpen());
    
    return {
      periods: activePeriods.map(period => this.transformPeriodResponse(period)),
    };
  }

  @Get('available-slots')
  async getAvailableSlots(
    @CurrentUser('id') familyId: string,
    @Query() filters: MeetingFiltersDto,
  ): Promise<{ slots: MeetingSlotForFamilyDto[] }> {
    const slots = await this.meetingsService.getAvailableSlotsForFamily(familyId, filters);
    
    return {
      slots: slots.map(slot => this.transformSlotForFamily(slot)),
    };
  }

  @Post('book')
  @HttpCode(HttpStatus.CREATED)
  async bookSlot(
    @Body() bookingDto: BookMeetingSlotDto,
    @CurrentUser('id') familyId: string,
  ): Promise<{ message: string; booking: MeetingBookingResponseDto }> {
    const booking = await this.meetingsService.bookSlot(bookingDto, familyId);
    
    return {
      message: 'Reunión reservada exitosamente',
      booking: this.transformBookingResponse(booking),
    };
  }

  @Get('bookings')
  async getMyBookings(
    @CurrentUser('id') familyId: string,
    @Query() filters: MeetingFiltersDto,
  ): Promise<{ bookings: MeetingBookingResponseDto[] }> {
    console.log('🎯 Controller getMyBookings called with familyId:', familyId);
    
    try {
      const bookings = await this.meetingsService.getFamilyBookings(familyId, filters);
      console.log('🎯 Controller received bookings:', bookings.length);
      
      // Debug each booking before transformation
      bookings.forEach((booking, index) => {
        console.log(`🎯 Booking ${index} before transform:`, {
          id: booking.id,
          familyId: booking.familyId,
          hasFamily: !!booking.family,
          familyObjId: booking.family?.id || 'UNDEFINED',
          hasPrimaryContact: !!booking.family?.primaryContact,
          studentId: booking.studentId,
          hasStudent: !!booking.student
        });
      });
      
      return {
        bookings: bookings.map(booking => {
          console.log('🎯 Transforming booking:', booking.id);
          return this.transformBookingResponse(booking);
        }),
      };
    } catch (error) {
      console.error('🚨 Controller error in getMyBookings:', error);
      throw error;
    }
  }

  @Delete('bookings/:id')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('id') bookingId: string,
    @CurrentUser('id') familyId: string,
    @Body() cancelDto: CancelBookingDto,
  ): Promise<{ message: string; booking: MeetingBookingResponseDto }> {
    const booking = await this.meetingsService.cancelBooking(bookingId, familyId, cancelDto);
    
    return {
      message: 'Reserva cancelada exitosamente',
      booking: this.transformBookingResponse(booking),
    };
  }

  @Get('students')
  async getMyStudents(
    @CurrentUser('id') familyId: string,
  ): Promise<{
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
      tutors: Array<{
        id: string;
        employeeNumber: string;
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
    console.log('🎯 Controller getMyStudents called with familyId:', familyId);
    
    try {
      const students = await this.meetingsService.getFamilyStudents(familyId);
      console.log('🎯 Service returned students:', students.length);
      
      return {
        students: students.map(student => ({
          id: student.id,
          enrollmentNumber: student.enrollmentNumber,
          user: {
            id: student.user.id,
            email: student.user.email,
            profile: student.user.profile ? {
              firstName: student.user.profile.firstName,
              lastName: student.user.profile.lastName,
            } : undefined,
          },
          tutors: [], // Simplified - tutors relationship removed for performance
        })),
      };
    } catch (error) {
      console.error('🚨 Error in getMyStudents:', error);
      throw error;
    }
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

  private transformSlotForFamily(slot: any): MeetingSlotForFamilyDto {
    return {
      id: slot.id,
      startDatetime: slot.startDatetime.toISOString(),
      durationMinutes: slot.durationMinutes,
      endDatetime: slot.getEndDatetime().toISOString(),
      formattedTimeSlot: slot.getFormattedTimeSlot(),
      isAvailable: slot.isAvailable,
      isBookable: slot.isBookable(),
      // Información del profesor (solo nombre para identificación; RGPD: sin email)
      teacher: {
        id: slot.teacher.id,
        user: {
          // RGPD: NO exponer el email del profesor a las familias.
          profile: slot.teacher.user.profile ? {
            firstName: slot.teacher.user.profile.firstName,
            lastName: slot.teacher.user.profile.lastName,
          } : undefined,
        },
      },
      // NO incluir información de otras familias que reservaron
    };
  }

  private transformBookingResponse(booking: any): MeetingBookingResponseDto {
    console.log('🎯 Transform: Starting transformation for booking', booking.id);
    console.log('🎯 Transform: booking.slot exists?', !!booking.slot);
    console.log('🎯 Transform: booking.slot.teacher exists?', !!booking.slot?.teacher);
    console.log('🎯 Transform: booking.slot.teacher.user exists?', !!booking.slot?.teacher?.user);
    
    return {
      id: booking.id,
      bookingDate: booking.bookingDate.toISOString(),
      status: booking.status,
      notes: booking.notes,
      cancelledAt: booking.cancelledAt?.toISOString(),
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      slot: {
        id: booking.slot.id,
        startDatetime: booking.slot.startDatetime.toISOString(),
        durationMinutes: booking.slot.durationMinutes,
        isAvailable: booking.slot.isAvailable,
        notes: booking.slot.notes,
        createdAt: booking.slot.createdAt.toISOString(),
        updatedAt: booking.slot.updatedAt.toISOString(),
        period: {
          id: booking.slot.period.id,
          name: booking.slot.period.name,
        },
        teacher: {
          id: booking.slot.teacher.id,
          employeeNumber: booking.slot.teacher.employeeNumber,
          user: {
            id: booking.slot.teacher.user.id,
            // RGPD: NO exponer el email del profesor a las familias.
            profile: booking.slot.teacher.user.profile ? {
              firstName: booking.slot.teacher.user.profile.firstName,
              lastName: booking.slot.teacher.user.profile.lastName,
            } : undefined,
          },
        },
        endDatetime: booking.slot.getEndDatetime().toISOString(),
        formattedTimeSlot: booking.slot.getFormattedTimeSlot(),
        isBookable: booking.slot.isBookable(),
        hasActiveBooking: booking.slot.hasActiveBooking(),
      },
      family: booking.family ? {
        id: booking.family.id,
        primaryContact: booking.family.primaryContact ? {
          id: booking.family.primaryContact.id,
          email: booking.family.primaryContact.email,
          profile: booking.family.primaryContact.profile ? {
            firstName: booking.family.primaryContact.profile.firstName,
            lastName: booking.family.primaryContact.profile.lastName,
          } : undefined,
        } : null,
      } : null,
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
      } : null,
      isActive: booking.isActive(),
      isCancellable: booking.isCancellable(),
      formattedBookingInfo: booking.getFormattedBookingInfo(),
    };
  }
}