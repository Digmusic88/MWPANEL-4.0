import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    role: 'STUDENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      // .overrideGuard(LocalAuthGuard)
      // .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return auth tokens', async () => {
      const loginResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser,
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      const loginDto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.login(loginDto);

      expect(result).toEqual(loginResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.STUDENT,
      };

      const registeredUser = {
        id: '456',
        ...registerDto,
      };

      mockAuthService.register.mockResolvedValue(registeredUser);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registeredUser);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refreshDto = { refreshToken: 'refresh-token' };
      const newTokens = { access_token: 'new-access-token' };

      mockAuthService.refreshToken.mockResolvedValue(newTokens);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(newTokens);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshDto.refreshToken);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const body = { refreshToken: 'token-to-invalidate' };

      await controller.logout(body);

      expect(mockAuthService.logout).toHaveBeenCalledWith(body.refreshToken);
    });
  });

  // describe('profile', () => {
  //   it('should return current user profile', () => {
  //     const req = { user: mockUser };
  //     const result = controller.profile(req);

  //     expect(result).toEqual(mockUser);
  //   });
  // });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const changePasswordDto = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };
      const user = mockUser as any;

      mockAuthService.changePassword.mockResolvedValue({ success: true });

      const result = await controller.changePassword(user, changePasswordDto);

      expect(result).toEqual({ message: 'Contraseña cambiada exitosamente' });
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto,
      );
    });
  });
});