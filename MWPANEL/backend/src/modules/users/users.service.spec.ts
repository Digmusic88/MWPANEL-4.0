import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let profileRepository: Repository<UserProfile>;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProfileRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'STUDENT',
    isActive: true,
    profile: {
      id: 'profile-123',
      firstName: 'Test',
      lastName: 'User',
      phone: '123456789',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfileRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    profileRepository = module.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.STUDENT,
    } as any;

    it('should create a new user with profile', async () => {
      const hashedPassword = 'hashedPassword123';
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword));

      mockUserRepository.findOne.mockResolvedValue(null);
      mockProfileRepository.create.mockReturnValue({ ...createUserDto });
      mockProfileRepository.save.mockResolvedValue({ id: 'profile-456', ...createUserDto });
      mockUserRepository.create.mockReturnValue({
        ...createUserDto,
        password: hashedPassword,
      });
      mockUserRepository.save.mockResolvedValue({
        id: 'user-456',
        ...createUserDto,
        password: hashedPassword,
        profile: { id: 'profile-456', ...createUserDto },
      });

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.password).not.toBe(createUserDto.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-456', email: 'test2@example.com' }];
      mockUserRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockUserRepository.find).toHaveBeenCalledWith({
        relations: ['profile'],
      });
    });

    it('should return empty array when no users', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['profile'],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
        relations: ['profile'],
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '987654321',
    };

    it('should update user and profile', async () => {
      const updatedUser = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          ...updateUserDto,
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto as any);

      expect(result).toEqual(updatedUser);
      expect(result.profile.firstName).toBe((updateUserDto as any).firstName);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateUserDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update password when provided', async () => {
      const updateWithPassword = {
        ...updateUserDto,
        password: 'newpassword123',
      };
      const hashedPassword = 'newhashedpassword';

      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve(hashedPassword));
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      await service.update(mockUser.id, updateWithPassword as any);

      expect(bcrypt.hash).toHaveBeenCalledWith(updateWithPassword.password, 10);
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await service.remove(mockUser.id);

      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        isActive: false,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByRole', () => {
    it('should return users with specific role', async () => {
      const students = [
        mockUser,
        { ...mockUser, id: 'user-456', email: 'student2@example.com' },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(students),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await (service as any).findByRole('STUDENT');

      expect(result).toEqual(students);
      expect(queryBuilder.where).toHaveBeenCalledWith('user.role = :role', { role: 'STUDENT' });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', { isActive: true });
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      await (service as any).updateLastLogin(mockUser.id);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          lastLogin: expect.any(Date),
        }),
      );
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      const result = await (service as any).validatePassword(mockUser.id, 'correctpassword');

      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      const result = await (service as any).validatePassword(mockUser.id, 'wrongpassword');

      expect(result).toBe(false);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        (service as any).validatePassword('nonexistent', 'password'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});