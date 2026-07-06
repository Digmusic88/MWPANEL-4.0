import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const HARDCODED_TEACHER = '96e79ad5-b8d0-47d1-8d05-ef859fe0d808';

describe('TasksController — Test Yourself teacherId resolution', () => {
  let controller: TasksController;
  let service: { getTeacherByUserId: jest.Mock; gradeExamStudent: jest.Mock };

  beforeEach(async () => {
    service = {
      getTeacherByUserId: jest.fn(),
      gradeExamStudent: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('usa el teacher resuelto desde el usuario autenticado (no el UUID fijo)', async () => {
    service.getTeacherByUserId.mockResolvedValue({ id: 'real-teacher-id' });
    const user = { sub: 'user-123', teacherId: 'real-teacher-id', email: 't@x.com' };

    await controller.gradeExamStudent('task-1', 'student-1', { grade: 7 }, user);

    expect(service.getTeacherByUserId).toHaveBeenCalledWith('user-123');
    expect(service.gradeExamStudent).toHaveBeenCalledWith(
      'task-1',
      'student-1',
      { grade: 7 },
      'real-teacher-id',
    );
    // Nunca debe atribuir al profesor hardcodeado.
    const passedTeacherId = service.gradeExamStudent.mock.calls[0][3];
    expect(passedTeacherId).not.toBe(HARDCODED_TEACHER);
  });

  it('lanza BadRequestException si no se resuelve un profesor (no cae al UUID fijo)', async () => {
    service.getTeacherByUserId.mockResolvedValue(null);
    const user = { sub: 'user-999', email: 'x@x.com' };

    await expect(
      controller.gradeExamStudent('task-1', 'student-1', { grade: 7 }, user),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.gradeExamStudent).not.toHaveBeenCalled();
  });
});
