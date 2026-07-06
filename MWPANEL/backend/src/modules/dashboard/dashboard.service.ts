import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Evaluation, EvaluationStatus } from '../evaluations/entities/evaluation.entity';
import { ClassGroup } from '../students/entities/class-group.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(ClassGroup)
    private classGroupsRepository: Repository<ClassGroup>,
  ) {}

  async getStats() {
    // Count total students
    const totalStudents = await this.studentsRepository.count({
      relations: ['user'],
      where: {
        user: {
          isActive: true,
        },
      },
    });

    // Count total teachers
    const totalTeachers = await this.teachersRepository.count({
      relations: ['user'],
      where: {
        user: {
          isActive: true,
        },
      },
    });

    // Count total classes
    const totalClasses = await this.classGroupsRepository.count();

    // Count evaluations
    const [completedEvaluations, pendingEvaluations] = await Promise.all([
      this.evaluationsRepository.count({
        where: {
          status: EvaluationStatus.FINALIZED,
        },
      }),
      this.evaluationsRepository.count({
        where: {
          status: EvaluationStatus.DRAFT,
        },
      }),
    ]);

    // Calculate average grade (simplified for now)
    const evaluations = await this.evaluationsRepository.find({
      where: {
        status: EvaluationStatus.FINALIZED,
      },
    });
    
    const averageGrade = evaluations.length > 0 
      ? evaluations.reduce((sum, evaluation) => sum + (evaluation.overallScore || 0), 0) / evaluations.length
      : 8.3; // Default value

    // Get distribution by educational level
    const studentsByLevel = await this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.educationalLevel', 'level')
      .leftJoinAndSelect('student.user', 'user')
      .where('user.isActive = :isActive', { isActive: true })
      .getMany();

    const levelDistribution = {
      infantil: studentsByLevel.filter(s => s.educationalLevel?.name?.toLowerCase().includes('infantil')).length,
      primaria: studentsByLevel.filter(s => s.educationalLevel?.name?.toLowerCase().includes('primaria')).length,
      secundaria: studentsByLevel.filter(s => s.educationalLevel?.name?.toLowerCase().includes('secundaria')).length,
      other: studentsByLevel.filter(s => !s.educationalLevel).length,
    };

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      completedEvaluations,
      pendingEvaluations,
      averageGrade: Number(averageGrade.toFixed(1)),
      levelDistribution,
      lastUpdated: new Date(),
    };
  }
}