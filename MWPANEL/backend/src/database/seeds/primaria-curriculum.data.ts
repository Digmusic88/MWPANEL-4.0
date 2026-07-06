// Currículo de Educación Primaria de Navarra (Anexo II) — área Matemáticas.
// Extraído leyendo el PDF: /opt/docs/Curriculum-Navarra/Curriculum Primaria Navarra - Anexo II.pdf (pp. 80–92).
// Criterios y saberes vienen por los 3 ciclos (columnas Primer/Segundo/Tercer ciclo).
// Códigos crudos: CE "1".."8"; criterio "<n>.<m>"; saber "<SENTIDO><sub>.<item>" (p.ej. "A1.1").
// El seed compone: CE -> "CE<n>"; criterio -> "MAT-<n>.<m>"; el saber conserva su código.

import { AREA_MATEMATICAS } from './primaria-areas/matematicas.data';
import { AREA_CMN } from './primaria-areas/conocimiento-medio.data';
import { AREA_EA } from './primaria-areas/educacion-artistica.data';
import { AREA_EF } from './primaria-areas/educacion-fisica.data';
import { AREA_VCE } from './primaria-areas/valores-civicos.data';
import { AREA_LCL } from './primaria-areas/lengua-castellana.data';
import { AREA_ING } from './primaria-areas/ingles.data';

export type Cycle = 'PRIMER' | 'SEGUNDO' | 'TERCER';

export interface CriterionData {
  cycle: Cycle;
  code: string; // "1.1"
  description: string;
}

export interface KnowledgeData {
  cycle: Cycle;
  code: string; // "A1.1"
  description: string;
}

export interface KnowledgeBlock {
  letter: string; // "A".."F" (sentido)
  title: string; // p.ej. "Sentido numérico"
  items: KnowledgeData[];
}

export interface SpecificCompetencyData {
  code: string; // "1".."8"
  name: string; // etiqueta breve editorial
  description: string; // texto oficial de la competencia específica
  keyCompetencyCodes: string[]; // claves colapsadas de la Vinculación al Perfil de salida
  criteria: CriterionData[]; // criterios de los 3 ciclos (lista plana con su ciclo)
}

export interface AreaData {
  subjectCode: string; // 'MAT-1P'
  abbrev: string; // 'MAT'
  areaName: string;
  competencies: SpecificCompetencyData[];
  knowledgeBlocks: KnowledgeBlock[];
}

export const VALID_KEY_COMPETENCY_CODES = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'] as const;
export const VALID_SUBJECT_CODES = ['MAT-1P','CMN-1P','EA-1P','EF-1P','VCE-5P','LCL-1P','ING-1P'] as const;
export const VALID_AREA_ABBREVS = ['MAT','CMN','EA','EF','VCE','LCL','ING'] as const;
export const VALID_CYCLES = ['PRIMER', 'SEGUNDO', 'TERCER'] as const;

const CRITERION_CODE_RE = /^\d+\.\d+$/;
const KNOWLEDGE_CODE_RE = /^[A-Z]\d*\.\d+$/; // acepta ambos formatos: bloque plano (A.10) y sentido+subbloque (A1.1)

export function validatePrimariaCurriculum(areas: AreaData[]): string[] {
  const errors: string[] = [];
  const cycles = VALID_CYCLES as readonly string[];
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
        if (!cycles.includes(crit.cycle)) errors.push(`${c} ${crit.code}: ciclo inválido: ${crit.cycle}`);
        if (!CRITERION_CODE_RE.test(crit.code)) errors.push(`${c}: código de criterio malformado: ${crit.code}`);
        const key = `${crit.cycle}|${crit.code}`;
        if (seen.has(key)) errors.push(`${c}: criterio duplicado en (${crit.cycle}, ${crit.code})`);
        seen.add(key);
        if (!crit.description || !crit.description.trim()) errors.push(`${c} ${crit.cycle} ${crit.code}: descripción vacía`);
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
        if (!cycles.includes(item.cycle)) errors.push(`${b} ${item.code}: ciclo inválido: ${item.cycle}`);
        if (!KNOWLEDGE_CODE_RE.test(item.code)) errors.push(`${b}: código de saber malformado: ${item.code}`);
        if (item.code[0] !== block.letter) errors.push(`${b}: el saber ${item.code} no pertenece al bloque ${block.letter}`);
        const key = `${item.cycle}|${item.code}`;
        if (seen.has(key)) errors.push(`${b}: saber duplicado en (${item.cycle}, ${item.code})`);
        seen.add(key);
        if (!item.description || !item.description.trim()) errors.push(`${b} ${item.cycle} ${item.code}: descripción vacía`);
      }
    }
  }
  return errors;
}

export const PRIMARIA_AREAS: AreaData[] = [
  AREA_MATEMATICAS, AREA_CMN, AREA_EA, AREA_EF, AREA_VCE, AREA_LCL, AREA_ING,
].filter((a): a is AreaData => a !== null);
