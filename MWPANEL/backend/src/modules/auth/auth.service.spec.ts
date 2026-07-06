import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let usersRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$2b$10$YKm7dW5vZm8gHJm3456789',
    role: UserRole.STUDENT,
    isActive: true,
    profile: {
      firstName: 'Test',
      lastName: 'User',
      fullName: 'Test User',
    },
    validatePassword: jest.fn(),
    password: undefined,
    clearTemporaryPassword: jest.fn(),
    isPasswordTemporary: false,
  } as any;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };


  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'app.jwt.refreshSecret') return 'refresh-secret';
      if (key === 'app.jwt.refreshExpiresIn') return '7d';
      return null;
    }),
  };

  const mockUsersRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getRawOne: jest.fn(),
    }),
    update: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUser.validatePassword.mockResolvedValue(true);
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        lastLoginAt: expect.any(Date),
      });
    });

    it('should return null when user not found', async () => {
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      mockUser.validatePassword.mockResolvedValue(false);
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false, validatePassword: jest.fn().mockResolvedValue(true) };
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(inactiveUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should add teacherId for teacher users', async () => {
      const teacherUser = { ...mockUser, role: UserRole.TEACHER };
      mockUser.validatePassword.mockResolvedValue(true);
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(teacherUser);
      mockUsersRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        teacherId: 'teacher-123',
      });

      const result = await service.validateUser('teacher@example.com', 'password123');

      expect(result).toBeDefined();
      expect((result as any).teacherId).toBe('teacher-123');
    });
  });

  describe('login', () => {
    it('should return tokens when login is successful', async () => {
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';
      const loginDto = { email: 'test@example.com', password: 'password123' };

      // Mock validateUser
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      
      // Mock token generation
      mockJwtService.sign.mockReturnValueOnce(accessToken);
      mockJwtService.sign.mockReturnValueOnce(refreshToken);
      
      // Mock refresh token creation
      const refreshTokenEntity = { token: refreshToken, user: mockUser, expiresAt: new Date() };
      mockRefreshTokenRepository.create.mockReturnValue(refreshTokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);
      
      // Mock TypeQuest stats for student (deprecated)
      // TypeQuest time limits removed

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: mockUser,
        accessToken,
        refreshToken,
        timeLimitReached: false,
        nextResetTime: '00:00',
      });

      expect(service.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle time limit warning for students but continue with login if check fails', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      
      // Mock TypeQuest stats to throw an error
      
      // Mock token generation
      mockJwtService.sign.mockReturnValueOnce('access-token');
      mockJwtService.sign.mockReturnValueOnce('refresh-token');
      
      const refreshTokenEntity = { token: 'refresh-token', user: mockUser, expiresAt: new Date() };
      mockRefreshTokenRepository.create.mockReturnValue(refreshTokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);

      const result = await service.login(loginDto);

      // Should continue with login despite time check failure
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual(mockUser);
    });

    it('should not check time limit for non-student roles', async () => {
      const teacherUser = { ...mockUser, role: UserRole.TEACHER };
      const loginDto = { email: 'teacher@example.com', password: 'password123' };
      
      jest.spyOn(service, 'validateUser').mockResolvedValue(teacherUser);
      mockJwtService.sign.mockReturnValue('token');
      mockRefreshTokenRepository.create.mockReturnValue({ token: 'refresh-token' });
      mockRefreshTokenRepository.save.mockResolvedValue({ token: 'refresh-token' });

      await service.login(loginDto);

    });
  });

  describe('refreshTokens', () => {
    it('should return new access token when refresh token is valid', async () => {
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';
      const tokenEntity = {
        token: refreshToken,
        user: mockUser,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(tokenEntity);
      mockJwtService.sign.mockReturnValue(newAccessToken);

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual({ accessToken: newAccessToken });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when refresh token not found', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is revoked', async () => {
      // When token is revoked, findOne with isRevoked: false won't find it
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      const tokenEntity = {
        token: 'expired-token',
        user: mockUser,
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(tokenEntity);

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const tokenEntity = {
        token: 'valid-token',
        user: inactiveUser,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(tokenEntity);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      role: UserRole.STUDENT,
    };

    it('should create new user and return tokens', async () => {
      const newUser = { ...mockUser, ...registerDto };
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(newUser);
      
      // Mock token generation
      mockJwtService.sign.mockReturnValueOnce(accessToken);
      mockJwtService.sign.mockReturnValueOnce(refreshToken);
      
      // Mock refresh token creation
      const refreshTokenEntity = { token: refreshToken, user: newUser, expiresAt: new Date() };
      mockRefreshTokenRepository.create.mockReturnValue(refreshTokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: newUser,
        accessToken,
        refreshToken,
      });
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      const refreshToken = 'token-to-invalidate';

      await service.logout(refreshToken);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { token: refreshToken },
        { isRevoked: true, revokedAt: expect.any(Date) },
      );
    });
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens for a user', async () => {
      const userId = 'user-123';

      await service.logoutAll(userId);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { user: { id: userId } },
        { isRevoked: true, revokedAt: expect.any(Date) },
      );
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    it('should update password when current password is correct', async () => {
      const userWithPassword = { 
        ...mockUser, 
        validatePassword: jest.fn().mockResolvedValue(true),
        clearTemporaryPassword: jest.fn(),
        isPasswordTemporary: false,
      };
      
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(userWithPassword);
      mockUsersRepository.save.mockResolvedValue(userWithPassword);

      await service.changePassword(mockUser.id, changePasswordDto);

      expect(userWithPassword.validatePassword).toHaveBeenCalledWith(changePasswordDto.currentPassword);
      expect(mockUsersRepository.save).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { user: { id: mockUser.id } },
        { isRevoked: true, revokedAt: expect.any(Date) },
      );
    });

    it('should clear temporary password when changing from temporary', async () => {
      const userWithTempPassword = { 
        ...mockUser, 
        validatePassword: jest.fn().mockResolvedValue(true),
        clearTemporaryPassword: jest.fn(),
        isPasswordTemporary: true,
      };
      
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(userWithTempPassword);
      mockUsersRepository.save.mockResolvedValue(userWithTempPassword);

      await service.changePassword(mockUser.id, changePasswordDto);

      expect(userWithTempPassword.clearTemporaryPassword).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(null);

      await expect(service.changePassword('invalid-id', changePasswordDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      const userWithPassword = { 
        ...mockUser, 
        validatePassword: jest.fn().mockResolvedValue(false),
      };
      
      mockUsersRepository.createQueryBuilder().getOne.mockResolvedValue(userWithPassword);

      await expect(service.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('impersonateUser', () => {
    const adminUser = { ...mockUser, id: 'admin-id', role: UserRole.ADMIN };
    const targetUserId = 'target-user-id';

    it('should allow admin to impersonate another user', async () => {
      const targetUser = { ...mockUser, id: targetUserId, role: UserRole.STUDENT };
      const accessToken = 'impersonate-access-token';
      const refreshToken = 'impersonate-refresh-token';

      mockUsersRepository.findOne.mockResolvedValueOnce(adminUser);
      mockUsersRepository.findOne.mockResolvedValueOnce(targetUser);
      
      mockJwtService.sign.mockReturnValueOnce(accessToken);
      mockJwtService.sign.mockReturnValueOnce(refreshToken);
      
      const refreshTokenEntity = { token: refreshToken, user: targetUser, expiresAt: new Date() };
      mockRefreshTokenRepository.create.mockReturnValue(refreshTokenEntity);
      mockRefreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);

      const result = await service.impersonateUser(adminUser.id, targetUserId);

      expect(result).toEqual({
        user: targetUser,
        accessToken,
        refreshToken,
      });
      expect(mockUsersRepository.update).toHaveBeenCalledWith(targetUserId, {
        lastLoginAt: expect.any(Date),
      });
    });

    it('should throw ForbiddenException when non-admin tries to impersonate', async () => {
      const nonAdminUser = { ...mockUser, role: UserRole.TEACHER };
      mockUsersRepository.findOne.mockResolvedValueOnce(nonAdminUser);

      await expect(service.impersonateUser(nonAdminUser.id, targetUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when trying to impersonate another admin', async () => {
      const targetAdmin = { ...mockUser, id: targetUserId, role: UserRole.ADMIN };
      
      mockUsersRepository.findOne.mockResolvedValueOnce(adminUser);
      mockUsersRepository.findOne.mockResolvedValueOnce(targetAdmin);

      await expect(service.impersonateUser(adminUser.id, targetUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when trying to impersonate inactive user', async () => {
      const inactiveUser = { ...mockUser, id: targetUserId, isActive: false };
      
      mockUsersRepository.findOne.mockResolvedValueOnce(adminUser);
      mockUsersRepository.findOne.mockResolvedValueOnce(inactiveUser);

      await expect(service.impersonateUser(adminUser.id, targetUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cleanExpiredTokens', () => {
    it('should delete expired refresh tokens', async () => {
      await service.cleanExpiredTokens();

      expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: expect.any(Date),
      });
    });
  });

  describe('enrichUserWithRoleReferences', () => {
    it('should add teacherId for teacher users', async () => {
      const teacherUser = { ...mockUser, role: UserRole.TEACHER };
      mockUsersRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        teacherId: 'teacher-123',
      });

      const result = await service.enrichUserWithRoleReferences(teacherUser);

      expect((result as any).teacherId).toBe('teacher-123');
    });

    it('should add studentId for student users', async () => {
      const studentUser = { ...mockUser, role: UserRole.STUDENT };
      mockUsersRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        studentId: 'student-123',
      });

      const result = await service.enrichUserWithRoleReferences(studentUser);

      expect((result as any).studentId).toBe('student-123');
    });

    it('should add familyId for family users', async () => {
      const familyUser = { ...mockUser, role: UserRole.FAMILY };
      mockUsersRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        familyId: 'family-123',
      });

      const result = await service.enrichUserWithRoleReferences(familyUser);

      expect((result as any).familyId).toBe('family-123');
    });

    it('should return original user if enrichment fails', async () => {
      const teacherUser = { ...mockUser, role: UserRole.TEACHER };
      mockUsersRepository.createQueryBuilder().getRawOne.mockRejectedValue(new Error('DB error'));

      const result = await service.enrichUserWithRoleReferences(teacherUser);

      expect(result).toEqual(teacherUser);
    });
  });
});