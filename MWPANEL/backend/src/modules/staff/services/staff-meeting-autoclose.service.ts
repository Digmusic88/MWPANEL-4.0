/**
 * @archivo: staff-meeting-autoclose.service.ts
 * @modulo: Staff (Claustro)
 * @funcion: Cierra y archiva automaticamente reuniones activas vencidas (>30 dias)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StaffMeeting, StaffMeetingStatus } from '../entities/staff-meeting.entity';
import { isMeetingAutoCloseDue, AUTO_CLOSE_DAYS } from '../utils/staff-meeting.utils';

@Injectable()
export class StaffMeetingAutoCloseService {
  private readonly logger = new Logger(StaffMeetingAutoCloseService.name);

  constructor(
    @InjectRepository(StaffMeeting)
    private readonly meetingRepository: Repository<StaffMeeting>,
  ) {}

  /** Cada día a las 04:00 cierra/archiva las reuniones activas vencidas hace más de 30 días. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async autoCloseStaleMeetings(): Promise<void> {
    const now = new Date();
    const active = await this.meetingRepository.find({
      where: { status: In([StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS]) },
    });
    const due = active.filter((m) => isMeetingAutoCloseDue(m.status, m.scheduledDate, now));
    if (due.length === 0) return;

    const stamp = `[Cerrada y archivada automáticamente por el sistema el ${now.toLocaleDateString('es-ES')} tras más de ${AUTO_CLOSE_DAYS} días sin cerrarse.]`;
    for (const meeting of due) {
      meeting.status = StaffMeetingStatus.COMPLETED;
      meeting.notes = meeting.notes ? `${meeting.notes}\n\n${stamp}` : stamp;
    }
    await this.meetingRepository.save(due);
    this.logger.log(`Auto-cerradas ${due.length} reunion(es) del claustro tras ${AUTO_CLOSE_DAYS} dias.`);
  }
}
