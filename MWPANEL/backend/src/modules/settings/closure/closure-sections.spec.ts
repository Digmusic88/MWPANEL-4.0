import {
  resolveSectionForApiPath,
  isAlwaysOpenApiPath,
  CLOSURE_SECTIONS,
  DEFAULT_ALLOWED_SECTIONS,
} from './closure-sections';

describe('closure-sections', () => {
  it('resolves a closable section from its api prefix', () => {
    expect(resolveSectionForApiPath('/api/tasks/123')?.key).toBe('tareas');
    expect(resolveSectionForApiPath('/api/grades')?.key).toBe('notas');
    expect(resolveSectionForApiPath('/api/blog/post/x')?.key).toBe('blog');
  });

  it('returns null for an uncatalogued path (default-deny candidate)', () => {
    expect(resolveSectionForApiPath('/api/some-random-module')).toBeNull();
  });

  it('flags transversal always-open paths', () => {
    expect(isAlwaysOpenApiPath('/api/auth/login')).toBe(true);
    expect(isAlwaysOpenApiPath('/api/settings/closure/status')).toBe(true);
    expect(isAlwaysOpenApiPath('/api/tasks')).toBe(false);
  });

  it('default whitelist keys all exist in the catalog', () => {
    const keys = CLOSURE_SECTIONS.map((s) => s.key);
    DEFAULT_ALLOWED_SECTIONS.forEach((k) => expect(keys).toContain(k));
  });


});
