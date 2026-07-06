import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ClosureService } from '../../modules/settings/closure/closure.service';
import {
  CLOSURE_ROLES,
  isAlwaysOpenApiPath,
  resolveSectionForApiPath,
  ClosureRole,
} from '../../modules/settings/closure/closure-sections';

@Injectable()
export class ClosureMiddleware implements NestMiddleware {
  constructor(private readonly closureService: ClosureService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Usar originalUrl (canónico, incluye el prefijo global '/api'); req.path queda
    // despojado del prefijo cuando el middleware se monta bajo setGlobalPrefix('api'),
    // lo que rompería el emparejado de prefijos del catálogo (/api/...).
    const path = (req.originalUrl || req.url || req.path || '').split('?')[0];

    // El estado del cierre y auth siempre deben poder consultarse.
    if (isAlwaysOpenApiPath(path)) {
      return next();
    }

    try {
      if (!(await this.closureService.isEnabled())) {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Sin token: no es asunto del cierre; otras capas gestionan la auth.
        return next();
      }

      let role: string | undefined;
      try {
        const decoded = jwt.verify(
          authHeader.substring(7),
          process.env.JWT_SECRET || 'your-secret-key',
        ) as any;
        role = decoded?.role;
      } catch {
        return next(); // token inválido: lo gestiona la auth normal
      }

      // Admin (o cualquier rol no afectado) pasa siempre.
      if (!role || !CLOSURE_ROLES.includes(role as ClosureRole)) {
        return next();
      }

      const allowed = await this.closureService.getAllowedSections(role as ClosureRole);
      const section = resolveSectionForApiPath(path);

      // Sección permitida (cualquier método) -> pasa (escribir en comunicaciones/blog).
      if (section && allowed.includes(section.key)) {
        return next();
      }

      // Lecturas abiertas: cualquier GET/HEAD pasa (paneles/badges/notificaciones).
      const method = (req.method || 'GET').toUpperCase();
      if (method === 'GET' || method === 'HEAD') {
        return next();
      }

      // Escritura a sección no permitida/no catalogada -> congelar (423).
      const message = await this.closureService.getMessage();
      throw new HttpException(
        {
          statusCode: 423,
          error: 'Locked',
          message: 'Sección no disponible durante el cierre de curso',
          closureMode: true,
          closureMessage: message,
        },
        423,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Ante un fallo inesperado del cierre, no bloquear el sistema.
      console.warn('Could not evaluate closure status:', (error as Error).message);
      return next();
    }
  }
}
