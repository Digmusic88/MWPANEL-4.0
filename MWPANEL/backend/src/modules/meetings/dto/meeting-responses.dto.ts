export class MeetingPeriodResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  bookingDeadline: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  
  // Campos calculados
  isBookingOpen: boolean;
  totalSlots?: number;
  availableSlots?: number;
  bookedSlots?: number;
}

export class MeetingSlotResponseDto {
  id: string;
  startDatetime: string;
  durationMinutes: number;
  isAvailable: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  period: {
    id: string;
    name: string;
  };
  
  teacher: {
    id: string;
    employeeNumber: string;
    user: {
      id: string;
      email?: string; // RGPD: no se envía el email del profesor a las familias
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
  };

  // Campos calculados
  endDatetime: string;
  formattedTimeSlot: string;
  isBookable: boolean;
  hasActiveBooking: boolean;
}

export class MeetingSlotForFamilyDto {
  id: string;
  startDatetime: string;
  durationMinutes: number;
  endDatetime: string;
  formattedTimeSlot: string;
  isAvailable: boolean;
  isBookable: boolean;

  // Información del profesor (solo nombre para identificación; RGPD: sin email)
  teacher: {
    id: string;
    user: {
      email?: string; // RGPD: no se envía el email del profesor a las familias
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
  };

  // NO incluir información de quién reservó el slot
}

export class MeetingBookingResponseDto {
  id: string;
  bookingDate: string;
  status: string;
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  
  slot: MeetingSlotResponseDto;
  
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
  
  // Campos calculados
  isActive: boolean;
  isCancellable: boolean;
  formattedBookingInfo: string;
}