import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../domain/interfaces/auth-user.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
