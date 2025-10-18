import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/request/login.request.dto';
import { RefreshTokenRequestDto } from './dto/request/refresh-token.request.dto';
import { SignupRequestDto } from './dto/request/signup.request.dto';
import { AuthResponseDto } from './dto/response/auth.response.dto';
import { AuthMapper } from './mappers/auth.mapper';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User authentication and JWT generation' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(
    @Body() loginRequestDto: LoginRequestDto,
  ): Promise<AuthResponseDto> {
    // Convert DTO to Entity using mapper
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);

    // Validate credentials using service
    const user = await this.authService.validateUser(credentials);
    if (!user) {
      throw new UnauthorizedException();
    }

    // Call service with entity and convert result to response DTO
    const result = await this.authService.login(user);
    return this.authMapper.userToAuthResponse(result.user, result.tokens);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration with email and password' })
  @ApiBody({ type: SignupRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation errors' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async signup(
    @Body() signupRequestDto: SignupRequestDto,
  ): Promise<AuthResponseDto> {
    // Convert DTO to Entity using mapper
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);

    // Call service with entity
    const result = await this.authService.signup(userEntity);

    // Convert entity result to response DTO using mapper
    return this.authMapper.userToAuthResponse(result.user, result.tokens);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refresh(
    @Body() refreshTokenRequestDto: RefreshTokenRequestDto,
  ): Promise<AuthResponseDto> {
    // Validate refresh token is provided
    if (!refreshTokenRequestDto?.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    // Call service with refresh token and convert result to response DTO
    const result = await this.authService.refreshToken(
      refreshTokenRequestDto.refreshToken,
    );
    return this.authMapper.userToAuthResponse(result.user, result.tokens);
  }
}
