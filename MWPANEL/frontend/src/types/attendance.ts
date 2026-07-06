export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  JUSTIFIED_LATE = 'justified_late',
  EARLY_DEPARTURE = 'early_departure',
  JUSTIFIED_ABSENCE = 'justified_absence',
}

export enum AttendanceRequestType {
  ABSENCE = 'absence',
  LATE_ARRIVAL = 'late_arrival',
  EARLY_DEPARTURE = 'early_departure',
}

export enum AttendanceRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  justification?: string;
  approvedRequestId?: string;
  markedById: string;
  markedAt: string;
  arrivalTime?: string;
  departureTime?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    enrollmentNumber: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  markedBy?: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface AttendanceRequest {
  id: string;
  studentId: string;
  type: AttendanceRequestType;
  date: string;
  reason: string;
  expectedArrivalTime?: string;
  expectedDepartureTime?: string;
  status: AttendanceRequestStatus;
  requestedById: string;
  reviewedById?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    enrollmentNumber: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  requestedBy?: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  reviewedBy?: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface CreateAttendanceRecordDto {
  studentId: string;
  date: string;
  status: AttendanceStatus;
  justification?: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface UpdateAttendanceRecordDto {
  status?: AttendanceStatus;
  justification?: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface CreateAttendanceRequestDto {
  studentId: string;
  type: AttendanceRequestType;
  date: string;
  reason: string;
  expectedArrivalTime?: string;
  expectedDepartureTime?: string;
}

export interface ReviewAttendanceRequestDto {
  status: AttendanceRequestStatus.APPROVED | AttendanceRequestStatus.REJECTED;
  reviewNote?: string;
}

export interface BulkMarkPresentDto {
  classGroupId: string;
  date: string;
  excludeStudentIds?: string[];
}

export interface AttendanceStats {
  student: {
    id: string;
    name: string;
  };
  present: number;
  absent: number;
  late: number;
  justifiedLate: number;
  earlyDeparture: number;
  justifiedAbsence: number;
  totalDays: number;
}