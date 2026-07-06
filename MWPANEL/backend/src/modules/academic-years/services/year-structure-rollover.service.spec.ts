import { resolveClonedAssignmentGroups } from './year-structure-rollover.service';

describe('resolveClonedAssignmentGroups', () => {
  const map = new Map([['g1', 'n1'], ['g2', 'n2']]);

  it('remapea las ids de grupo viejas a las nuevas', () => {
    const r = resolveClonedAssignmentGroups(['g1', 'g2'], null, map);
    expect(r.classGroupIds).toEqual(['n1', 'n2']);
    expect(r.legacyClassGroupId).toBeNull();
    expect(r.warning).toBeNull();
  });

  it('remapea el classGroupId legacy', () => {
    const r = resolveClonedAssignmentGroups(['g1'], 'g1', map);
    expect(r.legacyClassGroupId).toBe('n1');
  });

  it('descarta grupos no mapeables y avisa', () => {
    const r = resolveClonedAssignmentGroups(['g1', 'gX'], null, map);
    expect(r.classGroupIds).toEqual(['n1']);
    expect(r.warning).toMatch(/no mapeable|sin mapear/i);
  });

  it('sin grupos mapeables → classGroupIds vacío + warning', () => {
    const r = resolveClonedAssignmentGroups(['gX'], null, map);
    expect(r.classGroupIds).toEqual([]);
    expect(r.warning).toBeTruthy();
  });
});
