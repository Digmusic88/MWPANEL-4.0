import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { TutoringGroup } from '../../tutoring/entities/tutoring-group.entity';

/** Remapea las ids de grupo de una asignación del año origen a las del destino. Puro y testeable. */
export function resolveClonedAssignmentGroups(
  sourceGroupIds: string[],
  legacyGroupId: string | null,
  map: Map<string, string>,
): { classGroupIds: string[]; legacyClassGroupId: string | null; warning: string | null } {
  const classGroupIds: string[] = [];
  const unmapped: string[] = [];
  for (const gid of sourceGroupIds) {
    const n = map.get(gid);
    if (n) classGroupIds.push(n);
    else unmapped.push(gid);
  }
  const legacyClassGroupId = legacyGroupId ? map.get(legacyGroupId) ?? null : null;
  const warning =
    unmapped.length > 0
      ? `Asignación con ${unmapped.length} grupo(s) sin mapear (omitidos)`
      : classGroupIds.length === 0
      ? 'Asignación sin grupos mapeables'
      : null;
  return { classGroupIds, legacyClassGroupId, warning };
}

@Injectable()
export class YearStructureRolloverService {
  private readonly logger = new Logger(YearStructureRolloverService.name);

  constructor(
    @InjectRepository(AcademicYear)
    private readonly yearRepo: Repository<AcademicYear>,
  ) {}

  async cloneStructure(sourceYearId: string, targetYearId: string) {
    if (sourceYearId === targetYearId) {
      throw new BadRequestException('El año origen y destino no pueden ser el mismo');
    }
    const [source, target] = await Promise.all([
      this.yearRepo.findOne({ where: { id: sourceYearId } }),
      this.yearRepo.findOne({ where: { id: targetYearId } }),
    ]);
    if (!source) throw new NotFoundException('Año origen no encontrado');
    if (!target) throw new NotFoundException('Año destino no encontrado');
    if (target.isArchived) {
      throw new ConflictException('No se puede clonar sobre un año archivado');
    }

    return this.yearRepo.manager.transaction(async (mgr: EntityManager) => {
      const warnings: string[] = [];
      const groupRepo = mgr.getRepository(ClassGroup);
      const assignRepo = mgr.getRepository(SubjectAssignment);
      const tutRepo = mgr.getRepository(TutoringGroup);

      const targetGroupCount = await groupRepo
        .createQueryBuilder('g')
        .where('g.academicYearId = :y', { y: targetYearId })
        .getCount();
      if (targetGroupCount > 0) {
        throw new ConflictException('El año destino ya tiene grupos; elige otro año o vacíalo primero');
      }

      // 1) Grupos + mapa old->new
      const sourceGroups = await groupRepo.find({
        where: { academicYear: { id: sourceYearId } },
        relations: ['courses', 'tutor'],
      });
      const groupMap = new Map<string, string>();
      for (const g of sourceGroups) {
        const nuevo = groupRepo.create({
          name: g.name,
          section: g.section,
          courses: g.courses,
          tutor: g.tutor,
          academicYear: { id: targetYearId } as AcademicYear,
        });
        const saved = await groupRepo.save(nuevo);
        groupMap.set(g.id, saved.id);
      }

      // 2) Asignaciones (remapeando grupos)
      const sourceAssignments = await assignRepo.find({
        where: { academicYearId: sourceYearId },
        relations: ['classGroups'],
      });
      let assignCount = 0;
      for (const a of sourceAssignments) {
        const { classGroupIds, legacyClassGroupId, warning } = resolveClonedAssignmentGroups(
          (a.classGroups || []).map((cg) => cg.id),
          a.classGroupId ?? null,
          groupMap,
        );
        if (warning) warnings.push(warning);
        if (classGroupIds.length === 0) continue; // no clonar asignaciones huérfanas
        const nueva = assignRepo.create({
          teacherId: a.teacherId,
          subjectId: a.subjectId,
          academicYearId: targetYearId,
          weeklyHours: a.weeklyHours,
          classGroupId: legacyClassGroupId,
          classGroups: classGroupIds.map((id) => ({ id }) as ClassGroup),
        });
        await assignRepo.save(nueva);
        assignCount++;
      }

      // 3) Tutorías (sin alumnos)
      const sourceTutorings = await tutRepo.find({ where: { academicYearId: sourceYearId } });
      let tutCount = 0;
      for (const t of sourceTutorings) {
        const nueva = tutRepo.create({
          name: t.name,
          tutorId: t.tutorId,
          academicYearId: targetYearId,
          educationalLevelId: t.educationalLevelId ?? null,
          isActive: t.isActive,
        });
        await tutRepo.save(nueva);
        tutCount++;
      }

      if (sourceGroups.length === 0) warnings.push('El año origen no tenía grupos');
      return {
        classGroups: sourceGroups.length,
        subjectAssignments: assignCount,
        tutoringGroups: tutCount,
        warnings,
      };
    });
  }
}
