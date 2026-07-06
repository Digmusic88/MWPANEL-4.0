import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // DEBUG: Log detailed information about the authorization check
    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.url}`;
    console.log(`[DEBUG] RolesGuard - Route: ${route}`);
    console.log(`[DEBUG] RolesGuard - Required roles:`, requiredRoles);
    console.log(`[DEBUG] RolesGuard - User present:`, !!user);
    console.log(`[DEBUG] RolesGuard - User role:`, user?.role);
    console.log(`[DEBUG] RolesGuard - User email:`, user?.email);
    
    if (!user) {
      console.log(`[DEBUG] RolesGuard - BLOCKED: No user found`);
      return false;
    }

    const hasPermission = requiredRoles.some((role) => {
      console.log(`[DEBUG] RolesGuard - Comparing user.role "${user.role}" with required role "${role}"`);
      console.log(`[DEBUG] RolesGuard - Type of user.role:`, typeof user.role);
      console.log(`[DEBUG] RolesGuard - Type of required role:`, typeof role);
      const matches = user.role === role;
      console.log(`[DEBUG] RolesGuard - Match result:`, matches);
      return matches;
    });
    console.log(`[DEBUG] RolesGuard - Has permission:`, hasPermission);
    
    if (!hasPermission) {
      console.log(`[DEBUG] RolesGuard - BLOCKED: User role "${user.role}" not in required roles [${requiredRoles.join(', ')}]`);
    }

    return hasPermission;
  }
}