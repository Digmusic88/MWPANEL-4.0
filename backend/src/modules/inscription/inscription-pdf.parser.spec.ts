import { readFileSync } from 'fs';
import { parseInscriptionPdf } from './inscription-pdf.parser';

const TEMPLATE = '/opt/docs/inscripciones/Plantilla-inscripcion.pdf';

describe('parseInscriptionPdf', () => {
  it('extrae los campos del formulario de la plantilla vacía', async () => {
    const { fields, group4 } = await parseInscriptionPdf(readFileSync(TEMPLATE));
    expect(Object.keys(fields).length).toBe(67);
    expect(fields).toHaveProperty('NOMBRERow1');
    expect(fields).toHaveProperty('ALERGIAS CONOCIDAS obligado certificado médicoRow1');
    // plantilla vacía → todos los campos de texto en blanco.
    // NOTA: el radio "Group4" viene con "Opción1" pre-marcado de fábrica en la
    // plantilla real (el AcroForm tiene /V y /AS del widget apuntando a
    // "Opción1" aunque nadie ha rellenado el formulario) — no es un bug del
    // parser, es un dato verificado de la plantilla en
    // /opt/docs/inscripciones/Plantilla-inscripcion.pdf. Ver reporte de la tarea.
    const textFieldValues = Object.entries(fields)
      .filter(([name]) => name !== 'Group4')
      .map(([, v]) => v);
    expect(textFieldValues.every((v) => v === '')).toBe(true);
    expect(group4).toBe('Opción1');
  });

  it('lanza error si el PDF no tiene campos de formulario', async () => {
    // un PDF mínimo sin AcroForm
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage();
    const bytes = await doc.save();
    await expect(parseInscriptionPdf(Buffer.from(bytes))).rejects.toThrow('sin campos de formulario');
  });
});
