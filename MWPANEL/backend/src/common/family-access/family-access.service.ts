import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FamilyStudent } from '../../modules/users/entities/family.entity';

/**
 * Autorización RGPD familia→alumno reutilizable (espejo de TeacherAccessService).
 * Verdadero si `userId` (User.id del JWT) es contacto primario o secundario de
 * una familia con relación de tutela sobre `studentId`.
 */
@Injectable()
export class FamilyAccessService {
  constructor(
    @InjectRepository(FamilyStudent) private readonly fsRepo: Repository<FamilyStudent>,
  ) {}

  async canFamilyAccessStudent(userId: string, studentId: string): Promise<boolean> {
    if (!userId || !studentId) return false;
    const row = await this.fsRepo
      .createQueryBuilder('fs')
      .innerJoin('fs.family', 'f')
      .where('fs.studentId = :studentId', { studentId })
      .andWhere('(f.primaryContactId = :userId OR f.secondaryContactId = :userId)', { userId })
      .getOne();
    return !!row;
  }
}
