// Currículo de Educación Secundaria Obligatoria de Navarra (Anexo II).
// Criterios y saberes vienen por los 3 cursos del primer tramo (1ESO, 2ESO, 3ESO).
// Códigos crudos: CE "1".."n"; criterio "<n>.<m>"; saber "<LETRA><sub>.<item>" (ej. "A1.1").
// El seed compone: CE -> "CE<n>"; criterio -> "<ABBREV>-<n>.<m>"; el saber conserva su código.

export type Course = '1ESO' | '2ESO' | '3ESO' | '4ESO';

export interface CriterionData {
  course: Course;
  code: string; // "1.1"
  description: string;
}

export interface KnowledgeData {
  course: Course;
  code: string; // "A1.1"
  description: string;
}

export interface KnowledgeBlock {
  letter: string; // "A".."F" (sentido / bloque)
  title: string; // p.ej. "Sentido numérico"
  items: KnowledgeData[];
}

export interface SpecificCompetencyData {
  code: string; // "1".."n"
  name: string; // etiqueta breve editorial
  description: string; // texto oficial de la competencia específica
  keyCompetencyCodes: string[]; // claves colapsadas de la Vinculación al Perfil de salida
  criteria: CriterionData[]; // criterios de los 3 cursos (lista plana con su curso)
}

export interface AreaData {
  subjectCode: string; // 'MAT-1ESO'
  abbrev: string; // 'MAT'
  areaName: string;
  competencies: SpecificCompetencyData[];
  knowledgeBlocks: KnowledgeBlock[];
}

export const VALID_KEY_COMPETENCY_CODES = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'] as const;
export const VALID_SUBJECT_CODES = ['MAT-1ESO','MATA-4ESO','MATB-4ESO','BG-1ESO','DIG-4ESO','EE-4ESO','EF-1ESO','EPVA-1ESO','VCE-3ESO','EXART-4ESO','FQ-1ESO','FOPP-4ESO','GH-1ESO','LAT-4ESO','LCL-1ESO','ING-1ESO','MUS-1ESO','FRA-4ESO','TEC-1ESO'] as const;
export const VALID_AREA_ABBREVS = ['MAT','MATA','MATB','BG','DIG','EE','EF','EPVA','VCE','EXART','FQ','FOPP','GH','LAT','LCL','ING','MUS','FRA','TEC'] as const;
export const VALID_COURSES = ['1ESO', '2ESO', '3ESO', '4ESO'] as const;

const CRITERION_CODE_RE = /^\d+\.\d+$/;
const KNOWLEDGE_CODE_RE = /^[A-Z]\d*\.\d+$/; // acepta ambos formatos: bloque plano (A.10) y sentido+subbloque (A1.1)

