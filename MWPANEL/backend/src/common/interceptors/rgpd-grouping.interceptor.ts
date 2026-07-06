import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Bloqueo RGPD (agrupación por nivel académico): las familias y los estudiantes
 * NUNCA deben conocer el grupo/etapa/nivel/curso (ni por asignatura) del alumno.
 * Este interceptor elimina esas claves de CUALQUIER respuesta JSON servida a un
 * usuario con rol 'family' o 'student'. Corre en el borde de la respuesta, así que
 * los cálculos internos del servidor (p.ej. conversión LOMLOE que usa la etapa) no
 * se ven afectados. El profesorado y la administración reciben los datos intactos.
 *
 * Los PDFs (boletines) no pasan por aquí (se envían como bytes) — se blindan aparte
 * en report-generator.service (se omite Etapa/Clase del boletín del alumno).
 */
const STRIP_KEYS = new Set(['classGroup', 'classGroups', 'educationalLevel', 'course', 'cycle']);
// El CÓDIGO de una asignatura suele incluir el nivel (p.ej. "MAT-3ESO"), así que también
// se oculta. Solo se borra 'code' cuando el objeto es una asignatura (llega bajo estas claves),
// para no tocar códigos legítimos (competencias LOMLOE, criterios, etc.) que la familia sí ve.
const SUBJECT_PARENT_KEYS = new Set(['subject', 'subjects']);
// El email es PII de contacto: familias y alumnos NO deben ver el correo de OTRAS personas
// (profesores, tutores, remitentes de mensajes, autores/creadores de eventos...). Cuando el
// recorrido entra en un subárbol colgado de una de estas claves, se borra 'email' en todo él
// (incl. la relación 'user' anidada, p.ej. teacher.user.email). NO se toca el email de la RAÍZ
// de la respuesta (p.ej. /auth/me devuelve el email PROPIO del usuario, que sí puede ver).
const PERSON_EMAIL_PARENT_KEYS = new Set([
  'teacher', 'tutor', 'sender', 'recipient', 'createdBy', 'lastModifiedBy', 'author',
]);
const RESTRICTED_ROLES = new Set(['family', 'student']);

function stripDeep(node: any, seen: WeakSet<object>, parentKey?: string, stripEmail = false): any {
  if (node === null || typeof node !== 'object') return node;
  if (seen.has(node)) return node; // corta ciclos (entidades TypeORM con relaciones circulares)
  seen.add(node);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = stripDeep(node[i], seen, parentKey, stripEmail);
    return node;
  }
  // Asignatura: su 'code' revela el nivel → fuera.
  if (parentKey && SUBJECT_PARENT_KEYS.has(parentKey) && 'code' in node) {
    delete node.code;
  }
  // Dentro de un subárbol de "persona ajena": el correo es PII que la familia/alumno no ve.
  if (stripEmail && 'email' in node) {
    delete node.email;
  }
  for (const key of Object.keys(node)) {
    if (STRIP_KEYS.has(key) || key === 'subjectCode') {
      delete node[key];
      continue;
    }
    const childStripEmail = stripEmail || PERSON_EMAIL_PARENT_KEYS.has(key);
    node[key] = stripDeep(node[key], seen, key, childStripEmail);
  }
  return node;
}

@Injectable()
export class RgpdGroupingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const role: string | undefined = req?.user?.role;
    if (!role || !RESTRICTED_ROLES.has(role)) return next.handle();
    return next.handle().pipe(map((body) => stripDeep(body, new WeakSet<object>(), undefined)));
  }
}
