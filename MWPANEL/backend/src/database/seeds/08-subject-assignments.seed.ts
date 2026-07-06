import { DataSource } from 'typeorm';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';
import { Subject } from '../../modules/students/entities/subject.entity';
import { ClassGroup } from '../../modules/students/entities/class-group.entity';
import { AcademicYear } from '../../modules/students/entities/academic-year.entity';
import { SubjectAssignment } from '../../modules/students/entities/subject-assignment.entity';

export const seedSubjectAssignments = async (dataSource: DataSource): Promise<void> => {
  const teacherRepository = dataSource.getRepository(Teacher);
  const subjectRepository = dataSource.getRepository(Subject);
  const classGroupRepository = dataSource.getRepository(ClassGroup);
  const academicYearRepository = dataSource.getRepository(AcademicYear);
  const subjectAssignmentRepository = dataSource.getRepository(SubjectAssignment);

  // Get current academic year
  const academicYear = await academicYearRepository.findOne({
    where: { isCurrent: true }
  });

  if (!academicYear) {
    console.log('→ No hay año académico activo para crear asignaciones');
    return;
  }

  // Get all teachers
  const teachers = await teacherRepository.find({
    relations: ['user', 'user.profile']
  });

  // Get all class groups
  const classGroups = await classGroupRepository.find({
    relations: ['course', 'course.cycle', 'course.cycle.educationalLevel']
  });

  // Get all subjects
  const subjects = await subjectRepository.find({
    relations: ['course', 'course.cycle', 'course.cycle.educationalLevel']
  });

  if (teachers.length === 0) {
    console.log('→ No hay profesores disponibles para crear asignaciones');
    return;
  }

  if (classGroups.length === 0) {
    console.log('→ No hay grupos de clase disponibles para crear asignaciones');
    return;
  }

  if (subjects.length === 0) {
    console.log('→ No hay asignaturas disponibles para crear asignaciones');
    return;
  }

  console.log(`→ Creando asignaciones para ${teachers.length} profesores, ${classGroups.length} grupos y ${subjects.length} asignaturas`);

  let assignmentsCreated = 0;

  // Create comprehensive subject assignments for demonstration
  const assignmentPlans = [
    // María García López - Especialista en Matemáticas y Ciencias
    {
      teacherEmail: 'maria.garcia@mwschool.es',
      assignments: [
        { subjectCode: 'MAT_3º Primaria', groupName: '3º A Primaria', weeklyHours: 4 },
        { subjectCode: 'CMNSC_3º Primaria', groupName: '3º A Primaria', weeklyHours: 3 },
        { subjectCode: 'MAT_4º Primaria', groupName: '4º A Primaria', weeklyHours: 4 },
      ]
    },
    // Ana López Martín - Especialista en Lengua e Historia
    {
      teacherEmail: 'ana.lopez@mwschool.es',
      assignments: [
        { subjectCode: 'LCL_3º Primaria', groupName: '3º A Primaria', weeklyHours: 5 },
        { subjectCode: 'LCL_4º Primaria', groupName: '4º A Primaria', weeklyHours: 5 },
        { subjectCode: 'LCL_5º Primaria', groupName: '5º A Primaria', weeklyHours: 5 },
      ]
    },
    // Carlos Ruiz Sánchez - Especialista en Educación Física y Deportes
    {
      teacherEmail: 'carlos.ruiz@mwschool.es',
      assignments: [
        { subjectCode: 'EF_3º Primaria', groupName: '3º A Primaria', weeklyHours: 2 },
        { subjectCode: 'EF_4º Primaria', groupName: '4º A Primaria', weeklyHours: 2 },
        { subjectCode: 'EF_5º Primaria', groupName: '5º A Primaria', weeklyHours: 2 },
      ]
    },
    // Laura Martínez Jiménez - Especialista en Ciencias Naturales
    {
      teacherEmail: 'laura.martinez@mwschool.es',
      assignments: [
        { subjectCode: 'CMNSC_4º Primaria', groupName: '4º A Primaria', weeklyHours: 3 },
        { subjectCode: 'CMNSC_5º Primaria', groupName: '5º A Primaria', weeklyHours: 3 },
      ]
    },
    // Diego Fernández Romero - Inglés y Educación Artística
    {
      teacherEmail: 'diego.fernandez@mwschool.es',
      assignments: [
        { subjectCode: 'ING_3º Primaria', groupName: '3º A Primaria', weeklyHours: 3 },
        { subjectCode: 'ING_4º Primaria', groupName: '4º A Primaria', weeklyHours: 3 },
        { subjectCode: 'EAR_3º Primaria', groupName: '3º A Primaria', weeklyHours: 2 },
        { subjectCode: 'EAR_4º Primaria', groupName: '4º A Primaria', weeklyHours: 2 },
      ]
    },
  ];

  for (const plan of assignmentPlans) {
    // Find teacher by email
    const teacher = teachers.find(t => t.user.email === plan.teacherEmail);
    if (!teacher) {
      console.log(`→ Profesor no encontrado: ${plan.teacherEmail}`);
      continue;
    }

    for (const assignment of plan.assignments) {
      // Find subject by code
      const subject = subjects.find(s => s.code === assignment.subjectCode);
      if (!subject) {
        console.log(`→ Asignatura no encontrada: ${assignment.subjectCode}`);
        continue;
      }

      // Find class group by name
      const classGroup = classGroups.find(g => g.name === assignment.groupName);
      if (!classGroup) {
        console.log(`→ Grupo no encontrado: ${assignment.groupName}`);
        continue;
      }

      // Check if assignment already exists
      const existingAssignment = await subjectAssignmentRepository.findOne({
        where: {
          teacher: { id: teacher.id },
          subject: { id: subject.id },
          classGroup: { id: classGroup.id },
          academicYear: { id: academicYear.id }
        }
      });

      if (!existingAssignment) {
        const subjectAssignment = subjectAssignmentRepository.create({
          teacher,
          subject,
          classGroup,
          academicYear,
          weeklyHours: assignment.weeklyHours,
          notes: `Asignación de ${subject.name} para ${classGroup.name} con ${teacher.user.profile.firstName} ${teacher.user.profile.lastName}`
        });

        await subjectAssignmentRepository.save(subjectAssignment);
        assignmentsCreated++;
        console.log(`✓ Asignación creada: ${teacher.user.profile.firstName} → ${subject.name} → ${classGroup.name} (${assignment.weeklyHours}h)`);
      } else {
        console.log(`→ Asignación ya existe: ${teacher.user.profile.firstName} → ${subject.name} → ${classGroup.name}`);
      }
    }
  }

  // Create additional assignments for remaining subjects (Religion/Values for all groups)
  const religionSubjects = subjects.filter(s => s.code.startsWith('REL_'));
  const availableTeacher = teachers[0]; // Use first teacher for religion subjects

  for (const subject of religionSubjects) {
    for (const classGroup of classGroups.slice(0, 3)) { // Only first 3 groups to avoid overwhelming
      const existingAssignment = await subjectAssignmentRepository.findOne({
        where: {
          teacher: { id: availableTeacher.id },
          subject: { id: subject.id },
          classGroup: { id: classGroup.id },
          academicYear: { id: academicYear.id }
        }
      });

      if (!existingAssignment) {
        const subjectAssignment = subjectAssignmentRepository.create({
          teacher: availableTeacher,
          subject,
          classGroup,
          academicYear,
          weeklyHours: 1,
          notes: `Asignación complementaria de ${subject.name}`
        });

        await subjectAssignmentRepository.save(subjectAssignment);
        assignmentsCreated++;
        console.log(`✓ Asignación complementaria: ${availableTeacher.user.profile.firstName} → ${subject.name} → ${classGroup.name}`);
      }
    }
  }

  console.log(`✓ Sistema de asignaciones completado: ${assignmentsCreated} asignaciones creadas`);
};