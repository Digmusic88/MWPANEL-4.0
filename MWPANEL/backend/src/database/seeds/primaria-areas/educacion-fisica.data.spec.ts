import { AREA_EF } from './educacion-fisica.data';
import { validatePrimariaCurriculum } from '../primaria-curriculum.data';

describe('AREA_EF · estructura básica', () => {
  it('no es null', () => {
    expect(AREA_EF).not.toBeNull();
  });

  it('pasa la validación del currículo sin errores', () => {
    expect(validatePrimariaCurriculum([AREA_EF])).toEqual([]);
  });

  it('tiene subjectCode EF-1P y abbrev EF', () => {
    expect(AREA_EF.subjectCode).toBe('EF-1P');
    expect(AREA_EF.abbrev).toBe('EF');
    expect(AREA_EF.areaName).toBe('Educación Física');
  });
});

describe('AREA_EF · competencias específicas', () => {
  it('tiene exactamente 5 competencias específicas', () => {
    expect(AREA_EF.competencies).toHaveLength(5);
  });

  it('los códigos de CE son "1" a "5"', () => {
    const codes = AREA_EF.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5']);
  });

  it('todas las CE tienen descripción y nombre no vacíos', () => {
    for (const ce of AREA_EF.competencies) {
      expect(ce.name.trim()).not.toBe('');
      expect(ce.description.trim()).not.toBe('');
    }
  });

  it('todas las CE tienen al menos una competencia clave válida', () => {
    const validKeys = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];
    for (const ce of AREA_EF.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const k of ce.keyCompetencyCodes) {
        expect(validKeys).toContain(k);
      }
    }
  });
});

describe('AREA_EF · criterios de evaluación', () => {
  it('CE1 tiene 12 criterios (4 por ciclo × 3 ciclos)', () => {
    const ce1 = AREA_EF.competencies.find((c) => c.code === '1')!;
    expect(ce1.criteria).toHaveLength(12);
  });

  it('CE2 tiene 9 criterios (3 por ciclo × 3 ciclos)', () => {
    const ce2 = AREA_EF.competencies.find((c) => c.code === '2')!;
    expect(ce2.criteria).toHaveLength(9);
  });

  it('CE3 tiene 9 criterios (3 por ciclo × 3 ciclos)', () => {
    const ce3 = AREA_EF.competencies.find((c) => c.code === '3')!;
    expect(ce3.criteria).toHaveLength(9);
  });

  it('CE4 tiene 9 criterios (3 por ciclo × 3 ciclos)', () => {
    const ce4 = AREA_EF.competencies.find((c) => c.code === '4')!;
    expect(ce4.criteria).toHaveLength(9);
  });

  it('CE5 tiene 3 criterios (1 por ciclo × 3 ciclos)', () => {
    const ce5 = AREA_EF.competencies.find((c) => c.code === '5')!;
    expect(ce5.criteria).toHaveLength(3);
  });

  it('todos los ciclos de los criterios son PRIMER, SEGUNDO o TERCER', () => {
    const validCycles = ['PRIMER', 'SEGUNDO', 'TERCER'];
    for (const ce of AREA_EF.competencies) {
      for (const crit of ce.criteria) {
        expect(validCycles).toContain(crit.cycle);
      }
    }
  });

  it('los códigos de criterio tienen formato n.m', () => {
    for (const ce of AREA_EF.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.code).toMatch(/^\d+\.\d+$/);
      }
    }
  });

  it('no hay criterios duplicados (mismo ciclo y código) dentro de una CE', () => {
    for (const ce of AREA_EF.competencies) {
      const seen = new Set<string>();
      for (const crit of ce.criteria) {
        const key = `${crit.cycle}|${crit.code}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe('AREA_EF · bloques de saberes básicos', () => {
  it('tiene exactamente 6 bloques (A–F)', () => {
    expect(AREA_EF.knowledgeBlocks).toHaveLength(6);
  });

  it('las letras de los bloques son A, B, C, D, E, F en orden', () => {
    const letters = AREA_EF.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('todos los bloques tienen título no vacío', () => {
    for (const block of AREA_EF.knowledgeBlocks) {
      expect(block.title.trim()).not.toBe('');
    }
  });

  it('todos los bloques tienen al menos un ítem', () => {
    for (const block of AREA_EF.knowledgeBlocks) {
      expect(block.items.length).toBeGreaterThan(0);
    }
  });

  it('todos los ítems de saberes tienen ciclo válido', () => {
    const validCycles = ['PRIMER', 'SEGUNDO', 'TERCER'];
    for (const block of AREA_EF.knowledgeBlocks) {
      for (const item of block.items) {
        expect(validCycles).toContain(item.cycle);
      }
    }
  });

  it('todos los ítems de saberes tienen código que empieza por la letra del bloque', () => {
    for (const block of AREA_EF.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code[0]).toBe(block.letter);
      }
    }
  });

  it('bloque A es "Vida activa y saludable"', () => {
    const blockA = AREA_EF.knowledgeBlocks.find((b) => b.letter === 'A')!;
    expect(blockA.title).toBe('Vida activa y saludable');
  });

  it('bloque B es "Organización y gestión de la actividad física"', () => {
    const blockB = AREA_EF.knowledgeBlocks.find((b) => b.letter === 'B')!;
    expect(blockB.title).toBe('Organización y gestión de la actividad física');
  });

  it('bloque C es "Resolución de problemas en situaciones motrices"', () => {
    const blockC = AREA_EF.knowledgeBlocks.find((b) => b.letter === 'C')!;
    expect(blockC.title).toBe('Resolución de problemas en situaciones motrices');
  });
});
