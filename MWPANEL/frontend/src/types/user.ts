export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  FAMILY = 'family',
}

export interface User {
  id: string
  email: string
  role: UserRole | string
  isActive: boolean
  lastLoginAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
  profile?: UserProfile
  // Referencias específicas por rol
  teacherId?: string    // Para usuarios con rol teacher
  studentId?: string    // Para usuarios con rol student
  familyId?: string     // Para usuarios con rol family
}

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  phone?: string
  address?: string
  avatarUrl?: string
  dni?: string
  fullName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
  timeLimitReached?: boolean
}

export interface RefreshTokenResponse {
  accessToken: string
}