import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CredentialsPDFService } from './services/credentials-pdf.service';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Family, FamilyStudent } from './entities/family.entity';
import { FamiliesModule } from '../families/families.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, Family, FamilyStudent]),
    forwardRef(() => FamiliesModule)
  ],
  controllers: [UsersController],
  providers: [UsersService, CredentialsPDFService],
  exports: [UsersService, CredentialsPDFService],
})
export class UsersModule {}