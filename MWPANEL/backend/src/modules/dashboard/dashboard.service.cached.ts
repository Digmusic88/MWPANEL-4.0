import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { Subject } from '../students/entities/subject.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { CacheService } from '../../common/services/cache.service';
import { LoggerService } from '../../common/services/logger.service';

/**
 * Dashboard Service with caching for improved performance
 * Dashboard data is ideal for short-term caching (2-5 minutes)
 */
@Injectable()
export class DashboardServiceCached {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Student) private studentRepository: Repository<Student>,
    @InjectRepository(Teacher) private teacherRepository: Repository<Teacher>,
    @InjectRepository(ClassGroup) private classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Subject) private subjectRepository: Repository<Subject>,
    @InjectRepository(Activity) private activityRepository: Repository<Activity>,
    @InjectRepository(Evaluation) private evaluationRepository: Repository<Evaluation>,
    @InjectRepository(AttendanceRecord) private attendanceRepository: Repository<AttendanceRecord>,
    private cacheService: CacheService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('DashboardService');
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard() {
    const cacheKey = 'dashboard:admin:main';

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [
          totalUsers,
          totalStudents,
          totalTeachers,
          totalClasses,
          totalSubjects,
          activeStudents,
          recentActivities,
          usersByRole,
          monthlyStats,
        ] = await Promise.all([
          this.userRepository.count(),
          this.studentRepository.count(),
          this.teacherRepository.count(),
          this.classGroupRepository.count(),
          this.subjectRepository.count(),
          this.studentRepository.count(),
          this.getRecentActivities(),
          this.getUsersByRole(),
          this.getMonthlyStats(),
        ]);

        const data = {
          stats: {
            totalUsers,
            totalStudents,
            totalTeachers,
            totalClasses,
            totalSubjects,
            activeStudents,
            inactiveStudents: totalStudents - activeStudents,
          },
          usersByRole,
          recentActivities,
          monthlyStats,
          lastUpdated: new Date(),
        };

        this.logger.debug('Admin dashboard data loaded and cached');
        return data;
      },
      { ttl: 120 }, // Cache for 2 minutes
    );
  }

  /**
   * Get teacher dashboard data
   */
  async getTeacherDashboard(teacherId: string) {
    const cacheKey = `dashboard:teacher:${teacherId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const teacher = await this.teacherRepository.findOne({
          where: { id: teacherId },
          relations: ['subjectAssignments', 'subjectAssignments.classGroup', 'subjectAssignments.subject'],
        });

        if (!teacher) {
          throw new Error('Teacher not found');
        }

        const [
          totalStudents,
          pendingActivities,
          recentEvaluations,
          todayAttendance,
          upcomingActivities,
          classPerformance,
        ] = await Promise.all([
          this.getTotalStudentsForTeacher(teacherId),
          this.getPendingActivitiesForTeacher(teacherId),
          this.getRecentEvaluationsForTeacher(teacherId),
          this.getTodayAttendanceForTeacher(teacherId),
          this.getUpcomingActivitiesForTeacher(teacherId),
          this.getClassPerformanceForTeacher(teacherId),
        ]);

        const data = {
          teacher: {
            id: teacher.id,
            name: `${teacher.user.profile.firstName} ${teacher.user.profile.lastName}`,
            subjects: teacher.subjectAssignments.length,
            classes: new Set(teacher.subjectAssignments.map(sa => sa.classGroup.id)).size,
          },
          stats: {
            totalStudents,
            pendingActivities,
            completedEvaluations: recentEvaluations.length,
            todayAttendance,
          },
          recentEvaluations,
          upcomingActivities,
          classPerformance,
          lastUpdated: new Date(),
        };

        this.logger.debug(`Teacher dashboard data loaded and cached for ${teacherId}`);
        return data;
      },
      { ttl: 180 }, // Cache for 3 minutes
    );
  }

  /**
   * Get student dashboard data
   */
  async getStudentDashboard(studentId: string) {
    const cacheKey = `dashboard:student:${studentId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const student = await this.studentRepository.findOne({
          where: { id: studentId },
          relations: ['classGroup', 'evaluations', 'activityAssessments'],
        });

        if (!student) {
          throw new Error('Student not found');
        }

        const [
          averageGrade,
          pendingActivities,
          recentGrades,
          attendanceRate,
          upcomingTasks,
          competencyProgress,
        ] = await Promise.all([
          this.getAverageGradeForStudent(studentId),
          this.getPendingActivitiesForStudent(studentId),
          this.getRecentGradesForStudent(studentId),
          this.getAttendanceRateForStudent(studentId),
          this.getUpcomingTasksForStudent(studentId),
          this.getCompetencyProgressForStudent(studentId),
        ]);

        const data = {
          student: {
            id: student.id,
            name: `${(student as any).firstName || ''} ${(student as any).lastName || ''}`,
            class: (student as any).classGroups?.[0]?.name,
            enrollmentNumber: student.enrollmentNumber,
          },
          stats: {
            averageGrade,
            pendingActivities,
            completedActivities: (student as any).activityAssessments?.length || 0,
            attendanceRate,
          },
          recentGrades,
          upcomingTasks,
          competencyProgress,
          lastUpdated: new Date(),
        };

        this.logger.debug(`Student dashboard data loaded and cached for ${studentId}`);
        return data;
      },
      { ttl: 300 }, // Cache for 5 minutes
    );
  }

  /**
   * Get family dashboard data
   */
  async getFamilyDashboard(familyId: string) {
    const cacheKey = `dashboard:family:${familyId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const students = await this.studentRepository.find({
          where: { familyId: familyId } as any,
          relations: ['classGroup', 'evaluations', 'attendanceRecords'],
        });

        const childrenData = await Promise.all(
          students.map(async (student) => {
            const [averageGrade, attendanceRate, recentActivities] = await Promise.all([
              this.getAverageGradeForStudent(student.id),
              this.getAttendanceRateForStudent(student.id),
              this.getRecentActivitiesForStudent(student.id),
            ]);

            return {
              id: student.id,
              name: `${(student as any).firstName || ''} ${(student as any).lastName || ''}`,
              class: (student as any).classGroups?.[0]?.name,
              averageGrade,
              attendanceRate,
              recentActivities,
            };
          }),
        );

        const data = {
          children: childrenData,
          stats: {
            totalChildren: students.length,
            averageAttendance: childrenData.reduce((acc, child) => acc + child.attendanceRate, 0) / students.length,
            averageGrade: childrenData.reduce((acc, child) => acc + child.averageGrade, 0) / students.length,
          },
          lastUpdated: new Date(),
        };

        this.logger.debug(`Family dashboard data loaded and cached for ${familyId}`);
        return data;
      },
      { ttl: 300 }, // Cache for 5 minutes
    );
  }

  /**
   * Get quick stats for header/widgets
   */
  async getQuickStats(userId: string, role: UserRole) {
    const cacheKey = `dashboard:quick-stats:${role}:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        switch (role) {
          case UserRole.ADMIN:
            return {
              newUsers: await this.getNewUsersCount(),
              pendingTasks: await this.getPendingTasksCount(),
              activeClasses: await this.getActiveClassesCount(),
              systemHealth: 'good',
            };
          
          case UserRole.TEACHER:
            return {
              todayClasses: await this.getTodayClassesForTeacher(userId),
              pendingGrades: await this.getPendingGradesForTeacher(userId),
              unreadMessages: 0, // Would come from communications module
              nextClass: await this.getNextClassForTeacher(userId),
            };
          
          case UserRole.STUDENT:
            return {
              todayClasses: await this.getTodayClassesForStudent(userId),
              pendingTasks: await this.getPendingActivitiesForStudent(userId),
              unreadMessages: 0,
              nextClass: await this.getNextClassForStudent(userId),
            };
          
          default:
            return {};
        }
      },
      { ttl: 60 }, // Cache for 1 minute (quick stats change frequently)
    );
  }

  // Private helper methods (simplified for example)

  private async getRecentActivities(limit: number = 10) {
    return this.activityRepository.find({
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['teacher', 'subject'],
    });
  }

  private async getUsersByRole() {
    const roles = Object.values(UserRole);
    const counts = await Promise.all(
      roles.map(async (role) => ({
        role,
        count: await this.userRepository.count({ where: { role } }),
      })),
    );
    return counts;
  }

  private async getMonthlyStats() {
    // Implementation would query monthly statistics
    return {
      enrollments: [],
      activities: [],
      evaluations: [],
    };
  }

  private async getTotalStudentsForTeacher(teacherId: string): Promise<number> {
    // Implementation to count unique students for teacher
    return 0;
  }

  private async getPendingActivitiesForTeacher(teacherId: string): Promise<number> {
    return this.activityRepository.count({
      where: { teacher: { id: teacherId } } as any,
    });
  }

  private async getRecentEvaluationsForTeacher(teacherId: string) {
    return this.evaluationRepository.find({
      where: { teacher: { id: teacherId } },
      take: 5,
      order: { createdAt: 'DESC' },
    });
  }

  private async getTodayAttendanceForTeacher(teacherId: string): Promise<number> {
    // Implementation for today's attendance
    return 0;
  }

  private async getUpcomingActivitiesForTeacher(teacherId: string) {
    return this.activityRepository.find({
      where: { teacher: { id: teacherId } } as any,
      take: 5,
      order: { createdAt: 'ASC' } as any,
    });
  }

  private async getClassPerformanceForTeacher(teacherId: string) {
    // Implementation for class performance metrics
    return [];
  }

  private async getAverageGradeForStudent(studentId: string): Promise<number> {
    // Implementation to calculate average grade
    return 0;
  }

  private async getPendingActivitiesForStudent(studentId: string): Promise<number> {
    // Implementation to count pending activities
    return 0;
  }

  private async getRecentGradesForStudent(studentId: string) {
    // Implementation to get recent grades
    return [];
  }

  private async getAttendanceRateForStudent(studentId: string): Promise<number> {
    // Implementation to calculate attendance rate
    return 0;
  }

  private async getUpcomingTasksForStudent(studentId: string) {
    // Implementation to get upcoming tasks
    return [];
  }

  private async getCompetencyProgressForStudent(studentId: string) {
    // Implementation to get competency progress
    return [];
  }

  private async getRecentActivitiesForStudent(studentId: string) {
    // Implementation to get recent activities
    return [];
  }

  private async getNewUsersCount(): Promise<number> {
    // Count users created in last 7 days
    return 0;
  }

  private async getPendingTasksCount(): Promise<number> {
    // Count all pending tasks
    return 0;
  }

  private async getActiveClassesCount(): Promise<number> {
    return this.classGroupRepository.count({ where: {} as any });
  }

  private async getTodayClassesForTeacher(teacherId: string): Promise<number> {
    // Implementation for today's classes
    return 0;
  }

  private async getPendingGradesForTeacher(teacherId: string): Promise<number> {
    // Implementation for pending grades
    return 0;
  }

  private async getNextClassForTeacher(teacherId: string) {
    // Implementation for next class
    return null;
  }

  private async getTodayClassesForStudent(studentId: string): Promise<number> {
    // Implementation for today's classes
    return 0;
  }

  private async getNextClassForStudent(studentId: string) {
    // Implementation for next class
    return null;
  }
}