import { apiClient } from './apiClient';
import {
  // Tipos de datos
  MeetingPeriod,
  MeetingSlot,
  MeetingSlotForFamily,
  MeetingBooking,
  FamilyWithStudents,
  StudentWithTutors,
  PeriodStats,
  MeetingSpace,

  // DTOs para crear/actualizar
  CreateMeetingPeriod,
  UpdateMeetingPeriod,
  CreateMeetingSlot,
  CreateBulkSlots,
  BookMeetingSlot,
  CancelBooking,
  MeetingFilters,
  ConfirmBookingRequest,
  DenyBookingRequest,
  AssignSpaceRequest,

  // Respuestas de API
  MeetingPeriodsResponse,
  MeetingSlotsResponse,
  AvailableSlotsResponse as AvailableSlotsForFamilyResponse,
  MeetingBookingsResponse,
  CreatePeriodResponse,
  CreateSlotResponse,
  CreateBulkSlotsResponse,
  BookSlotResponse,
  CancelBookingResponse,
  TeacherFamiliesResponse,
  FamilyStudentsResponse,
  AvailableSpacesResponse,
  FamilyMeetingsHistoryResponse,
} from '../types/meetings';

// ========================================
// SERVICIOS PARA ADMINISTRADORES
// ========================================

export const adminMeetingsService = {
  
  // Gestión de períodos
  async createPeriod(data: CreateMeetingPeriod): Promise<CreatePeriodResponse> {
    const response = await apiClient.post('/admin/meetings/periods', data);
    return response.data;
  },

  async getAllPeriods(): Promise<MeetingPeriodsResponse> {
    const response = await apiClient.get('/admin/meetings/periods');
    return response.data;
  },

  async getPeriodById(id: string): Promise<{ period: MeetingPeriod }> {
    const response = await apiClient.get(`/admin/meetings/periods/${id}`);
    return response.data;
  },

  async updatePeriod(id: string, data: UpdateMeetingPeriod): Promise<CreatePeriodResponse> {
    const response = await apiClient.put(`/admin/meetings/periods/${id}`, data);
    return response.data;
  },

  async deletePeriod(id: string): Promise<void> {
    await apiClient.delete(`/admin/meetings/periods/${id}`);
  },

  // Estadísticas de períodos
  async getPeriodStats(id: string): Promise<PeriodStats> {
    const response = await apiClient.get(`/admin/meetings/periods/${id}/stats`);
    return response.data;
  },
};

// ========================================
// SERVICIOS PARA PROFESORES
// ========================================

