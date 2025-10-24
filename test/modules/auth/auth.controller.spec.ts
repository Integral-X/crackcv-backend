import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { SignupRequestDto } from '../../../src/modules/auth/dto/request/signup.request.dto';
import { LoginRequestDto } from '../../../src/modules/auth/dto/request/login.request.dto';
import { RefreshTokenRequestDto } from '../../../src/modules/auth/dto/request/refresh-token.request.dto';
import { AuthResponseDto } from '../../../src/modules/auth/dto/response/auth.response.dto';
import { User } from '../../../src/modules/auth/entities/user.entity';
import { AuthCredentials } from '../../../src/modules/auth/entities/auth-credentials.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let authMapper: jest.Mocked<AuthMapper>;

  const mockUser: User = Object.assign(new User(), {
    id: '1',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    refreshToken: 'refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockTokenPair: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const mockAuthResponse: AuthResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    const mockAuthService = {
      signup: jest.fn(),
      validateUser: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
    };

    const mockAuthMapper = {
      signupRequestToEntity: jest.fn(),
      loginRequestToCredentials: jest.fn(),
      userToAuthResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuthMapper,
          useValue: mockAuthMapper,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    authMapper = module.get(AuthMapper);
  });

  describe('signup', () => {
    it('should signup user successfully with DTOs and mapper', async () => {
      const signupDto: SignupRequestDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const userEntity = new User();
      userEntity.email = signupDto.email;
      userEntity.password = signupDto.password;
      userEntity.name = signupDto.name;

      authMapper.signupRequestToEntity.mockReturnValue(userEntity);
      authService.signup.mockResolvedValue({
        user: mockUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAuthResponse.mockReturnValue(mockAuthResponse);

      const result = await controller.signup(signupDto);

      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.signup).toHaveBeenCalledWith(userEntity);
      expect(authMapper.userToAuthResponse).toHaveBeenCalledWith(
        mockUser,
        mockTokenPair,
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle mapper error during signup', async () => {
      const signupDto: SignupRequestDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      authMapper.signupRequestToEntity.mockImplementation(() => {
        throw new BadRequestException('Signup data is required');
      });

      await expect(controller.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.signup).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully with DTOs and mapper', async () => {
      const loginDto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const credentials = new AuthCredentials();
      credentials.email = loginDto.email;
      credentials.password = loginDto.password;

      authMapper.loginRequestToCredentials.mockReturnValue(credentials);
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAuthResponse.mockReturnValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.validateUser).toHaveBeenCalledWith(credentials);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(authMapper.userToAuthResponse).toHaveBeenCalledWith(
        mockUser,
        mockTokenPair,
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      const loginDto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const credentials = new AuthCredentials();
      credentials.email = loginDto.email;
      credentials.password = loginDto.password;

      authMapper.loginRequestToCredentials.mockReturnValue(credentials);
      authService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.validateUser).toHaveBeenCalledWith(credentials);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should handle mapper error during login', async () => {
      const loginDto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authMapper.loginRequestToCredentials.mockImplementation(() => {
        throw new BadRequestException('Login data is required');
      });

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.validateUser).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully with DTOs and mapper', async () => {
      const refreshDto: RefreshTokenRequestDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refreshToken.mockResolvedValue({
        user: mockUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAuthResponse.mockReturnValue(mockAuthResponse);

      const result = await controller.refresh(refreshDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(authMapper.userToAuthResponse).toHaveBeenCalledWith(
        mockUser,
        mockTokenPair,
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle service error during token refresh', async () => {
      const refreshDto: RefreshTokenRequestDto = {
        refreshToken: 'invalid-refresh-token',
      };

      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(authMapper.userToAuthResponse).not.toHaveBeenCalled();
    });

    it('should handle mapper error during refresh response', async () => {
      const refreshDto: RefreshTokenRequestDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refreshToken.mockResolvedValue({
        user: mockUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAuthResponse.mockImplementation(() => {
        throw new BadRequestException('User data is required');
      });

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(authMapper.userToAuthResponse).toHaveBeenCalledWith(
        mockUser,
        mockTokenPair,
      );
    });
  });
});
