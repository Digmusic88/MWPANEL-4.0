// Crypto polyfill must be loaded before any other imports
import './polyfills';

import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { FamiliesModule } from './modules/families/families.module';
import { ClassGroupsModule } from './modules/class-groups/class-groups.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { CompetenciesModule } from './modules/competencies/competencies.module';
import { CriterionAssessmentModule } from './modules/criterion-assessment/criterion-assessment.module';
import { CriterionKnowledgeModule } from './modules/criterion-knowledge/criterion-knowledge.module';
import { CurriculumGenerationModule } from './modules/curriculum-generation/curriculum-generation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { DailyHomeworkModule } from './modules/daily-homework/daily-homework.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AcademicRecordsModule } from './modules/academic-records/academic-records.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { GradesModule } from './modules/grades/grades.module';
import { CoordinationModule } from './modules/coordination/coordination.module';
import { EducationalResourcesModule } from './modules/educational-resources/educational-resources.module';
import { ResourceAssignmentsModule } from './modules/resource-assignments/resource-assignments.module';
import { SemanticEvaluationModule } from './modules/semantic-evaluation/semantic-evaluation.module';
import { DuaModule } from './modules/dua/dua.module';
import { TutoringModule } from './modules/tutoring/tutoring.module';
import { FacialRecognitionModule } from './modules/facial-recognition/facial-recognition.module';
import { AdminModule } from './modules/admin/admin.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { StudentNotesModule } from './modules/student-notes/student-notes.module';
import { HealthController } from './health.controller';
import { SimpleBackupController } from './simple-backup.controller';
import { HuggingFaceAIService } from './services/huggingface-ai.service';
import { HuggingFaceMCPService } from './services/ai/huggingface-mcp.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { ClosureMiddleware } from './common/middleware/closure.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RgpdGroupingInterceptor } from './common/interceptors/rgpd-grouping.interceptor';
import { LoggerService } from './common/services/logger.service';
import { DDoSProtectionService } from './common/services/ddos-protection.service';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import googleConfig from './config/google.config';
import loggerConfig from './config/logger.config';
import rateLimitConfig from './config/rate-limit.config';
import cacheConfig from './config/cache.config';
import prometheusConfig from './config/prometheus.config';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { BlogModule } from './modules/blog/blog.module';
import { CacheModule as CacheApiModule } from './modules/cache/cache.module';
import { LogbookModule } from './modules/logbook/logbook.module';
import { StudentReportsModule } from './modules/student-reports/student-reports.module';
import { StaffModule } from './modules/staff/staff.module';
import { TeacherStudentAccessModule } from './modules/teacher-student-access/teacher-student-access.module';
import { StudentReportGeneratorModule } from './modules/student-report-generator/student-report-generator.module';
import { TeacherAcademiaModule } from './modules/teacher-academia/teacher-academia.module';
import { StudentCurriculumModule } from './modules/student-curriculum/student-curriculum.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, googleConfig, loggerConfig, rateLimitConfig, cacheConfig, prometheusConfig],
      envFilePath: '.env',
    }),

    // Winston Logger
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('logger'),
      }),
      inject: [ConfigService],
    }),

    // Schedule Module for cron jobs
    ScheduleModule.forRoot(),

    // Throttler Module for rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [{
          name: 'global',
          ttl: 60000, // 1 minute in milliseconds
          limit: 5000, // 5000 requests per minute (very generous for production)
        }],
        skipIf: (context) => {
          const request = context.switchToHttp().getRequest();
          // Skip rate limiting for health checks and docs
          return request.path.includes('/health') || request.path.includes('/docs');
        },
      }),
      inject: [ConfigService],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Disable to prevent enum conflicts
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    FamiliesModule,
    ClassGroupsModule,
    SubjectsModule,
    SchedulesModule,
    AcademicYearsModule,
    EnrollmentModule,
    EvaluationsModule,
    CompetenciesModule,
    CriterionAssessmentModule,
    CriterionKnowledgeModule,
    CurriculumGenerationModule,
    DashboardModule,
    CommunicationsModule,
    AttendanceModule,
    ActivitiesModule,
    DailyHomeworkModule,
    TasksModule,
    SettingsModule,
    AcademicRecordsModule,
    CalendarModule,
    GradesModule,
    CoordinationModule,
    EducationalResourcesModule,
    ResourceAssignmentsModule,
    SemanticEvaluationModule,
    DuaModule,
    TutoringModule,
    FacialRecognitionModule,
    AdminModule,
    LessonsModule,
    StudentNotesModule,
    MeetingsModule,
    BlogModule,
    CacheApiModule,
    LogbookModule,
    StudentReportsModule,
    StaffModule,
    TeacherStudentAccessModule,
    StudentReportGeneratorModule,
    TeacherAcademiaModule,
    StudentCurriculumModule,
  ],
  controllers: [
    HealthController,
    SimpleBackupController,
  ],
  providers: [
    LoggerService,
    DDoSProtectionService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      // Bloqueo RGPD: quita grupo/etapa/nivel/curso de las respuestas a familia/alumno
      provide: APP_INTERCEPTOR,
      useClass: RgpdGroupingInterceptor,
    },
    HuggingFaceAIService,
    HuggingFaceMCPService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes('*')
      .apply(MaintenanceMiddleware)
      .forRoutes('*')
      .apply(ClosureMiddleware)
      .forRoutes('*');
  }
}