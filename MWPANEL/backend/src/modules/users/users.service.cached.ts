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
import * as bcrypt from 'bcrypt';
import { CacheService } from '../../common/services/cache.service';
import { LoggerService } from '../../common/services/logger.service';
import { CacheEvict } from '../../common/decorators/cache.decorator';

/**
 * Example of Users Service with caching implementation
 * This shows how to integrate caching into existing services
 */
@Injectable()
export class UsersServiceCached {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private cacheService: CacheService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('UsersService');
  }

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

    const newUser = await this.findOne(savedUser.id);
    
    // Invalidate related caches
    await this.cacheService.invalidateRelated('user', savedUser.id);
    
    return newUser;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: UserRole,
  ): Promise<{ data: User[]; total: number }> {
    // Create cache key for pagination
    const cacheKey = this.cacheService.getPaginationCacheKey(
      'users',
      page,
      limit,
      { search, role },
    );

    // Try to get from cache
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = this.usersRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.profile', 'profile')
          .where('user.deletedAt IS NULL');

        if (search) {
          query.andWhere(
            '(user.email LIKE :search OR profile.firstName LIKE :search OR profile.lastName LIKE :search)',
            { search: `%${search}%` },
          );
        }

        if (role) {
          query.andWhere('user.role = :role', { role });
        }

        const [data, total] = await query
          .skip((page - 1) * limit)
          .take(limit)
          .orderBy('user.createdAt', 'DESC')
          .getManyAndCount();

        return { data, total };
      },
      { ttl: 300 }, // Cache for 5 minutes
    );
  }

  async findOne(id: string): Promise<User> {
    // Create cache key
    const cacheKey = this.cacheService.getUserCacheKey(id, 'user');

    // Try to get from cache
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.usersRepository.findOne({
          where: { id },
          relations: ['profile'],
        });

        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }

        return user;
      },
      { ttl: 300 }, // Cache for 5 minutes
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    // Create cache key
    const cacheKey = `user:email:${email}`;

    // Try to get from cache
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.usersRepository.findOne({
          where: { email },
          relations: ['profile'],
        });

        return user;
      },
      { ttl: 300 }, // Cache for 5 minutes
    );
  }

  @CacheEvict(['user:*', 'dashboard:*'])
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Update password if provided
    if ((updateUserDto as any).password) {
      const hashedPassword = await bcrypt.hash((updateUserDto as any).password, 10);
      user.password = hashedPassword;
    }

    // Update other fields
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) user.isActive = updateUserDto.isActive;

    await this.usersRepository.save(user);

    // Clear specific user cache
    await this.cacheService.del(this.cacheService.getUserCacheKey(id, 'user'));
    await this.cacheService.del(`user:email:${user.email}`);

    // Invalidate related caches
    await this.cacheService.invalidateRelated('user', id);

    return this.findOne(id);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const user = await this.findOne(userId);
    const profile = user.profile;

    // Update profile fields
    Object.assign(profile, updateProfileDto);

    // Handle profile photo upload
    if ((updateProfileDto as any).profilePhoto) {
      const photoPath = await this.saveProfilePhoto(
        userId,
        (updateProfileDto as any).profilePhoto,
      );
      (profile as any).profilePhoto = photoPath;
    }

    const updatedProfile = await this.userProfileRepository.save(profile);

    // Clear user cache
    await this.cacheService.del(this.cacheService.getUserCacheKey(userId, 'user'));
    await this.cacheService.invalidateRelated('user', userId);

    return updatedProfile;
  }

  @CacheEvict(['user:*', 'dashboard:*'])
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    
    // Soft delete
    (user as any).deletedAt = new Date();
    await this.usersRepository.save(user);

    // Clear all user-related caches
    await this.cacheService.del(this.cacheService.getUserCacheKey(id, 'user'));
    await this.cacheService.del(`user:email:${user.email}`);
    await this.cacheService.invalidateRelated('user', id);
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const cacheKey = `users:role:${role}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.usersRepository.find({
          where: { role },
          relations: ['profile'],
          order: { createdAt: 'DESC' },
        });
      },
      { ttl: 600 }, // Cache for 10 minutes
    );
  }

  async countByRole(role: UserRole): Promise<number> {
    const cacheKey = `users:count:${role}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.usersRepository.count({
          where: { role },
        });
      },
      { ttl: 600 }, // Cache for 10 minutes
    );
  }

  async clearUserCache(userId: string): Promise<void> {
    await this.cacheService.del(this.cacheService.getUserCacheKey(userId, 'user'));
    await this.cacheService.delByPattern(`user:${userId}:*`);
    this.logger.debug(`Cache cleared for user ${userId}`);
  }

  private async saveProfilePhoto(
    userId: string,
    base64Image: string,
  ): Promise<string> {
    // Extract image data
    const matches = base64Image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      throw new BadRequestException('Formato de imagen inválido');
    }

    const extension = matches[1];
    const imageData = matches[2];
    const buffer = Buffer.from(imageData, 'base64');

    // Create filename and path
    const filename = `${userId}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    const filepath = path.join(uploadDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    fs.writeFileSync(filepath, buffer);

    return `/uploads/profiles/${filename}`;
  }
}