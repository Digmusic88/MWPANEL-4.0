import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // DEBUG: Log JWT Auth Guard activity
    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.url}`;
    console.log(`[DEBUG] JwtAuthGuard - Route: ${route}`);
    console.log(`[DEBUG] JwtAuthGuard - IsPublic: ${isPublic}`);

    if (isPublic) {
      // For public routes, still try to extract user if token is present
      // but don't require authentication
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log(`[DEBUG] JwtAuthGuard - Public route with token, attempting to extract user`);
        // Try to validate token and extract user, but don't fail if invalid
        return new Promise((resolve) => {
          const parentActivate = super.canActivate(context);
          if (parentActivate instanceof Promise) {
            parentActivate
              .then(() => {
                console.log(`[DEBUG] JwtAuthGuard - Token valid, user extracted`);
                resolve(true);
              })
              .catch(() => {
                console.log(`[DEBUG] JwtAuthGuard - Token invalid, proceeding as anonymous`);
                resolve(true); // Still allow access, just without user
              });
          } else if (parentActivate instanceof Observable) {
            parentActivate.subscribe({
              next: () => {
                console.log(`[DEBUG] JwtAuthGuard - Token valid (observable), user extracted`);
                resolve(true);
              },
              error: () => {
                console.log(`[DEBUG] JwtAuthGuard - Token invalid (observable), proceeding as anonymous`);
                resolve(true);
              }
            });
          } else {
            resolve(true);
          }
        });
      }
      console.log(`[DEBUG] JwtAuthGuard - ALLOWED: Public route without token`);
      return true;
    }

    console.log(`[DEBUG] JwtAuthGuard - Proceeding with JWT validation`);
    return super.canActivate(context);
  }
}