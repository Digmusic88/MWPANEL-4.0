// ========================================
// TIPOS PARA SISTEMA DE GESTIÓN DE REUNIONES
// ========================================

// Estados de reserva
export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

// Información básica de usuario
export interface UserProfile {
  id: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
}

// ========================================
// PERÍODO DE REUNIONES
// ========================================

export interface MeetingPeriod {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  bookingDeadline: string; // ISO date string (YYYY-MM-DD)
  description?: string;
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  createdBy: UserProfile;
  
  // Campos calculados
  isBookingOpen: boolean;
  totalSlots?: number;
  availableSlots?: number;
  bookedSlots?: number;
}

export interface CreateMeetingPeriod {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  bookingDeadline: string; // YYYY-MM-DD
  description?: string;
}

export interface UpdateMeetingPeriod {
  name?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  bookingDeadline?: string; // YYYY-MM-DD
  description?: string;
  isActive?: boolean;
}

// ========================================
// SLOTS DE REUNIONES
// ========================================

export interface Teacher {
  id: string;
  employeeNumber: string;
  user: UserProfile;
}

export interface MeetingSlot {
  id: string;
  startDatetime: string; // ISO datetime string
  durationMinutes: number;
  isAvailable: boolean;
  notes?: string;
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  
  period: {
    id: string;
    name: string;
  };
  
  teacher: Teacher;
  
  // Campos calculados
  endDatetime: string; // ISO datetime string
  formattedTimeSlot: string; // "DD/MM/YYYY HH:mm - HH:mm"
  isBookable: boolean;
  hasActiveBooking: boolean;
}

// Version reducida para familias (con información del profesor pero sin datos sensibles)
export interface MeetingSlotForFamily {
  id: string;
  startDatetime: string; // ISO datetime string
  durationMinutes: number;
  endDatetime: string; // ISO datetime string
  formattedTimeSlot: string; // "DD/MM/YYYY HH:mm - HH:mm"
  isAvailable: boolean;
  isBookable: boolean;
  teacher: {
    id: string;
    user: {
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

export interface CreateMeetingSlot {
  periodId: string;
  startDatetime: string; // ISO datetime string
  durationMinutes: number;
  notes?: string;
}

// Para creación masiva de slots
export interface SlotTime {
  time: string; // "HH:mm" format
  durationMinutes: number;
}

export interface CreateBulkSlots {
  periodId: string;
  dates: string[]; // Array of YYYY-MM-DD
  times: SlotTime[];
  notes?: string;
}

// ========================================
// RESERVAS DE REUNIONES
// ========================================

export interface Student {
  id: string;
  enrollmentNumber: string;
  user: UserProfile;
}

export interface Family {
  id: string;
  primaryContact: UserProfile;
}

export interface MeetingBooking {
  id: string;
  bookingDate: string; // ISO datetime string
  status: BookingStatus;
  notes?: string;
  cancelledAt?: string; // ISO datetime string
  cancelReason?: string;
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  
  slot: MeetingSlot;
  family: Family;
  student: Student;
  
  // Campos calculados
  isActive: boolean;
  isCancellable: boolean;
  formattedBookingInfo: string;
}

export interface BookMeetingSlot {
  slotId: string;
  studentId: string;
  notes?: string;
}

export interface CancelBooking {
  reason: string;
}

// ========================================
// FILTROS Y PARÁMETROS DE BÚSQUEDA
// ========================================

export interface MeetingFilters {
  periodId?: string;
  teacherId?: string;
  studentId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: BookingStatus;
  onlyAvailable?: boolean;
  showPast?: boolean; // true para mostrar reuniones pasadas (archivadas), false para futuras
}

// ========================================
// RESPUESTAS DE API
// ========================================

export interface MeetingPeriodsResponse {
  periods: MeetingPeriod[];
}

export interface MeetingSlotsResponse {
  slots: MeetingSlot[];
}

export interface AvailableSlotsResponse {
  slots: MeetingSlotForFamily[];
}

export interface MeetingBookingsResponse {
  bookings: MeetingBooking[];
}

export interface CreatePeriodResponse {
  message: string;
  period: MeetingPeriod;
}

export interface CreateSlotResponse {
  message: string;
  slot: MeetingSlot;
}

export interface CreateBulkSlotsResponse {
  message: string;
  slots: MeetingSlot[];
}

export interface BookSlotResponse {
  message: string;
  booking: MeetingBooking;
}

export interface CancelBookingResponse {
  message: string;
  booking: MeetingBooking;
}

// ========================================
// ESTADÍSTICAS PARA ADMINISTRADORES
// ========================================

export interface PeriodStats {
  period: MeetingPeriod;
  stats: {
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
    uniqueTeachers: number;
    uniqueFamilies: number;
  };
}

// ========================================
// FAMILIAS Y ESTUDIANTES PARA PROFESORES
// ========================================

export interface StudentWithTutors {
  id: string;
  enrollmentNumber: string;
  user: UserProfile;
  tutors: Teacher[];
}

export interface FamilyWithStudents {
  family: Family;
  students: StudentWithTutors[];
}

export interface TeacherFamiliesResponse {
  families: FamilyWithStudents[];
}

export interface FamilyStudentsResponse {
  students: StudentWithTutors[];
}

// ========================================
// TIPOS PARA COMPONENTES UI
// ========================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    slotId: string;
    isBooked: boolean;
    booking?: MeetingBooking;
  };
}

export interface TimeSlotOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// ========================================
// ESPACIOS DE REUNIONES
// ========================================

export interface MeetingSpace {
  id: string;
  name: string;
  type: string;
  location?: string;
  capacity?: number;
  color?: string;
  isAvailable: boolean;
  conflictingBooking?: {
    teacherName: string;
    familyName: string;
    startTime: string;
  };
}

export interface AvailableSpacesResponse {
  spaces: MeetingSpace[];
}

export interface ConfirmBookingRequest {
  spaceId: string; // Obligatorio
  notes?: string;
}

export interface DenyBookingRequest {
  reason: string;
}

export interface AssignSpaceRequest {
  spaceId: string | null;
}

// ========================================
// HISTORIAL DE REUNIONES CON FAMILIA
// ========================================

export interface FamilyMeetingHistoryBooking {
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
}

export interface FamilyMeetingsHistoryResponse {
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
  bookings: FamilyMeetingHistoryBooking[];
  stats: {
    total: number;
    confirmed: number;
    cancelled: number;
    pending: number;
    completed: number;
  };
}