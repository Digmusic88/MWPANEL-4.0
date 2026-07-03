import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { parseInscriptionPdf } from './inscription-pdf.parser';
import { mapFieldsToInscription, InscriptionPreview } from './inscription-field-map';

export type InscriptionPreviewResult = InscriptionPreview & { duplicateCandidateId: string | null };

@Injectable()
export class InscriptionService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async preview(buffer: Buffer): Promise<InscriptionPreviewResult> {
    const { fields, group4 } = await parseInscriptionPdf(buffer);
    const mapped = mapFieldsToInscription(fields, group4);
    let duplicateCandidateId: string | null = null;
    if (mapped.student.firstName && mapped.student.lastName && mapped.student.birthDate) {
      const rows = await this.ds.query(
        `SELECT id FROM secretaria.students WHERE lower(first_name)=lower($1) AND lower(last_name)=lower($2) AND birth_date=$3::date LIMIT 1`,
        [mapped.student.firstName, mapped.student.lastName, mapped.student.birthDate],
      );
      if (rows.length) { duplicateCandidateId = rows[0].id; mapped.warnings.push('Ya existe un alumno con ese nombre y fecha de nacimiento'); }
    }
    return { ...mapped, duplicateCandidateId };
  }
}
