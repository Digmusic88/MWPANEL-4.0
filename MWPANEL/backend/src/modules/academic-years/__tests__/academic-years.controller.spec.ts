import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AcademicYearsController } from '../academic-years.controller';
import { AcademicYear } from '../../students/entities/academic-year.entity';

describe('AcademicYearsController (lifecycle)', () => {
  const build = async (repo: any) => {
    const mod = await Test.createTestingModule({
      controllers: [AcademicYearsController],
      providers: [{ provide: getRepositoryToken(AcademicYear), useValue: repo }],
    }).compile();
    return mod.get(AcademicYearsController);
  };

  it('findCurrent devuelve el año con isCurrent=true (no por fecha)', async () => {
    const repo: any = { findOne: jest.fn().mockResolvedValue({ id: 'y1', isCurrent: true }) };
    const c = await build(repo);
    const r = await c.findCurrent();
    expect(repo.findOne).toHaveBeenCalledWith({ where: { isCurrent: true } });
    expect(r.id).toBe('y1');
  });

  it('findCurrent devuelve null si no hay año actual', async () => {
    const repo: any = { findOne: jest.fn().mockResolvedValue(null) };
    const c = await build(repo);
    expect(await c.findCurrent()).toBeNull();
  });

  it('activate usa una transacción: desactiva el resto y activa el elegido', async () => {
    const mgr = { update: jest.fn(), findOne: jest.fn().mockResolvedValue({ id: 'y2', isCurrent: true }) };
    const repo: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'y2' }),
      manager: { transaction: jest.fn(async (cb: any) => cb(mgr)) },
    };
    const c = await build(repo);
    const r = await c.activate('y2');
    expect(repo.manager.transaction).toHaveBeenCalled();
    expect(mgr.update).toHaveBeenCalledWith(AcademicYear, {}, { isCurrent: false });
    expect(mgr.update).toHaveBeenCalledWith(AcademicYear, { id: 'y2' }, { isCurrent: true });
    expect(r.id).toBe('y2');
  });

  it('archive marca isArchived/archivedAt; lanza Conflict si es el año actual', async () => {
    const active = { id: 'y1', isCurrent: true, isArchived: false };
    const repo1: any = { findOne: jest.fn().mockResolvedValue(active) };
    const c1 = await build(repo1);
    await expect(c1.archive('y1')).rejects.toBeInstanceOf(ConflictException);

    const past = { id: 'y0', isCurrent: false, isArchived: false };
    const repo2: any = { findOne: jest.fn().mockResolvedValue(past), save: jest.fn(async (x) => x) };
    const c2 = await build(repo2);
    const r = await c2.archive('y0');
    expect(r.isArchived).toBe(true);
    expect(r.archivedAt).toBeInstanceOf(Date);
  });

  it('unarchive limpia los flags', async () => {
    const arch = { id: 'y0', isArchived: true, archivedAt: new Date() };
    const repo: any = { findOne: jest.fn().mockResolvedValue(arch), save: jest.fn(async (x) => x) };
    const c = await build(repo);
    const r = await c.unarchive('y0');
    expect(r.isArchived).toBe(false);
    expect(r.archivedAt).toBeNull();
  });

  it('remove con violación FK (23503) → ConflictException', async () => {
    const y = { id: 'y1' };
    const err: any = new Error('fk'); err.code = '23503';
    const repo: any = { findOne: jest.fn().mockResolvedValue(y), remove: jest.fn().mockRejectedValue(err) };
    const c = await build(repo);
    await expect(c.remove('y1')).rejects.toBeInstanceOf(ConflictException);
  });
});
