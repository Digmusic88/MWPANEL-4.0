import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CatalogModule } from './modules/catalog/catalog.module';
import { FamiliesModule } from './modules/families/families.module';
import { StudentsModule } from './modules/students/students.module';
import { FeeSchedulesModule } from './modules/fee-schedules/fee-schedules.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SepaModule } from './modules/sepa/sepa.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ScheduleSlotsModule } from './modules/schedule/schedule.module';
import { LevelTestsModule } from './modules/level-tests/level-tests.module';
import { TaperModule } from './modules/taper/taper.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ImportModule } from './modules/import/import.module';
import { RafflesModule } from './modules/raffles/raffles.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { MocksModule } from './modules/mocks/mocks.module';
import { ChatModule } from './modules/chat/chat.module';
import { AccessModule } from './modules/access/access.module';
import { ApoyoModule } from './modules/apoyo/apoyo.module';
import { DanzaModule } from './modules/danza/danza.module';
import { StatsModule } from './modules/stats/stats.module';
import { HistoryModule } from './modules/history/history.module';
import { TareasModule } from './modules/tareas/tareas.module';
import { ExamenesModule } from './modules/examenes/examenes.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { CalendarioModule } from './modules/calendario/calendario.module';
import { NotebookModule } from './modules/notebook/notebook.module';
import { RealtimeModule } from './realtime/realtime.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'mw-panel-db-prod',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'mwpanel',
      password: process.env.DB_PASS,
      database: process.env.DB_NAME || 'mwpanel',
      schema: process.env.DB_SCHEMA || 'secretaria',
      autoLoadEntities: true,
      synchronize: false, // las tablas se gestionan por migraciones SQL
    }),
    AuthModule, CatalogModule, FamiliesModule, StudentsModule, FeeSchedulesModule, EnrollmentsModule, PaymentsModule, SepaModule, DocumentsModule, ScheduleSlotsModule, LevelTestsModule, TaperModule, ReportsModule, ImportModule, RafflesModule, TeachersModule, AttendanceModule, MocksModule, ChatModule, AccessModule, ApoyoModule, StatsModule, HistoryModule, TareasModule, ExamenesModule, EventosModule, MeetingsModule, CalendarioModule, NotebookModule, RealtimeModule, DanzaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
