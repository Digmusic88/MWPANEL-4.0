export enum AcademicYear {
  YEAR_2023_2024 = '2023-2024',
  YEAR_2024_2025 = '2024-2025',
  YEAR_2025_2026 = '2025-2026',
  YEAR_2026_2027 = '2026-2027',
  YEAR_2027_2028 = '2027-2028',
}

export enum AcademicPeriod {
  FIRST_TRIMESTER = 'first_trimester',
  SECOND_TRIMESTER = 'second_trimester',
  THIRD_TRIMESTER = 'third_trimester',
  FIRST_SEMESTER = 'first_semester',
  SECOND_SEMESTER = 'second_semester',
  ANNUAL = 'annual',
}

export enum RecordStatus {
  ACTIVE = 'active',           // Expediente activo
  COMPLETED = 'completed',     // Año completado
  TRANSFERRED = 'transferred', // Estudiante transferido
  ARCHIVED = 'archived',       // Archivado
}

export enum EntryType {
  ACADEMIC = 'academic',         // Entrada académica (calificaciones)
  ATTENDANCE = 'attendance',     // Registro de asistencia
  BEHAVIORAL = 'behavioral',     // Registro de comportamiento
  ACHIEVEMENT = 'achievement',   // Logro o reconocimiento
  DISCIPLINARY = 'disciplinary', // Acción disciplinaria
  MEDICAL = 'medical',          // Registro médico
  OTHER = 'other',              // Otro tipo
}

export enum GradeType {
  EXAM = 'exam',               // Examen
  QUIZ = 'quiz',               // Quiz o prueba corta
  HOMEWORK = 'homework',       // Tarea
  PROJECT = 'project',         // Proyecto
  PARTICIPATION = 'participation', // Participación
  ATTENDANCE = 'attendance',   // Asistencia
  FINAL = 'final',            // Examen final
  MIDTERM = 'midterm',        // Examen parcial
  ASSIGNMENT = 'assignment',   // Asignación
  OTHER = 'other',            // Otro
}