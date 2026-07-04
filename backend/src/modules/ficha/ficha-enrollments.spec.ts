import { splitEnrollments, EnrollmentRow } from './ficha-enrollments';

const mk = (status: string): EnrollmentRow => ({
  academicYear: null, service: null, group: null, status,
  apoyoLevel: null, customFee: null, enrolledAt: null,
});

describe('splitEnrollments', () => {
  it('activa = matriculado/preinscrito; historial = pendiente/lista_espera/baja', () => {
    const rows = [mk('matriculado'), mk('preinscrito'), mk('baja'), mk('lista_espera'), mk('pendiente')];
    const { active, history } = splitEnrollments(rows);
    expect(active.map(r => r.status)).toEqual(['matriculado', 'preinscrito']);
    expect(history.map(r => r.status)).toEqual(['baja', 'lista_espera', 'pendiente']);
  });

  it('mantiene el orden de entrada dentro de cada grupo', () => {
    const rows = [mk('baja'), mk('matriculado'), mk('preinscrito')];
    const { active, history } = splitEnrollments(rows);
    expect(active.map(r => r.status)).toEqual(['matriculado', 'preinscrito']);
    expect(history.map(r => r.status)).toEqual(['baja']);
  });

  it('listas vacías si no hay matrículas', () => {
    expect(splitEnrollments([])).toEqual({ active: [], history: [] });
  });
});
