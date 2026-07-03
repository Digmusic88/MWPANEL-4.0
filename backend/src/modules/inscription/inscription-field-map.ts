import { guessGender, genderToRelationship } from '../import/gender';

export interface InscriptionGuardian { fullName: string; relationship: 'madre'|'padre'|'tutor'|'otro'; phone: string; email: string; isPrimary: boolean; }
export interface InscriptionBank { iban: string; holder: string; nif: string; bankName: string; }
export interface InscriptionPreview {
  student: { firstName: string; lastName: string; birthDate: string | null; address: string; city: string; notes: string; photoConsent: boolean | null; exitConsent: boolean | null; medicalText: string; };
  guardians: InscriptionGuardian[];
  family: { displayName: string; notes: string; };
  bank: InscriptionBank | null;
  warnings: string[];
}

const g = (f: Record<string,string>, k: string) => (f[k] || '').trim();
const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(' ');

function composeBirthDate(f: Record<string,string>): string | null {
  const d = g(f, 'DÍALUGAR Y FECHA DE NACIMIENTO');
  const m = g(f, 'MESLUGAR Y FECHA DE NACIMIENTO');
  const y = g(f, 'AÑOLUGAR Y FECHA DE NACIMIENTO');
  if (!d || !m || !y) return null;
  const dd = String(parseInt(d, 10)).padStart(2, '0');
  const mm = String(parseInt(m, 10)).padStart(2, '0');
  if (isNaN(+dd) || isNaN(+mm) || y.length !== 4) return null;
  return `${y}-${mm}-${dd}`;
}

function relationshipFor(fullName: string): 'madre'|'padre'|'tutor' {
  return genderToRelationship(guessGender(fullName)) ?? 'tutor';
}

