import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithContext extends Request {
  requestId: string;
  startTime: number;
}

/**
 * Middleware para agregar contexto a cada request
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction) {
    // Generar ID único para la request
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Agregar timestamp de inicio
    req.startTime = Date.now();
    
    // Agregar headers de respuesta
    res.setHeader('X-Request-ID', req.requestId);
    
    next();
  }
}