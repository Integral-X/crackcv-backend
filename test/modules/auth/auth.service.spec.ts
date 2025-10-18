import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../src/config/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { User } from '../../../src/modules/auth/entities/user.entity';
import { AuthCredentials } from '../../../src/modules/auth/entities/auth-credentials.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';

describe('AuthService', () => {
  let authService: AuthService;

  let usersService: UsersService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        JwtService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user entity if validation is successful', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'test@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = null;
      user.refreshToken = null;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await authService.validateUser(credentials);
      expect(result).toEqual(user);
      expect(usersService.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        user.password,
      );
    });

    it('should return null if user is not found', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'test@example.com';
      credentials.password = 'password';

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await authService.validateUser(credentials);
      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith(credentials.email);
    });

    it('should return null if password does not match', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'test@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = null;
      user.refreshToken = null;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await authService.validateUser(credentials);
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        user.password,
      );
    });
  });

  describe('login', () => {
    it('should return user entity and token pair', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';

      const tokenData = { accessToken: 'access', refreshToken: 'refresh' };
      jest.spyOn(authService, 'getTokens').mockResolvedValue(tokenData);
      jest
        .spyOn(authService, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await authService.login(user);

      expect(result.user).toEqual(user);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('access');
      expect(result.tokens.refreshToken).toBe('refresh');
      expect(authService.updateRefreshToken).toHaveBeenCalledWith(
        user.id,
        tokenData.refreshToken,
      );
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      jest
        .spyOn(authService, 'decodeRefreshToken')
        .mockResolvedValue({ sub: '1', email: 'test@example.com' });
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);
      await expect(
        authService.refreshToken('some-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = null;
      user.refreshToken = 'hashed-token';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        authService.refreshToken('some-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user entity and new tokens if refresh is successful', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = null;
      user.refreshToken = 'hashed-token';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const tokenData = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      };
      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(authService, 'getTokens').mockResolvedValue(tokenData);
      jest
        .spyOn(authService, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await authService.refreshToken('some-refresh-token');

      expect(result.user).toEqual(user);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('new-access');
      expect(result.tokens.refreshToken).toBe('new-refresh');
    });
  });

  describe('signup', () => {
    it('should create a new user entity and return user with tokens', async () => {
      const userEntity = new User();
      userEntity.email = 'newuser@example.com';
      userEntity.password = 'password123';
      userEntity.name = 'New User';

      const hashedPassword = 'hashedpassword123';
      const createdUser = new User();
      createdUser.id = '2';
      createdUser.email = userEntity.email;
      createdUser.password = hashedPassword;
      createdUser.name = userEntity.name;
      createdUser.refreshToken = null;
      createdUser.createdAt = new Date();
      createdUser.updatedAt = new Date();

      const tokenData = { accessToken: 'access', refreshToken: 'refresh' };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      jest.spyOn(usersService, 'create').mockResolvedValue(createdUser);
      jest.spyOn(authService, 'getTokens').mockResolvedValue(tokenData);
      jest
        .spyOn(authService, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await authService.signup(userEntity);

      expect(bcrypt.hash).toHaveBeenCalledWith(userEntity.password, 10);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userEntity.email,
          password: hashedPassword,
          name: userEntity.name,
        }),
      );
      expect(authService.getTokens).toHaveBeenCalledWith(
        createdUser.id,
        createdUser.email,
      );
      expect(authService.updateRefreshToken).toHaveBeenCalledWith(
        createdUser.id,
        tokenData.refreshToken,
      );
      expect(result.user).toEqual(createdUser);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('access');
      expect(result.tokens.refreshToken).toBe('refresh');
    });

    it('should throw ConflictException when email already exists', async () => {
      const userEntity = new User();
      userEntity.email = 'existing@example.com';
      userEntity.password = 'password123';
      userEntity.name = 'Test User';

      const hashedPassword = 'hashedpassword123';
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      jest
        .spyOn(usersService, 'create')
        .mockRejectedValue(
          new ConflictException('User with this email already exists'),
        );

      await expect(authService.signup(userEntity)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userEntity.email,
          password: hashedPassword,
          name: userEntity.name,
        }),
      );
    });

    it('should handle signup without name field', async () => {
      const userEntity = new User();
      userEntity.email = 'user@example.com';
      userEntity.password = 'password123';
      // name is undefined

      const hashedPassword = 'hashedpassword123';
      const createdUser = new User();
      createdUser.id = '3';
      createdUser.email = userEntity.email;
      createdUser.password = hashedPassword;
      createdUser.name = null;
      createdUser.refreshToken = null;
      createdUser.createdAt = new Date();
      createdUser.updatedAt = new Date();

      const tokenData = { accessToken: 'access', refreshToken: 'refresh' };

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      jest.spyOn(usersService, 'create').mockResolvedValue(createdUser);
      jest.spyOn(authService, 'getTokens').mockResolvedValue(tokenData);
      jest
        .spyOn(authService, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await authService.signup(userEntity);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userEntity.email,
          password: hashedPassword,
          name: undefined,
        }),
      );
      expect(result.user).toEqual(createdUser);
      expect(result.tokens).toBeInstanceOf(TokenPair);
    });

    it('should rethrow other errors during signup', async () => {
      const userEntity = new User();
      userEntity.email = 'test@example.com';
      userEntity.password = 'password123';

      const hashedPassword = 'hashedpassword123';
      const genericError = new Error('Database connection failed');

      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);
      jest.spyOn(usersService, 'create').mockRejectedValue(genericError);

      await expect(authService.signup(userEntity)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