export function mapFieldsToInscription(f: Record<string,string>, group4: string|null): InscriptionPreview {
  const warnings: string[] = [];

  const firstName = g(f, 'NOMBRERow1');
  const lastName = join(g(f, 'PRIMER APELLIDORow1'), g(f, 'SEGUNDO APELLIDORow1'));
  const birthDate = composeBirthDate(f);
  if (!firstName || !lastName) warnings.push('Falta nombre o apellidos del alumno');
  if (!birthDate) warnings.push('Falta o es inválida la fecha de nacimiento');

  const address = join(g(f, 'CALLEDIRECCIÓN DE RESIDENCIA HABITUAL'), g(f, 'NDIRECCIÓN DE RESIDENCIA HABITUAL'));

  const medicalParts: string[] = [];
  const addMed = (label: string, key: string) => { const v = g(f, key); if (v) medicalParts.push(`${label}: ${v}`); };
  addMed('Dificultades de aprendizaje', 'DIFICULTADES DE APRENDIZAJE DIAGNOSTICADASRow1');
  addMed('Pediatra', 'PEDIATRARow1');
  addMed('Alergias', 'ALERGIAS CONOCIDAS obligado certificado médicoRow1');
  addMed('Tratamiento reacción', 'TRATAMIENTO en caso de reacciónRow1');
  addMed('Intolerancias', 'INTOLERANCIAS ALIMENTICIAS certificado médicoRow1');
  addMed('Tratamiento reacción 2', 'TRATAMIENTO en caso de reacciónRow1_2');
  addMed('Contacto emergencia', 'CONTACTO EN CASO DE EMERGENCIARow1');
  addMed('Tel. emergencia', 'TELÉFONORow1_4');
  addMed('Centro médico', 'CENTRO MEDICORow1');
  addMed('Tel. centro médico', 'NUMEROTELEFONORow1_2');
  const medicalText = medicalParts.join('\n');

  // Notas blandas del alumno
  const softStudent: string[] = [];
  const addSoft = (label: string, key: string) => { const v = g(f, key); if (v) softStudent.push(`${label}: ${v}`); };
  addSoft('Lugar de nacimiento', 'CIUDADLUGAR Y FECHA DE NACIMIENTO');
  addSoft('Email alumno', 'EMAIL DEL ALUMNOADIRECCIÓN DE RESIDENCIA HABITUAL');
  addSoft('Tel. alumno', 'TELÉFONODIRECCIÓN DE RESIDENCIA HABITUAL');
  addSoft('Asignatura favorita', 'ASIGNATURA FAVORITARow1');
  addSoft('Asignatura menos favorita', 'ASIGNATURA QUE LE GUSTA MENOSRow1');
  addSoft('Deporte', 'DEPORTERow1');
  addSoft('Música/Danza', 'MÚSICADANZARow1');
  addSoft('Otros', 'OTROSRow1');

  // Consentimientos: el radio Group4 de la plantilla viene pre-marcado 'Opción1'
  // INCLUSO en blanco → "sin responder" y "Opción1 elegido" son INDISTINGUIBLES
  // (verificado contra la plantilla real en Task 1). Por tanto NO se infiere el
  // consentimiento del PDF; lo fija el personal en la preview editable (Switches).
  void group4;
  const photoConsent: boolean | null = null;
  const exitConsent: boolean | null = null;
  warnings.push('Confirma manualmente los consentimientos de imagen y salidas (el PDF no los distingue con fiabilidad)');

  // Tutores
  const guardians: InscriptionGuardian[] = [];
  const gName1 = join(g(f, 'NOMBRERow1_2'), g(f, 'PRIMER APELLIDORow1_2'), g(f, 'SEGUNDO APELLIDORow1_2'));
  if (gName1) guardians.push({ fullName: gName1, relationship: relationshipFor(gName1), phone: g(f, 'TELÉFONORow1'), email: g(f, 'EMAILRow1'), isPrimary: true });
  const gName2 = join(g(f, 'NOMBRERow1_3'), g(f, 'PRIMER APELLIDORow1_3'), g(f, 'SEGUNDO APELLIDORow1_3'));
  if (gName2) guardians.push({ fullName: gName2, relationship: relationshipFor(gName2), phone: g(f, 'TELÉFONORow1_2'), email: g(f, 'EMAILRow1_2'), isPrimary: false });
  const gName3 = join(g(f, 'NOMBRERow1_4'), g(f, 'PRIMER APELLIDORow1_4'), g(f, 'SEGUNDO APELLIDORow1_4'));
  if (gName3) {
    const rel = g(f, 'RELACIÓN CON EL ALUMNORow1').toLowerCase();
    const relEnum: 'madre'|'padre'|'tutor'|'otro' = ['madre','padre','tutor'].includes(rel) ? (rel as any) : 'otro';
    guardians.push({ fullName: gName3, relationship: relEnum, phone: g(f, 'TELÉFONORow1_3'), email: g(f, 'EMAILRow1_3'), isPrimary: false });
  }
  if (guardians.length === 0) warnings.push('No se detectó ningún tutor/contacto');

  // Familia (profesión de tutores + hermanos en notas)
  const famNotes: string[] = [];
  const prof1 = g(f, 'PROFESIÓNRow1'); if (prof1) famNotes.push(`Profesión ${gName1 || 'contacto 1'}: ${prof1}`);
  const prof2 = g(f, 'PROFESIÓNRow1_2'); if (prof2) famNotes.push(`Profesión ${gName2 || 'contacto 2'}: ${prof2}`);
  const hermanos = g(f, 'HERMANOSAS en el caso de que los hubieraRow1'); if (hermanos) famNotes.push(`Hermanos/as: ${hermanos}`);

  // Banco: componer IBAN de ES + Cuenta bancaria 2..6; solo si hay algo
  const ibanParts = ['ES', 'Cuenta bancaria 2', 'Cuenta bancaria 3', 'Cuenta bancaria 4', 'Cuenta bancaria 5', 'Cuenta bancaria 6'].map((k) => g(f, k)).filter(Boolean);
  let bank: InscriptionBank | null = null;
  if (ibanParts.length > 0) {
    bank = {
      iban: ibanParts.join('').replace(/\s+/g, '').toUpperCase(),
      holder: g(f, 'TITULAR DE LA CUENTARow1'),
      nif: g(f, 'NIFNIERow1'),
      bankName: g(f, 'ENTIDAD BANCARIARow1'),
    };
  }

  return {
    student: { firstName, lastName, birthDate, address, city: '', notes: softStudent.join('\n'), photoConsent, exitConsent, medicalText },
    guardians,
    family: { displayName: lastName || firstName || 'Familia', notes: famNotes.join('\n') },
    bank,
    warnings,
  };
}
