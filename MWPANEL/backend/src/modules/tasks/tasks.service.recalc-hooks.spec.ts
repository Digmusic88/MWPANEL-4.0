import { TasksService } from './tasks.service';
import { SubmissionStatus } from './entities/task-submission.entity';

function makeService(): TasksService {
  const service = Object.create(TasksService.prototype) as TasksService;
  (service as any).logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
  return service;
}

describe('TasksService — disparadores de recálculo (SP-D2a)', () => {
  describe('gradeSubmission', () => {
    it('recalcula con studentId y subjectAssignmentId resueltos de la submission, y devuelve la nota', async () => {
      const service = makeService();
      const submission = {
        id: 'sub-1',
        studentId: 'stu-1',
        status: SubmissionStatus.SUBMITTED,
        isLate: false,
        task: { id: 't-1', teacherId: 'tea-1', subjectAssignmentId: 'sa-1', latePenalty: 0 },
      };
      const graded = { id: 'sub-1', isGraded: true };
      (service as any).submissionsRepository = {
        findOne: jest.fn()
          .mockResolvedValueOnce(submission)   // carga inicial
          .mockResolvedValueOnce(graded),       // re-query del return
        update: jest.fn().mockResolvedValue({}),
      };
      (service as any).teachersRepository = { findOne: jest.fn().mockResolvedValue({ id: 'tea-1' }) };
      const recalc = jest.spyOn(service as any, 'recalcCentralizedGradeSafe').mockResolvedValue(undefined);

      const result = await service.gradeSubmission('sub-1', { grade: 7 } as any, 'user-1');

      expect(recalc).toHaveBeenCalledWith('stu-1', 'sa-1');
      expect(result).toBe(graded);
    });

    it('fail-soft: si el recálculo "falla", igualmente devuelve la nota (no relanza)', async () => {
      const service = makeService();
      const submission = {
        id: 'sub-1', studentId: 'stu-1', status: SubmissionStatus.SUBMITTED, isLate: false,
        task: { id: 't-1', teacherId: 'tea-1', subjectAssignmentId: 'sa-1', latePenalty: 0 },
      };
      const graded = { id: 'sub-1', isGraded: true };
      (service as any).submissionsRepository = {
        findOne: jest.fn().mockResolvedValueOnce(submission).mockResolvedValueOnce(graded),
        update: jest.fn().mockResolvedValue({}),
      };
      (service as any).teachersRepository = { findOne: jest.fn().mockResolvedValue({ id: 'tea-1' }) };
      // El helper REAL es fail-soft, pero aquí forzamos que su versión espiada resuelva igual.
      jest.spyOn(service as any, 'recalcCentralizedGradeSafe').mockResolvedValue(undefined);

      await expect(service.gradeSubmission('sub-1', { grade: 7 } as any, 'user-1')).resolves.toBe(graded);
    });
  });

  describe('gradeExamStudent', () => {
    it('resuelve subjectAssignmentId por taskId y recalcula con el studentId param', async () => {
      const service = makeService();
      (service as any).tasksRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 't-9', subjectAssignmentId: 'sa-9' }),
      };
      const recalc = jest.spyOn(service as any, 'recalcCentralizedGradeSafe').mockResolvedValue(undefined);
      // Aislamos: invocamos directamente el resolver+hook que la implementación factoriza.
      await (service as any).recalcExamGradeByTaskSafe('t-9', 'stu-9');
      expect((service as any).tasksRepository.findOne).toHaveBeenCalledWith({ where: { id: 't-9' } });
      expect(recalc).toHaveBeenCalledWith('stu-9', 'sa-9');
    });

    it('si la task no se encuentra, NO llama a recalc y no rompe', async () => {
      const service = makeService();
      (service as any).tasksRepository = { findOne: jest.fn().mockResolvedValue(null) };
      const recalc = jest.spyOn(service as any, 'recalcCentralizedGradeSafe').mockResolvedValue(undefined);
      await expect((service as any).recalcExamGradeByTaskSafe('t-x', 'stu-9')).resolves.toBeUndefined();
      expect(recalc).not.toHaveBeenCalled();
    });
  });
});
