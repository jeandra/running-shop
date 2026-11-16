import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export type PublicUser = { id: string; email: string; role: Role };

export type AuthTokens = { accessToken: string; refreshToken: string };

// hash argon2 dari password acak; dipakai agar email tak dikenal butuh waktu verifikasi yang sama
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$TKRmia3CK6N+/EVRWvitDw$MrOunVxVChYJyRve7t8rO5Dh0hbngZyuzYqJ6YX2KwQ';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    const passwordHash = await this.password.hash(dto.password);

    try {
      return await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
        select: { id: true, email: true, role: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const valid = await this.password.verify(
      user?.passwordHash ?? DUMMY_HASH,
      dto.password,
    );

    if (!user || !valid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return {
      accessToken: this.tokens.signAccess(user.id, user.role),
      refreshToken: await this.tokens.issueRefresh(user.id),
    };
  }
}
