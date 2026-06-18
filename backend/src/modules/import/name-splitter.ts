// Separa un nombre completo español en nombre(s) de pila y apellidos.
//
// Heurística:
//  - Se descartan anotaciones del personal: (...), [...], '*', '--'.
//  - Las partículas (de, del, de la, San, ...) se fusionan HACIA ADELANTE con
//    la palabra siguiente formando un bloque de apellido. Esto respeta tanto
//    apellidos con partícula inicial ("del Haya López") como nombres compuestos
//    ("Alex Anthony", "María José"), que quedan en el nombre de pila.
//  - Por defecto los 2 últimos bloques son apellidos; el resto es el nombre.
//  - Caso ambiguo conocido (no resoluble sin diccionario): apellidos con
//    partícula nobiliaria intermedia ("Sánchez de Muniain") se cuentan como dos
//    bloques, dejando una palabra de más en el nombre. Esas filas se marcan con
//    `flagged` para revisión manual.

const PARTICLES = new Set([
  'de', 'del', 'la', 'las', 'los', 'san', 'santa', 'y', 'e',
  'da', 'do', 'dos', 'das', 'van', 'von', 'der', 'di', 'della', 'du', 'le',
]);

export interface SplitResult {
  firstName: string;
  lastName: string;
  flagged: boolean;
  reason?: string;
}

export function stripAnnotations(raw: string): string {
  let s = raw || '';
  s = s.replace(/\([^)]*\)/g, ' '); // (...)
  s = s.replace(/\[[^\]]*\]/g, ' '); // [...]
  s = s.replace(/[*]+/g, ' '); // asteriscos
  s = s.replace(/--+/g, ' '); // dobles guiones
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function splitName(raw: string): SplitResult {
  const original = (raw || '').replace(/\s+/g, ' ').trim();
  const cleaned = stripAnnotations(raw);
  const tokens = cleaned.split(' ').filter(Boolean);

  if (tokens.length === 0) {
    return { firstName: '', lastName: '', flagged: true, reason: 'vacío tras limpiar' };
  }
  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: '', flagged: true, reason: 'sin apellido' };
  }

  // Construir bloques de apellido fusionando partículas hacia adelante.
  const units: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (PARTICLES.has(tokens[i].toLowerCase())) {
      const parts: string[] = [];
      while (i < tokens.length && PARTICLES.has(tokens[i].toLowerCase())) {
        parts.push(tokens[i]);
        i++;
      }
      if (i < tokens.length) {
        parts.push(tokens[i]);
        i++;
      }
      units.push(parts.join(' '));
    } else {
      units.push(tokens[i]);
      i++;
    }
  }

  let firstName: string;
  let lastName: string;
  if (units.length <= 2) {
    firstName = units[0];
    lastName = units.slice(1).join(' ');
  } else {
    firstName = units.slice(0, units.length - 2).join(' ');
    lastName = units.slice(units.length - 2).join(' ');
  }

  const reasons: string[] = [];
  if (cleaned !== original) reasons.push('anotación eliminada');
  if (firstName.split(' ').filter(Boolean).length > 1) reasons.push('nombre compuesto / revisar apellido');
  if (tokens.some((t) => /^[a-záéíóúñü]/.test(t))) reasons.push('token en minúscula');
  if (tokens.length >= 5) reasons.push('5+ palabras');

  return {
    firstName,
    lastName,
    flagged: reasons.length > 0,
    reason: reasons.length ? reasons.join('; ') : undefined,
  };
}