export const teacherMeetingsService = {
  
  // Períodos disponibles
  async getActivePeriods(): Promise<MeetingPeriodsResponse> {
    const response = await apiClient.get('/teacher/meetings/periods');
    return response.data;
  },

  // Gestión de slots
  async createSlot(data: CreateMeetingSlot): Promise<CreateSlotResponse> {
    const response = await apiClient.post('/teacher/meetings/slots', data);
    return response.data;
  },

  async createBulkSlots(data: CreateBulkSlots): Promise<CreateBulkSlotsResponse> {
    const response = await apiClient.post('/teacher/meetings/slots/bulk', data);
    return response.data;
  },

  async getMySlots(filters?: MeetingFilters): Promise<MeetingSlotsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `/teacher/meetings/slots${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async deleteSlot(slotId: string): Promise<void> {
    await apiClient.delete(`/teacher/meetings/slots/${slotId}`);
  },

  // Familias asociadas
  async getMyFamilies(): Promise<TeacherFamiliesResponse> {
    const response = await apiClient.get('/teacher/meetings/families');
    return response.data;
  },

  // Exportación a calendario (futuro)
  async exportSlotToCalendar(slotId: string): Promise<{ icalContent: string }> {
    const response = await apiClient.get(`/teacher/meetings/slots/${slotId}/calendar-export`);
    return response.data;
  },

  // Gestión de reservas (bookings)
  async getMyBookings(filters?: MeetingFilters): Promise<MeetingBookingsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const url = `/teacher/meetings/bookings${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async cancelBooking(bookingId: string, data?: CancelBooking): Promise<{ message: string }> {
    const response = await apiClient.delete(`/teacher/meetings/bookings/${bookingId}`, { data });
    return response.data;
  },

  // Obtener espacios disponibles para fecha/hora específica
  async getAvailableSpaces(startDatetime: string, durationMinutes: number): Promise<AvailableSpacesResponse> {
    const params = new URLSearchParams({
      startDatetime,
      durationMinutes: durationMinutes.toString(),
    });
    const response = await apiClient.get(`/teacher/meetings/available-spaces?${params.toString()}`);
    return response.data;
  },

  // Confirmar reserva pendiente y asignar espacio (obligatorio)
  async confirmBooking(bookingId: string, data: ConfirmBookingRequest): Promise<{ message: string; booking: any }> {
    const response = await apiClient.post(`/teacher/meetings/bookings/${bookingId}/confirm`, data);
    return response.data;
  },

  // Denegar/Rechazar reserva pendiente
  async denyBooking(bookingId: string, data: DenyBookingRequest): Promise<{ message: string; booking: any }> {
    const response = await apiClient.post(`/teacher/meetings/bookings/${bookingId}/deny`, data);
    return response.data;
  },

  // Asignar o cambiar espacio de reserva confirmada
  async assignSpace(bookingId: string, data: AssignSpaceRequest): Promise<{ message: string; booking: any }> {
    const response = await apiClient.post(`/teacher/meetings/bookings/${bookingId}/assign-space`, data);
    return response.data;
  },

  // Obtener familias sin reserva en un período específico
  async getFamiliesWithoutBooking(periodId: string): Promise<TeacherFamiliesResponse> {
    const response = await apiClient.get(`/teacher/meetings/periods/${periodId}/families-without-booking`);
    return response.data;
  },

  // Asignar un slot a una familia específica (asignación manual)
  async assignSlotToFamily(slotId: string, data: { familyId: string; studentId: string; notes?: string }): Promise<{ message: string; booking: any }> {
    const response = await apiClient.post(`/teacher/meetings/slots/${slotId}/assign-family`, data);
    return response.data;
  },

  // Obtener historial de reuniones con una familia específica
  async getFamilyMeetingsHistory(familyId: string): Promise<FamilyMeetingsHistoryResponse> {
    const response = await apiClient.get(`/teacher/meetings/families/${familyId}/history`);
    return response.data;
  },
};

// ========================================
// SERVICIOS PARA FAMILIAS
// ========================================

export const familyMeetingsService = {
  
  // Períodos activos y disponibles
  async getActivePeriods(): Promise<MeetingPeriodsResponse> {
    const response = await apiClient.get('/family/meetings/periods');
    return response.data;
  },

  // Slots disponibles para reservar
  async getAvailableSlots(filters?: MeetingFilters): Promise<AvailableSlotsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `/family/meetings/available-slots${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  // Gestión de reservas
  async bookSlot(data: BookMeetingSlot): Promise<BookSlotResponse> {
    const response = await apiClient.post('/family/meetings/book', data);
    return response.data;
  },

  async getMyBookings(filters?: MeetingFilters): Promise<MeetingBookingsResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `/family/meetings/bookings${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async cancelBooking(bookingId: string, data: CancelBooking): Promise<CancelBookingResponse> {
    const response = await apiClient.delete(`/family/meetings/bookings/${bookingId}`, { data });
    return response.data;
  },

  // Estudiantes de la familia
  async getMyStudents(): Promise<FamilyStudentsResponse> {
    const response = await apiClient.get('/family/meetings/students');
    return response.data;
  },
};

// ========================================
// SERVICIOS GENERALES Y UTILIDADES
// ========================================

export const meetingsService = {
  
  // Formateo de fechas y horarios
  formatDateTime(datetime: string): string {
    const date = new Date(datetime);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  formatTime(datetime: string): string {
    const date = new Date(datetime);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Validaciones
  isBookingOpen(period: MeetingPeriod): boolean {
    const now = new Date();
    const deadline = new Date(period.bookingDeadline + 'T23:59:59');
    return period.isActive && now <= deadline;
  },

  isCancellable(booking: MeetingBooking): boolean {
    // Se puede cancelar hasta 24 horas antes
    const now = new Date();
    const slotDate = new Date(booking.slot.startDatetime);
    const timeDiff = slotDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    return booking.isActive && hoursDiff >= 24;
  },

  // Generación de opciones para selects
  generateTimeSlots(startHour: number = 8, endHour: number = 18, intervalMinutes: number = 60): Array<{ value: string; label: string }> {
    const slots = [];
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const label = `${timeString}`;
        slots.push({ value: timeString, label });
      }
    }
    
    return slots;
  },

  // Generación de fechas para creación masiva
  getWorkingDaysInRange(startDate: string, endDate: string): string[] {
    const dates = [];
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Excluir fines de semana (sábado = 6, domingo = 0)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  },

  // Agrupación de slots por fecha para calendarios
  groupSlotsByDate(slots: MeetingSlot[] | MeetingSlotForFamily[]): Record<string, (MeetingSlot | MeetingSlotForFamily)[]> {
    const grouped: Record<string, (MeetingSlot | MeetingSlotForFamily)[]> = {};
    
    slots.forEach(slot => {
      const date = slot.startDatetime.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });
    
    // Ordenar slots por hora dentro de cada fecha
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => 
        new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
      );
    });
    
    return grouped;
  },
};

// Exportar servicios individuales para fácil importación
export { adminMeetingsService as adminMeetings };
export { teacherMeetingsService as teacherMeetings };
export { familyMeetingsService as familyMeetings };