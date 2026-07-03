import { PDFDocument, PDFTextField, PDFRadioGroup } from 'pdf-lib';

export async function parseInscriptionPdf(
  buffer: Buffer,
): Promise<{ fields: Record<string, string>; group4: string | null }> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const form = doc.getForm();
  const all = form.getFields();
  if (all.length === 0) {
    throw new Error('PDF sin campos de formulario (¿escaneado? use la plantilla digital)');
  }
  const fields: Record<string, string> = {};
  let group4: string | null = null;
  for (const f of all) {
    const name = f.getName();
    if (f instanceof PDFTextField) {
      fields[name] = (f.getText() || '').trim();
    } else if (f instanceof PDFRadioGroup) {
      const selected = f.getSelected() || null;
      fields[name] = selected || '';
      if (name === 'Group4') group4 = selected;
    }
  }
  return { fields, group4 };
}
