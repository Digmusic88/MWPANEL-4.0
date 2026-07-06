import { DataSource } from 'typeorm';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';

export const seedTeachers = async (dataSource: DataSource): Promise<void> => {
  const userRepository = dataSource.getRepository(User);
  const teacherRepository = dataSource.getRepository(Teacher);

  console.log('🎯 Seeding Teachers...');

  // Find all teacher users
  const teacherUsers = await userRepository.find({
    where: { role: UserRole.TEACHER },
    relations: ['profile'],
  });

  if (teacherUsers.length === 0) {
    console.log('⚠️ No teacher users found. Running users seed first...');
    return;
  }

  const teacherData = [
    {
      email: 'profesor@mwpanel.com',
      employeeNumber: 'EMP001',
      specialties: ['Matemáticas', 'Física'],
      department: 'Departamento de Ciencias',
      position: 'Profesor Titular',
      education: 'Licenciado en Matemáticas, Máster en Física',
      hireDate: '2020-09-01',
    },
    {
      email: 'ana.lopez@mwpanel.com',
      employeeNumber: 'EMP002',
      specialties: ['Lengua y Literatura', 'Historia'],
      department: 'Departamento de Humanidades',
      position: 'Profesora Titular',
      education: 'Licenciada en Filología Hispánica',
      hireDate: '2019-09-01',
    },
    {
      email: 'carlos.ruiz@mwpanel.com',
      employeeNumber: 'EMP003',
      specialties: ['Educación Física', 'Deportes'],
      department: 'Departamento de Educación Física',
      position: 'Profesor de Educación Física',
      education: 'Licenciado en Ciencias del Deporte',
      hireDate: '2021-09-01',
    },
  ];

  for (const data of teacherData) {
    // Find the user for this teacher
    const user = teacherUsers.find(u => u.email === data.email);
    if (!user) {
      console.log(`⚠️ User not found for email: ${data.email}`);
      continue;
    }

    // Check if teacher already exists
    const existingTeacher = await teacherRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!existingTeacher) {
      // Update user profile with additional teacher info
      if (user.profile) {
        user.profile.department = data.department;
        user.profile.position = data.position;
        user.profile.education = data.education;
        user.profile.hireDate = new Date(data.hireDate);
        await dataSource.getRepository('UserProfile').save(user.profile);
      }

      // Create teacher entity
      const teacher = teacherRepository.create({
        employeeNumber: data.employeeNumber,
        specialties: data.specialties,
        user,
      });

      await teacherRepository.save(teacher);
      console.log(`✓ Profesor creado: ${user.profile?.firstName} ${user.profile?.lastName} (${data.employeeNumber})`);
    } else {
      console.log(`→ Profesor ya existe: ${user.profile?.firstName} ${user.profile?.lastName}`);
    }
  }
};