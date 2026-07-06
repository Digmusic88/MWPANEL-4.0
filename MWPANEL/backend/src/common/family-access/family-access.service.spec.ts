import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FamilyAccessService } from './family-access.service';
import { FamilyStudent } from '../../modules/users/entities/family.entity';

describe('FamilyAccessService', () => {
  const build = (getOneResult: any) => {
    const qb: any = {
      innerJoin: () => qb, where: () => qb, andWhere: () => qb,
      getOne: jest.fn().mockResolvedValue(getOneResult),
    };
    const repo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    return Test.createTestingModule({
      providers: [FamilyAccessService, { provide: getRepositoryToken(FamilyStudent), useValue: repo }],
    }).compile().then((m) => ({ svc: m.get(FamilyAccessService), repo }));
  };

  it('true cuando hay relación de tutela', async () => {
    const { svc } = await build({ id: 'fs1' });
    expect(await svc.canFamilyAccessStudent('u1', 's1')).toBe(true);
  });
  it('false cuando no hay relación', async () => {
    const { svc } = await build(null);
    expect(await svc.canFamilyAccessStudent('u1', 's1')).toBe(false);
  });
  it('false y no consulta si faltan ids', async () => {
    const { svc, repo } = await build({ id: 'fs1' });
    expect(await svc.canFamilyAccessStudent('', 's1')).toBe(false);
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
