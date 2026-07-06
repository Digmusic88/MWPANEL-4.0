import { Between } from 'typeorm';
import { AttendanceService } from '../attendance.service';
import { AttendanceStatus } from '../entities/attendance-record.entity';

/**
 * Estos métodos solo usan attendanceRecordRepository (+ studentRepository,
 * familyRepository, familyStudentRepository para el guard de acceso, que NO se
 * dispara con rol admin/teacher). Instanciamos el servicio directamente con
 * stubs mínimos y dejamos el resto undefined: los métodos bajo prueba no los tocan.
 */
function makeService(findMock: jest.Mock): AttendanceService {
  const svc = Object.create(AttendanceService.prototype) as any;
  svc.attendanceRecordRepository = { find: findMock };
  svc.studentRepository = { findOne: jest.fn() };
  svc.familyRepository = { findOne: jest.fn() };
  svc.familyStudentRepository = { findOne: jest.fn() };
  return svc as AttendanceService;
}

describe('AttendanceService year filter', () => {
  describe('getAttendanceByStudent', () => {
    it('con academicYearId añade el filtro al where', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const svc = makeService(find);
      await svc.getAttendanceByStudent('s1', undefined, undefined, 'u1', 'admin', 'year-X');
      const where = find.mock.calls[0][0].where;
      expect(where.studentId).toBe('s1');
      expect(where.academicYearId).toBe('year-X');
    });

    it('sin academicYearId pero con fechas mantiene el filtro de rango (regresión)', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const svc = makeService(find);
      await svc.getAttendanceByStudent('s1', '2025-09-01', '2026-06-30', 'u1', 'admin');
      const where = find.mock.calls[0][0].where;
      expect(where.studentId).toBe('s1');
      expect(where.date).toBeDefined();      // Between(...) presente
      expect(where.academicYearId).toBeUndefined();
    });

    it('con academicYearId Y fechas, ambos filtros coexisten', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const svc = makeService(find);
      await svc.getAttendanceByStudent('s1', '2025-09-01', '2026-06-30', 'u1', 'admin', 'year-X');
      const where = find.mock.calls[0][0].where;
      expect(where.date).toBeDefined();
      expect(where.academicYearId).toBe('year-X');
    });
  });

  describe('getStudentAttendanceStats', () => {
    it('con academicYearId filtra por el año COMPLETO (sin ventana de days)', async () => {
      const find = jest.fn().mockResolvedValue([
        { status: AttendanceStatus.PRESENT, date: new Date(), justification: null, markedById: 'm' },
      ]);
      const svc = makeService(find);
      const res = await svc.getStudentAttendanceStats('s1', 30, 'u1', 'admin', 'year-X');
      const where = find.mock.calls[0][0].where;
      expect(where.studentId).toBe('s1');
      expect(where.academicYearId).toBe('year-X');
      // Con año concreto NO se aplica la ventana de últimos `days` días
      // (si no, un año pasado siempre daría 0 al no haber nada en los últimos 30 días)
      expect(where.date).toBeUndefined();
      expect(res.stats.presentDays).toBe(1);
    });

    it('sin academicYearId mantiene el comportamiento por days (regresión)', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const svc = makeService(find);
      await svc.getStudentAttendanceStats('s1', 30, 'u1', 'admin');
      const where = find.mock.calls[0][0].where;
      expect(where.date).toBeDefined();
      expect(where.academicYearId).toBeUndefined();
    });
  });
});
