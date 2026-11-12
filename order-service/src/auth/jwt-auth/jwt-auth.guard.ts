import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authorization =
      request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập',
      );
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Token không hợp lệ',
      );
    }

    try {
      const payload =
        await this.authService.verifyToken(token);

      request.user = payload;
      request.accessToken = authorization;

      return true;
    } catch {
      throw new UnauthorizedException(
        'Token hết hạn hoặc không hợp lệ',
      );
    }
  }
}