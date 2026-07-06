import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CurrentAcademicYearService } from './current-academic-year.service';
import { AcademicYear } from '../students/entities/academic-year.entity';

describe('CurrentAcademicYearService.getArchivedIds', () => {
  const makeService = (rows: Partial<AcademicYear>[]) => {
    const repo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue(rows) };
    return { repo, service: new CurrentAcademicYearService(repo as any) };
  };

  it('devuelve un Set con los ids de los años archivados', async () => {
    const { service } = makeService([{ id: 'a' }, { id: 'b' }]);
    const ids = await service.getArchivedIds();
    expect(ids).toBeInstanceOf(Set);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });

  it('cachea: no vuelve a consultar dentro del TTL', async () => {
    const { repo, service } = makeService([{ id: 'a' }]);
    await service.getArchivedIds();
    await service.getArchivedIds();
    expect(repo.find).toHaveBeenCalledTimes(1);
  });

  it('invalidate() fuerza recarga', async () => {
    const { repo, service } = makeService([{ id: 'a' }]);
    await service.getArchivedIds();
    service.invalidate();
    await service.getArchivedIds();
    expect(repo.find).toHaveBeenCalledTimes(2);
  });
});
