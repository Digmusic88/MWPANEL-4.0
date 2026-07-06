import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If a specific property is requested, return that property
    if (data && typeof data === 'string') {
      return user[data];
    }
    
    // Otherwise return the full user object
    return user;
  },
);