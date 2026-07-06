import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentNote } from '../entities/student-note.entity';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class NoteOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(StudentNote)
    private noteRepository: Repository<StudentNote>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const noteId = request.params.id || request.params.noteId;

    if (!noteId) {
      // Si no hay ID del apunte en los parámetros, permitir acceso
      // (para endpoints como GET /student-notes que no requieren ID específico)
      return true;
    }

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los administradores pueden acceder a cualquier apunte
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    try {
      const note = await this.noteRepository.findOne({
        where: { id: noteId },
        select: ['id', 'authorId', 'isPrivate'],
      });

      if (!note) {
        throw new NotFoundException('Apunte no encontrado');
      }

      // Para estudiantes: solo pueden acceder a sus propios apuntes
      if (user.role === UserRole.STUDENT) {
        if (note.authorId !== user.id) {
          throw new ForbiddenException(
            'No tienes permisos para acceder a este apunte',
          );
        }
        return true;
      }

      // Para profesores: pueden ver apuntes no privados de cualquier estudiante
      if (user.role === UserRole.TEACHER) {
        if (note.isPrivate && note.authorId !== user.id) {
          throw new ForbiddenException(
            'Este apunte es privado y no puedes acceder a él',
          );
        }
        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Error verificando permisos del apunte');
    }
  }
}