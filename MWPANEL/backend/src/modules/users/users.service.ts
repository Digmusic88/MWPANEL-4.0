import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está en uso');
    }

    // Create user
    const user = this.usersRepository.create({
      email: createUserDto.email,
      password: createUserDto.password,
      role: createUserDto.role,
    });

    const savedUser = await this.usersRepository.save(user);

    // Create user profile
    const profile = this.userProfileRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone,
      dni: createUserDto.dni,
      user: savedUser,
    });

    await this.userProfileRepository.save(profile);

    // Return user with profile
    return this.findOne(savedUser.id);
  }

  async findAll(
    page = 1,
    limit = 10,
    role?: UserRole,
    search?: string,
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .orderBy('user.createdAt', 'DESC');

    // Filter by role
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR profile.firstName ILIKE :search OR profile.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    const total = await queryBuilder.getCount();
    const users = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    
    return this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.id IN (:...ids)', { ids })
      .getMany();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if email is being changed and if it's already in use
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('El email ya está en uso');
      }
    }

    // Handle password change if newPassword is provided
    const { newPassword, ...restUpdateData } = updateUserDto;
    
    // Update user fields
    Object.assign(user, restUpdateData);
    
    // Set new password if provided - hash it directly
    if (newPassword && newPassword.trim() !== '') {
      user.passwordHash = await bcrypt.hash(newPassword, 10); // Hash directly
      user.updatedAt = new Date(); // Update timestamp
      user.isPasswordTemporary = false; // Reset temporary password flag
    }
    
    const savedUser = await this.usersRepository.save(user);
    // Clean sensitive data from response
    delete savedUser.password;
    delete savedUser.temporaryPassword;
    return savedUser;
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);
    
    // Check if email is being updated and if it's already in use
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateProfileDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('El email ya está en uso');
      }
      // Update user email
      user.email = updateProfileDto.email;
      await this.usersRepository.save(user);
    }

    // Separate profile data from user data
    const { email, ...profileData } = updateProfileDto;

    if (!user.profile) {
      // Create profile if it doesn't exist
      const profile = this.userProfileRepository.create({
        ...profileData,
        user,
      });
      await this.userProfileRepository.save(profile);
    } else {
      // Update existing profile
      Object.assign(user.profile, profileData);
      await this.userProfileRepository.save(user.profile);
    }

    return this.findOne(id);
  }

  async updateStudentProfile(id: string, updateStudentProfileDto: UpdateStudentProfileDto): Promise<User> {
    const user = await this.findOne(id);

    // Solo permitir cambio de contraseña y avatar para estudiantes
    if (updateStudentProfileDto.password) {
      const hashedPassword = await bcrypt.hash(updateStudentProfileDto.password, 10);
      user.password = hashedPassword;
      await this.usersRepository.save(user);
    }

    if (updateStudentProfileDto.avatarUrl) {
      if (!user.profile) {
        // Create profile if it doesn't exist
        const profile = this.userProfileRepository.create({
          avatarUrl: updateStudentProfileDto.avatarUrl,
          user,
        });
        await this.userProfileRepository.save(profile);
      } else {
        // Update existing profile avatar only
        user.profile.avatarUrl = updateStudentProfileDto.avatarUrl;
        await this.userProfileRepository.save(user.profile);
      }
    }

    return this.findOne(id);
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File): Promise<{ message: string; avatarUrl: string }> {
    console.log('🔍 [uploadProfilePhoto] Starting upload for user:', userId);
    console.log('🔍 [uploadProfilePhoto] File received:', file ? { 
      originalname: file.originalname, 
      mimetype: file.mimetype, 
      size: file.size 
    } : 'NO FILE');

    if (!file) {
      console.error('❌ [uploadProfilePhoto] No file provided');
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const user = await this.findOne(userId);
    console.log('🔍 [uploadProfilePhoto] User found:', user.id, user.email);

    try {
      // Use the profiles subdirectory within uploads
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
      
      // Ensure the profiles directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename with profile prefix
      const fileExtension = path.extname(file.originalname);
      const fileName = `profile_${userId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Save file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Create avatar URL (relative path for serving)
      const avatarUrl = `/uploads/profiles/${fileName}`;

      // Update user profile
      if (!user.profile) {
        // Create profile if it doesn't exist
        const profile = this.userProfileRepository.create({
          avatarUrl,
          user,
        });
        await this.userProfileRepository.save(profile);
      } else {
        // Delete old avatar file if it exists
        if (user.profile.avatarUrl && user.profile.avatarUrl.startsWith('/uploads/')) {
          const oldFilePath = path.join(process.cwd(), user.profile.avatarUrl.replace('/uploads/', 'uploads/'));
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.unlinkSync(oldFilePath);
            } catch (error) {
              console.warn('Warning: Could not delete old avatar file:', error.message);
            }
          }
        }

        // Update existing profile
        user.profile.avatarUrl = avatarUrl;
        await this.userProfileRepository.save(user.profile);
      }

      console.log('✅ [uploadProfilePhoto] Photo uploaded successfully:', avatarUrl);
      return {
        message: 'Foto de perfil actualizada exitosamente',
        avatarUrl,
      };
    } catch (error) {
      console.error('❌ [uploadProfilePhoto] Error uploading profile photo:', error);
      console.error('❌ [uploadProfilePhoto] Error stack:', error.stack);
      throw new BadRequestException(`Error al subir la foto de perfil: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    // Soft delete - just deactivate the user
    user.isActive = false;
    await this.usersRepository.save(user);
  }

  async restore(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.isActive = true;
    await this.usersRepository.save(user);

    return this.findOne(id);
  }

  async getStats(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    activeUsers: number;
    inactiveUsers: number;
  }> {
    const total = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({ where: { isActive: true } });
    const inactiveUsers = total - activeUsers;

    const byRole = {} as Record<UserRole, number>;
    
    for (const role of Object.values(UserRole)) {
      byRole[role] = await this.usersRepository.count({ where: { role } });
    }

    return {
      total,
      byRole,
      activeUsers,
      inactiveUsers,
    };
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { role, isActive: true },
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProfilePhoto(filename: string, res: any): Promise<any> {
    try {
      const filePath = path.join(process.cwd(), 'uploads', 'profiles', filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Imagen de perfil no encontrada');
      }

      // Set appropriate content type
      const extension = path.extname(filename).toLowerCase();
      let contentType = 'image/jpeg'; // default

      switch (extension) {
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        default:
          contentType = 'image/jpeg';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(res);

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al servir la imagen de perfil');
    }
  }
}