export function validateSecundariaCurriculum(areas: AreaData[]): string[] {
  const errors: string[] = [];
  const courses = VALID_COURSES as readonly string[];
  for (const area of areas) {
    const a = `[${area.areaName}]`;
    if (!(VALID_SUBJECT_CODES as readonly string[]).includes(area.subjectCode)) errors.push(`${a} subjectCode desconocido: ${area.subjectCode}`);
    if (!(VALID_AREA_ABBREVS as readonly string[]).includes(area.abbrev)) errors.push(`${a} abreviatura desconocida: ${area.abbrev}`);

    const ceCodes = new Set<string>();
    for (const ce of area.competencies) {
      const c = `${a} CE${ce.code}`;
      if (ceCodes.has(ce.code)) errors.push(`${c}: código de CE duplicado`);
      ceCodes.add(ce.code);
      if (!/^\d+$/.test(ce.code)) errors.push(`${c}: código de CE no numérico`);
      if (!ce.keyCompetencyCodes || ce.keyCompetencyCodes.length === 0) errors.push(`${c}: sin competencias clave`);
      for (const k of ce.keyCompetencyCodes || []) {
        if (!(VALID_KEY_COMPETENCY_CODES as readonly string[]).includes(k)) errors.push(`${c}: competencia clave inválida: ${k}`);
      }
      if (!ce.criteria || ce.criteria.length === 0) errors.push(`${c}: sin criterios`);
      const seen = new Set<string>();
      for (const crit of ce.criteria || []) {
        if (!courses.includes(crit.course)) errors.push(`${c} ${crit.code}: curso inválido: ${crit.course}`);
        if (!CRITERION_CODE_RE.test(crit.code)) errors.push(`${c}: código de criterio malformado: ${crit.code}`);
        const key = `${crit.course}|${crit.code}`;
        if (seen.has(key)) errors.push(`${c}: criterio duplicado en (${crit.course}, ${crit.code})`);
        seen.add(key);
        if (!crit.description || !crit.description.trim()) errors.push(`${c} ${crit.course} ${crit.code}: descripción vacía`);
      }
    }

    const blockLetters = new Set<string>();
    for (const block of area.knowledgeBlocks) {
      const b = `${a} bloque ${block.letter}`;
      if (blockLetters.has(block.letter)) errors.push(`${b}: bloque duplicado`);
      blockLetters.add(block.letter);
      if (!block.title || !block.title.trim()) errors.push(`${b}: título vacío`);
      const seen = new Set<string>();
      for (const item of block.items || []) {
        if (!courses.includes(item.course)) errors.push(`${b} ${item.code}: curso inválido: ${item.code}`);
        if (!KNOWLEDGE_CODE_RE.test(item.code)) errors.push(`${b}: código de saber malformado: ${item.code}`);
        if (item.code[0] !== block.letter) errors.push(`${b}: el saber ${item.code} no pertenece al bloque ${block.letter}`);
        const key = `${item.course}|${item.code}`;
        if (seen.has(key)) errors.push(`${b}: saber duplicado en (${item.course}, ${item.code})`);
        seen.add(key);
        if (!item.description || !item.description.trim()) errors.push(`${b} ${item.course} ${item.code}: descripción vacía`);
      }
    }
  }
  return errors;
}

import { AREA_MAT } from './secundaria-areas/matematicas.data';
import { AREA_MATA } from './secundaria-areas/matematicas-a.data';
import { AREA_MATB } from './secundaria-areas/matematicas-b.data';
import { AREA_BG } from './secundaria-areas/biologia-geologia.data';
import { AREA_DIG } from './secundaria-areas/digitalizacion.data';
import { AREA_EE } from './secundaria-areas/economia.data';
import { AREA_EF } from './secundaria-areas/educacion-fisica.data';
import { AREA_EPVA } from './secundaria-areas/plastica.data';
import { AREA_VCE } from './secundaria-areas/valores-civicos.data';
import { AREA_EXART } from './secundaria-areas/expresion-artistica.data';
import { AREA_FQ } from './secundaria-areas/fisica-quimica.data';
import { AREA_FOPP } from './secundaria-areas/fopp.data';
import { AREA_GH } from './secundaria-areas/geografia-historia.data';
import { AREA_LAT } from './secundaria-areas/latin.data';
import { AREA_LCL } from './secundaria-areas/lengua-castellana.data';
import { AREA_ING } from './secundaria-areas/ingles.data';
import { AREA_MUS } from './secundaria-areas/musica.data';
import { AREA_FRA } from './secundaria-areas/frances.data';
import { AREA_TEC } from './secundaria-areas/tecnologia.data';
export const SECUNDARIA_AREAS: AreaData[] = [
  AREA_MAT, AREA_MATA, AREA_MATB, AREA_BG, AREA_DIG, AREA_EE, AREA_EF, AREA_EPVA, AREA_VCE,
  AREA_EXART, AREA_FQ, AREA_FOPP, AREA_GH, AREA_LAT, AREA_LCL, AREA_ING, AREA_MUS, AREA_FRA, AREA_TEC,
].filter((a): a is AreaData => a !== null);
