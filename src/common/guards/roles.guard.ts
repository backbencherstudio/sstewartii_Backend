import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,[context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: No user found in request');
    }

    const userRoleName = typeof user.role === 'object' ? user.role?.name : user.role;

    if (!userRoleName) {
      throw new ForbiddenException('Access denied: User does not have an assigned role');
    }

    const hasPermission = requiredRoles.includes(userRoleName);

    if (!hasPermission) {
      throw new ForbiddenException(`Access denied: Requires one of the following roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}