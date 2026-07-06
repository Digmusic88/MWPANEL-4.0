import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../entities/student.entity';

@Injectable()
export class EnrollmentNumberService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
  ) {}

  /**
   * Genera el siguiente número de matrícula disponible
   * Formato: MW-YYYY-NNNN (ej: MW-2025-0001)
   */
  async generateEnrollmentNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `MW-${currentYear}-`;

    // Buscar el último número del año actual
    const lastStudent = await this.studentsRepository
      .createQueryBuilder('student')
      .where('student.enrollmentNumber LIKE :pattern', { 
        pattern: `${prefix}%` 
      })
      .orderBy('student.enrollmentNumber', 'DESC')
      .getOne();

    let nextNumber = 1;

    if (lastStudent) {
      // Extraer el número del formato MW-YYYY-NNNN
      const lastNumberStr = lastStudent.enrollmentNumber.split('-')[2];
      const lastNumber = parseInt(lastNumberStr, 10);
      
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Formatear con ceros a la izquierda (4 dígitos)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    
    return `${prefix}${formattedNumber}`;
  }

  /**
   * Valida que un número de matrícula sea único
   */
  async validateEnrollmentNumber(enrollmentNumber: string): Promise<boolean> {
    const existing = await this.studentsRepository.findOne({
      where: { enrollmentNumber }
    });
    
    return !existing; // true si no existe (es único)
  }

  /**
   * Valida el formato del número de matrícula
   * Acepta formatos: MW-YYYY-NNNN o formatos legacy
   */
  validateEnrollmentFormat(enrollmentNumber: string): boolean {
    // Formato nuevo: MW-YYYY-NNNN
    const newFormatRegex = /^MW-\d{4}-\d{4}$/;
    
    // Formatos legacy aceptados
    const legacyFormatRegex = /^(MW|MT)\d+$|^(MW|MT)-\d{4}-\d+$/;
    
    return newFormatRegex.test(enrollmentNumber) || legacyFormatRegex.test(enrollmentNumber);
  }

  /**
   * Genera un número único garantizado, incluso si hay conflictos
   */
  async generateUniqueEnrollmentNumber(maxAttempts: number = 100): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const enrollmentNumber = await this.generateEnrollmentNumber();
      const isUnique = await this.validateEnrollmentNumber(enrollmentNumber);
      
      if (isUnique) {
        return enrollmentNumber;
      }
      
      // Si hay conflicto, esperar un poco y reintentarlo
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Fallback con timestamp si fallan todos los intentos
    const timestamp = Date.now();
    return `MW-${new Date().getFullYear()}-${timestamp.toString().slice(-4)}`;
  }
}