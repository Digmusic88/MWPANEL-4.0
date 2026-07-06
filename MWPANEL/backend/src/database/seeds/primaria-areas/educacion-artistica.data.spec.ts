import { validatePrimariaCurriculum } from '../primaria-curriculum.data';
import { AREA_EA } from './educacion-artistica.data';

describe('AREA_EA · datos básicos', () => {
  it('no es null', () => {
    expect(AREA_EA).not.toBeNull();
  });

  it('tiene el subjectCode, abbrev y areaName correctos', () => {
    expect(AREA_EA.subjectCode).toBe('EA-1P');
    expect(AREA_EA.abbrev).toBe('EA');
    expect(AREA_EA.areaName).toBe('Educación Artística');
  });

  it('validatePrimariaCurriculum no arroja errores', () => {
    expect(validatePrimariaCurriculum([AREA_EA])).toEqual([]);
  });
});

describe('AREA_EA · competencias específicas', () => {
  it('tiene exactamente 4 CE', () => {
    expect(AREA_EA.competencies).toHaveLength(4);
  });

  it('los códigos de CE son 1, 2, 3, 4', () => {
    expect(AREA_EA.competencies.map((c) => c.code)).toEqual(['1', '2', '3', '4']);
  });

  it('cada CE tiene al menos un criterio por ciclo (o al menos 2 ciclos)', () => {
    for (const ce of AREA_EA.competencies) {
      expect(ce.criteria.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('CE1 tiene criterios en los 3 ciclos', () => {
    const ce1 = AREA_EA.competencies.find((c) => c.code === '1')!;
    const cycles = new Set(ce1.criteria.map((c) => c.cycle));
    expect(cycles).toContain('PRIMER');
    expect(cycles).toContain('SEGUNDO');
    expect(cycles).toContain('TERCER');
  });

  it('CE2 tiene el criterio 2.3 solo en TERCER ciclo', () => {
    const ce2 = AREA_EA.competencies.find((c) => c.code === '2')!;
    const c23 = ce2.criteria.find((c) => c.code === '2.3');
    expect(c23).toBeDefined();
    expect(c23!.cycle).toBe('TERCER');
  });

  it('todos los ciclos son válidos', () => {
    const valid = new Set(['PRIMER', 'SEGUNDO', 'TERCER']);
    for (const ce of AREA_EA.competencies) {
      for (const crit of ce.criteria) {
        expect(valid).toContain(crit.cycle);
      }
    }
  });

  it('CE1 vincula con CCEC', () => {
    const ce1 = AREA_EA.competencies.find((c) => c.code === '1')!;
    expect(ce1.keyCompetencyCodes).toContain('CCEC');
  });

  it('CE4 vincula con CCL y CC', () => {
    const ce4 = AREA_EA.competencies.find((c) => c.code === '4')!;
    expect(ce4.keyCompetencyCodes).toContain('CCL');
    expect(ce4.keyCompetencyCodes).toContain('CC');
  });

  it('CE1 incluye CP (descriptor CP3 del perfil de salida)', () => {
    const ce1 = AREA_EA.competencies.find((c) => c.code === '1')!;
    expect(ce1.keyCompetencyCodes).toContain('CP');
  });

  it('CE2 incluye CP (descriptor CP3 del perfil de salida)', () => {
    const ce2 = AREA_EA.competencies.find((c) => c.code === '2')!;
    expect(ce2.keyCompetencyCodes).toContain('CP');
  });

  it('CE3 incluye CC (descriptor CC2 del perfil de salida)', () => {
    const ce3 = AREA_EA.competencies.find((c) => c.code === '3')!;
    expect(ce3.keyCompetencyCodes).toContain('CC');
  });

  it('CE4 incluye CP (descriptor CP3 del perfil de salida)', () => {
    const ce4 = AREA_EA.competencies.find((c) => c.code === '4')!;
    expect(ce4.keyCompetencyCodes).toContain('CP');
  });
});

describe('AREA_EA · saberes básicos', () => {
  it('tiene exactamente 4 bloques: A, B, C, D', () => {
    expect(AREA_EA.knowledgeBlocks.map((b) => b.letter)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('los títulos de los bloques son correctos', () => {
    const titles = AREA_EA.knowledgeBlocks.map((b) => b.title);
    expect(titles[0]).toBe('Recepción y análisis');
    expect(titles[1]).toBe('Creación e interpretación');
    expect(titles[2]).toBe('Artes plásticas, visuales y audiovisuales');
    expect(titles[3]).toBe('Música y arte escénicas y performativas');
  });

  it('todos los items tienen descripción no vacía', () => {
    for (const block of AREA_EA.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.description.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('bloque A tiene 18 items (6 saberes × 3 ciclos)', () => {
    const blockA = AREA_EA.knowledgeBlocks.find((b) => b.letter === 'A')!;
    expect(blockA.items).toHaveLength(18);
  });

  it('bloque B tiene 11 items (B.4 solo en 2 ciclos)', () => {
    const blockB = AREA_EA.knowledgeBlocks.find((b) => b.letter === 'B')!;
    expect(blockB.items).toHaveLength(11);
  });

  it('bloque C tiene items (incluyendo C.5 a C.12 no todos tienen PRIMER)', () => {
    const blockC = AREA_EA.knowledgeBlocks.find((b) => b.letter === 'C')!;
    expect(blockC.items.length).toBeGreaterThan(20);
  });

  it('bloque D tiene items (D.12 solo en 2 ciclos)', () => {
    const blockD = AREA_EA.knowledgeBlocks.find((b) => b.letter === 'D')!;
    expect(blockD.items.length).toBeGreaterThan(30);
  });

  it('todos los códigos de saber empiezan por la letra del bloque', () => {
    for (const block of AREA_EA.knowledgeBlocks) {
      for (const item of block.items) {
        expect(item.code[0]).toBe(block.letter);
      }
    }
  });
});
