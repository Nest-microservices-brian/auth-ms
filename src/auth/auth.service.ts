import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto, RegisterUserDto } from './dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  onModuleInit() {
    this.$connect();
    this.logger.log('MongoDB connected!');
  }

  async singJwt(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, name, password } = registerUserDto;
    try {
      const user = await this.user.findUnique({
        where: { email },
      });

      if (user)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'User already exists.',
        });

      const newUser = await this.user.create({
        data: {
          email,
          password: await bcrypt.hash(password, 10),
          name,
        },
      });

      const userToSend = {
        email: newUser.email,
        id: newUser.id,
        name: newUser.name,
      };

      return {
        user: userToSend,
        token: await this.singJwt(userToSend),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    try {
      const user = await this.user.findUnique({
        where: { email },
      });

      if (!user)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid credentials.',
        });

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid)
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid credentials.',
        });

      const userToSend = { email: user.email, id: user.id, name: user.name };

      return {
        user: userToSend,
        token: await this.singJwt(userToSend),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }
}
