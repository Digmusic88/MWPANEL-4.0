import { AREA_MATB } from './matematicas-b.data';
import { validateSecundariaCurriculum } from '../secundaria-curriculum.data';

describe('AREA_MATB · estructura básica', () => {
  it('no es null', () => {
    expect(AREA_MATB).not.toBeNull();
  });

  it('pasa la validación del currículo sin errores', () => {
    expect(validateSecundariaCurriculum([AREA_MATB])).toEqual([]);
  });

  it('tiene subjectCode MATB-4ESO, abbrev MATB y areaName Matemáticas B', () => {
    expect(AREA_MATB.subjectCode).toBe('MATB-4ESO');
    expect(AREA_MATB.abbrev).toBe('MATB');
    expect(AREA_MATB.areaName).toBe('Matemáticas B');
  });
});

describe('AREA_MATB · competencias específicas', () => {
  it('tiene exactamente 10 competencias específicas', () => {
    expect(AREA_MATB.competencies).toHaveLength(10);
  });

  it('los códigos de CE son "1" a "10"', () => {
    const codes = AREA_MATB.competencies.map((c) => c.code);
    expect(codes).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('todas las CE tienen descripción y nombre no vacíos', () => {
    for (const ce of AREA_MATB.competencies) {
      expect(ce.name.trim()).not.toBe('');
      expect(ce.description.trim()).not.toBe('');
    }
  });

  it('todas las CE tienen al menos una competencia clave válida', () => {
    const validKeys = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];
    for (const ce of AREA_MATB.competencies) {
      expect(ce.keyCompetencyCodes.length).toBeGreaterThan(0);
      for (const k of ce.keyCompetencyCodes) {
        expect(validKeys).toContain(k);
      }
    }
  });
});

describe('AREA_MATB · criterios de evaluación', () => {
  it('CE1 tiene 3 criterios (1.1, 1.2, 1.3)', () => {
    const ce1 = AREA_MATB.competencies.find((c) => c.code === '1')!;
    expect(ce1.criteria).toHaveLength(3);
    expect(ce1.criteria.map((c) => c.code)).toEqual(['1.1', '1.2', '1.3']);
  });

  it('CE2 tiene 2 criterios (2.1, 2.2)', () => {
    const ce2 = AREA_MATB.competencies.find((c) => c.code === '2')!;
    expect(ce2.criteria).toHaveLength(2);
    expect(ce2.criteria.map((c) => c.code)).toEqual(['2.1', '2.2']);
  });

  it('CE3 tiene 3 criterios (3.1, 3.2, 3.3)', () => {
    const ce3 = AREA_MATB.competencies.find((c) => c.code === '3')!;
    expect(ce3.criteria).toHaveLength(3);
    expect(ce3.criteria.map((c) => c.code)).toEqual(['3.1', '3.2', '3.3']);
  });

  it('CE6 tiene 3 criterios (6.1, 6.2, 6.3)', () => {
    const ce6 = AREA_MATB.competencies.find((c) => c.code === '6')!;
    expect(ce6.criteria).toHaveLength(3);
    expect(ce6.criteria.map((c) => c.code)).toEqual(['6.1', '6.2', '6.3']);
  });

  it('todos los criterios tienen course "4ESO"', () => {
    for (const ce of AREA_MATB.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.course).toBe('4ESO');
      }
    }
  });

  it('los códigos de criterio tienen formato n.m', () => {
    for (const ce of AREA_MATB.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.code).toMatch(/^\d+\.\d+$/);
      }
    }
  });

  it('no hay criterios duplicados dentro de una CE', () => {
    for (const ce of AREA_MATB.competencies) {
      const seen = new Set<string>();
      for (const crit of ce.criteria) {
        const key = `${crit.course}|${crit.code}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('todos los criterios tienen descripción no vacía', () => {
    for (const ce of AREA_MATB.competencies) {
      for (const crit of ce.criteria) {
        expect(crit.description.trim()).not.toBe('');
      }
    }
  });
});

describe('AREA_MATB · bloques de saberes básicos', () => {
  it('tiene exactamente 6 bloques (A–F)', () => {
    expect(AREA_MATB.knowledgeBlocks).toHaveLength(6);
  });

  it('las letras de los bloques son A, B, C, D, E, F en orden', () => {
    const letters = AREA_MATB.knowledgeBlocks.map((b) => b.letter);
    expect(letters).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('todos los bloques tienen título no vacío', () => {
    for (const block of AREA_MATB.knowledgeBlocks) {
      expect(block.title.trim()).not.toBe('');
    }
  });

  it('todos los bloques tienen al menos un ítem', () => {
    for (const block of AREA_MATB.knowledgeBlocks) {
      expect(block.items.length).toBeGreaterThan(0);
    }
  });

  it('todos los ítems de saberes tienen course "4ESO"', () => {
    for (const block of AREA_MATB.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.course).toBe('4ESO');
      }
    }
  });

  it('todos los ítems tienen código que empieza por la letra del bloque', () => {
    for (const block of AREA_MATB.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code[0]).toBe(block.letter);
      }
    }
  });

  it('bloque A es "Sentido numérico"', () => {
    const blockA = AREA_MATB.knowledgeBlocks.find((b) => b.letter === 'A')!;
    expect(blockA.title).toBe('Sentido numérico');
  });

  it('bloque D es "Sentido algebraico"', () => {
    const blockD = AREA_MATB.knowledgeBlocks.find((b) => b.letter === 'D')!;
    expect(blockD.title).toBe('Sentido algebraico');
  });

  it('bloque E es "Sentido estocástico"', () => {
    const blockE = AREA_MATB.knowledgeBlocks.find((b) => b.letter === 'E')!;
    expect(blockE.title).toBe('Sentido estocástico');
  });

  it('no hay saberes duplicados dentro de un bloque', () => {
    for (const block of AREA_MATB.knowledgeBlocks) {
      const seen = new Set<string>();
      for (const item of block.items) {
        const key = `${item.course}|${item.code}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('todos los ítems tienen descripción no vacía', () => {
    for (const block of AREA_MATB.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.description.trim()).not.toBe('');
      }
    }
  });
});
