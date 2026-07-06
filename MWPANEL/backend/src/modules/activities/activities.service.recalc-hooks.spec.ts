import { ActivitiesService } from './activities.service';

function makeService(): ActivitiesService {
  const service = Object.create(ActivitiesService.prototype) as ActivitiesService;
  (service as any).logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
  return service;
}

describe('ActivitiesService — disparador de recálculo (SP-D2a)', () => {
  it('tras assessStudentByUserId recalcula con studentId param y subjectAssignmentId resuelto por activityId', async () => {
    const service = makeService();
    const saved = { id: 'as-1' };
    jest.spyOn(service as any, 'getTeacherIdFromUserId').mockResolvedValue('tea-1');
    jest.spyOn(service, 'assessStudent').mockResolvedValue(saved as any);
    (service as any).activitiesRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'act-1', subjectAssignmentId: 'sa-1' }),
    };
    const recalc = jest.spyOn(service as any, 'recalcCentralizedGradeSafe').mockResolvedValue(undefined);

    const result = await service.assessStudentByUserId('act-1', 'stu-1', { value: 8 } as any, 'user-1');

    expect(service.assessStudent).toHaveBeenCalledWith('act-1', 'stu-1', { value: 8 }, 'tea-1', 'user-1');
    expect((service as any).activitiesRepository.findOne).toHaveBeenCalledWith({ where: { id: 'act-1' } });
    expect(recalc).toHaveBeenCalledWith('stu-1', 'sa-1');
    expect(result).toBe(saved);
  });

  it('fail-soft: si la actividad no se encuentra, devuelve la valoración igualmente sin recalc', async () => {
    const service = makeService();
    const saved = { id: 'as-1' };
    jest.spyOn(service as any, 'getTeacherIdFromUserId').mockResolvedValue('tea-1');
    jest.spyOn(service, 'assessStudent').mockResolvedValue(saved as any);
    (service as any).activitiesRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const recalc = jest.spyOn(service as any, 'recalcCentralizedGradeSafe').mockResolvedValue(undefined);

    await expect(service.assessStudentByUserId('act-x', 'stu-1', { value: 8 } as any, 'user-1')).resolves.toBe(saved);
    expect(recalc).not.toHaveBeenCalled();
  });
});
