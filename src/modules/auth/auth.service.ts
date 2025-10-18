import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthCredentials } from './entities/auth-credentials.entity';
import { TokenPair } from './entities/token-pair.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger = new Logger(AuthService.name),
  ) {}

  async validateUser(credentials: AuthCredentials): Promise<User | null> {
    const user = await this.usersService.findByEmail(credentials.email);
    if (user && (await bcrypt.compare(credentials.password, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: User): Promise<{ user: User; tokens: TokenPair }> {
    const tokenData = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    return { user, tokens };
  }

  async signup(user: User): Promise<{ user: User; tokens: TokenPair }> {
    try {
      // Hash the password using existing bcrypt patterns (salt rounds 10)
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user entity with hashed password
      const userToCreate = new User();
      userToCreate.email = user.email;
      userToCreate.password = hashedPassword;
      userToCreate.name = user.name;

      // Create the user using entity
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(`New user registered with email: ${createdUser.email}`);

      // Generate JWT tokens using existing getTokens method
      const tokenData = await this.getTokens(createdUser.id, createdUser.email);
      await this.updateRefreshToken(createdUser.id, tokenData.refreshToken);

      const tokens = new TokenPair();
      tokens.accessToken = tokenData.accessToken;
      tokens.refreshToken = tokenData.refreshToken;

      return { user: createdUser, tokens };
    } catch (error) {
      // Handle duplicate email errors with appropriate responses
      if (error instanceof ConflictException) {
        this.logger.warn(`Signup attempt with existing email: ${user.email}`);
        throw error;
      }

      this.logger.error('Error during user signup:', error);
      throw error;
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const decoded = await this.decodeRefreshToken(refreshToken);
    const user = await this.usersService.findById(decoded.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException();
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException();
    }

    const tokenData = await this.getTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    return { user, tokens };
  }

  async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async decodeRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch (error) {
      this.logger.error('Error decoding refresh token:', error);
      throw new UnauthorizedException();
    }
  }
}
