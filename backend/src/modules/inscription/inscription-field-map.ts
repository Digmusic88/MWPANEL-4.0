import { guessGender, genderToRelationship } from '../import/gender';

export interface InscriptionGuardian { fullName: string; relationship: 'madre'|'padre'|'tutor'|'otro'; nif: string; phone: string; email: string; profession: string; isPrimary: boolean; }

/** ¿El texto tiene forma de DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra)? */
const looksLikeDni = (s: string): boolean => /^[XYZ]?\d{7,8}[A-Za-z]$/.test((s || '').replace(/[\s-]/g, ''));
const normalizeDni = (s: string): string => (s || '').replace(/[\s-]/g, '').toUpperCase();
export interface InscriptionBank { iban: string; holder: string; nif: string; bankName: string; }
export interface InscriptionPreview {
  student: { firstName: string; lastName: string; birthDate: string | null; birthPlace: string; email: string; phone: string; address: string; city: string; interests: string; notes: string; photoConsent: boolean | null; exitConsent: boolean | null; medicalText: string; };
  guardians: InscriptionGuardian[];
  family: { displayName: string; siblings: string; notes: string; };
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

  // Identidad/contacto del alumno → campos propios (antes iban a "notas")
  const birthPlace = g(f, 'CIUDADLUGAR Y FECHA DE NACIMIENTO');
  const studentEmail = g(f, 'EMAIL DEL ALUMNOADIRECCIÓN DE RESIDENCIA HABITUAL');
  const studentPhone = g(f, 'TELÉFONODIRECCIÓN DE RESIDENCIA HABITUAL');

  // Perfil blando de intereses → campo 'interests' (sección etiquetada, no notas genéricas)
  const interestParts: string[] = [];
  const addInterest = (label: string, key: string) => { const v = g(f, key); if (v) interestParts.push(`${label}: ${v}`); };
  addInterest('Asignatura favorita', 'ASIGNATURA FAVORITARow1');
  addInterest('Asignatura menos favorita', 'ASIGNATURA QUE LE GUSTA MENOSRow1');
  addInterest('Deporte', 'DEPORTERow1');
  addInterest('Música/Danza', 'MÚSICADANZARow1');
  addInterest('Otros', 'OTROSRow1');
  const interests = interestParts.join('\n');

  // Consentimientos: el radio Group4 de la plantilla viene pre-marcado 'Opción1'
  // INCLUSO en blanco → "sin responder" y "Opción1 elegido" son INDISTINGUIBLES
  // (verificado contra la plantilla real en Task 1). Por tanto NO se infiere el
  // consentimiento del PDF; lo fija el personal en la preview editable (Switches).
  void group4;
  const photoConsent: boolean | null = null;
  const exitConsent: boolean | null = null;
  warnings.push('Confirma manualmente los consentimientos de imagen y salidas (el PDF no los distingue con fiabilidad)');

  // Tutores. ⚠️ En la plantilla, el campo "SEGUNDO APELLIDO" de cada tutor viene
  // relleno EN LA PRÁCTICA con el DNI (no con el 2º apellido). Si el valor tiene forma
  // de DNI/NIE lo guardamos como `nif` y NO lo concatenamos al nombre; si no, se trata
  // como segundo apellido normal.
  const guardians: InscriptionGuardian[] = [];
  const pushGuardian = (
    nameK: string, ape1K: string, ape2K: string, phoneK: string, emailK: string, professionK: string,
    isPrimary: boolean, relOverride?: 'madre'|'padre'|'tutor'|'otro',
  ) => {
    const seg = g(f, ape2K);
    const isDni = looksLikeDni(seg);
    const fullName = join(g(f, nameK), g(f, ape1K), isDni ? '' : seg);
    if (!fullName) return;
    guardians.push({
      fullName,
      relationship: relOverride ?? relationshipFor(fullName),
      nif: isDni ? normalizeDni(seg) : '',
      phone: g(f, phoneK),
      email: g(f, emailK),
      profession: professionK ? g(f, professionK) : '',
      isPrimary,
    });
  };
  pushGuardian('NOMBRERow1_2', 'PRIMER APELLIDORow1_2', 'SEGUNDO APELLIDORow1_2', 'TELÉFONORow1', 'EMAILRow1', 'PROFESIÓNRow1', true);
  pushGuardian('NOMBRERow1_3', 'PRIMER APELLIDORow1_3', 'SEGUNDO APELLIDORow1_3', 'TELÉFONORow1_2', 'EMAILRow1_2', 'PROFESIÓNRow1_2', false);
  const rel3 = g(f, 'RELACIÓN CON EL ALUMNORow1').toLowerCase();
  const rel3Enum: 'madre'|'padre'|'tutor'|'otro' = ['madre','padre','tutor'].includes(rel3) ? (rel3 as any) : 'otro';
  pushGuardian('NOMBRERow1_4', 'PRIMER APELLIDORow1_4', 'SEGUNDO APELLIDORow1_4', 'TELÉFONORow1_3', 'EMAILRow1_3', '', false, rel3Enum);
  if (guardians.length === 0) warnings.push('No se detectó ningún tutor/contacto');

  // Familia: hermanos → campo propio (antes en notas)
  const siblings = g(f, 'HERMANOSAS en el caso de que los hubieraRow1');

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
    student: { firstName, lastName, birthDate, birthPlace, email: studentEmail, phone: studentPhone, address, city: '', interests, notes: '', photoConsent, exitConsent, medicalText },
    guardians,
    family: { displayName: lastName || firstName || 'Familia', siblings, notes: '' },
    bank,
    warnings,
  };
}
