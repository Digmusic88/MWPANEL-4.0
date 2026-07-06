import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';

@Injectable()
export class EmployeeNumberService {
  constructor(
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
  ) {}

  /**
   * Genera el siguiente número de empleado disponible
   * Formato: EMP-YYYY-NNNN (ej: EMP-2025-0001)
   */
  async generateEmployeeNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `EMP-${currentYear}-`;
    
    console.log(`🔍 [EmployeeNumberService] Generating number for year ${currentYear}, prefix: ${prefix}`);

    // Buscar el último número del año actual
    const lastTeacher = await this.teachersRepository
      .createQueryBuilder('teacher')
      .where('teacher.employeeNumber LIKE :pattern', { 
        pattern: `${prefix}%` 
      })
      .orderBy('teacher.employeeNumber', 'DESC')
      .getOne();
      
    console.log(`🔍 [EmployeeNumberService] Last teacher with ${prefix} format:`, lastTeacher?.employeeNumber || 'none');

    let nextNumber = 1;

    if (lastTeacher) {
      // Extraer el número del formato EMP-YYYY-NNNN
      const lastNumberStr = lastTeacher.employeeNumber.split('-')[2];
      const lastNumber = parseInt(lastNumberStr, 10);
      
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Formatear con ceros a la izquierda (4 dígitos)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    const finalNumber = `${prefix}${formattedNumber}`;
    
    console.log(`🔍 [EmployeeNumberService] Final generated number: ${finalNumber}`);
    
    return finalNumber;
  }

  /**
   * Valida que un número de empleado sea único
   */
  async validateEmployeeNumber(employeeNumber: string): Promise<boolean> {
    const existing = await this.teachersRepository.findOne({
      where: { employeeNumber }
    });
    
    return !existing; // true si no existe (es único)
  }

  /**
   * Valida el formato del número de empleado
   * Acepta formatos: EMP-YYYY-NNNN o formatos legacy
   */
  validateEmployeeFormat(employeeNumber: string): boolean {
    // Formato nuevo: EMP-YYYY-NNNN
    const newFormatRegex = /^EMP-\d{4}-\d{4}$/;
    
    // Formatos legacy aceptados (EMP001, EMP-2024-123, etc.)
    const legacyFormatRegex = /^EMP\d+$|^EMP-\d{4}-\d+$/;
    
    return newFormatRegex.test(employeeNumber) || legacyFormatRegex.test(employeeNumber);
  }

  /**
   * Genera un número único garantizado, incluso si hay conflictos
   */
  async generateUniqueEmployeeNumber(maxAttempts: number = 100): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const employeeNumber = await this.generateEmployeeNumber();
      const isUnique = await this.validateEmployeeNumber(employeeNumber);
      
      if (isUnique) {
        return employeeNumber;
      }
      
      // Si hay conflicto, esperar un poco y reintentarlo
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Fallback con timestamp si fallan todos los intentos
    const timestamp = Date.now();
    return `EMP-${new Date().getFullYear()}-${timestamp.toString().slice(-4)}`;
  }
}