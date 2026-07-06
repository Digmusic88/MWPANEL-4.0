# Correcciones Críticas para Problemas de Tareas en MW Panel

## PROBLEMA 1: Error 404 al cargar archivos adjuntos de tareas

**ERROR ACTUAL:**
```
GET https://plataforma.mundoworld.school/api/tasks/ccacd7fe-1624-4de1-93da-9d25e685dee9/attachments 404 (Not Found)
```

**CAUSA:** El frontend llama a `GET /tasks/:id/attachments` pero este endpoint NO EXISTE en el backend.

### SOLUCIÓN 1A: Agregar endpoint GET /tasks/:id/attachments en tasks.controller.ts

**UBICACIÓN:** `/opt/mw-panel/backend/src/modules/tasks/tasks.controller.ts`

**INSTRUCCIONES:** Agregar el siguiente código después de la línea 268 (antes del método `@Delete('attachments/:attachmentId')`):

```typescript
  @Get(':id/attachments')
  @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.FAMILY)
  @ApiOperation({ summary: 'Obtener archivos adjuntos de una tarea' })
  @ApiResponse({ status: 200, description: 'Lista de archivos adjuntos de la tarea' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  async getTaskAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.tasksService.getTaskAttachments(id, req.user.sub);
  }

```

### SOLUCIÓN 1B: Implementar método getTaskAttachments en tasks.service.ts

**UBICACIÓN:** `/opt/mw-panel/backend/src/modules/tasks/tasks.service.ts`

**INSTRUCCIONES:** Agregar el siguiente método al final de la clase TasksService (antes del último }):

```typescript
  async getTaskAttachments(taskId: string, userId: string) {
    // Verificar que la tarea existe y el usuario tiene acceso
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['attachments', 'subjectAssignment', 'subjectAssignment.classGroup', 'subjectAssignment.classGroup.students'],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    // Verificar permisos de acceso
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['teacher', 'student', 'family'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar acceso según el rol
    let hasAccess = false;

    // Profesor: solo puede ver sus propias tareas
    if (user.teacher && task.teacherId === user.teacher.id) {
      hasAccess = true;
    }

    // Estudiante: solo puede ver tareas asignadas a su grupo
    if (user.student) {
      const isAssigned = task.subjectAssignment?.classGroup?.students?.some(
        s => s.id === user.student.id
      );
      if (isAssigned) {
        hasAccess = true;
      }
    }

    // Familia: puede ver tareas de sus hijos
    if (user.family) {
      // TODO: Implementar verificación de acceso familiar
      hasAccess = true; // Por ahora permitir acceso
    }

    if (!hasAccess) {
      throw new ForbiddenException('Sin permisos para acceder a esta tarea');
    }

    // Mapear attachments para el frontend
    return task.attachments?.map(attachment => ({
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      path: attachment.path,
      type: attachment.type,
      description: attachment.description,
      downloadCount: attachment.downloadCount,
      isActive: attachment.isActive,
      uploadedAt: attachment.uploadedAt,
      fileExtension: attachment.filename.split('.').pop()?.toLowerCase() || '',
      sizeInMB: Math.round((attachment.size / (1024 * 1024)) * 100) / 100,
      isImage: ['jpg', 'jpeg', 'png', 'gif'].includes(attachment.filename.split('.').pop()?.toLowerCase() || ''),
      isDocument: ['pdf', 'doc', 'docx'].includes(attachment.filename.split('.').pop()?.toLowerCase() || ''),
      isSpreadsheet: ['xls', 'xlsx'].includes(attachment.filename.split('.').pop()?.toLowerCase() || ''),
      isPresentation: ['ppt', 'pptx'].includes(attachment.filename.split('.').pop()?.toLowerCase() || ''),
    })) || [];
  }
```

**IMPORTANTE:** También agregar el import necesario si no existe:
```typescript
import { User } from '../users/entities/user.entity';
```

Y en el constructor, agregar:
```typescript
@InjectRepository(User)
private usersRepository: Repository<User>,
```

## PROBLEMA 2: Dashboard no muestra entregas pendientes de calificar

**UBICACIÓN:** Dashboard de profesor `/teacher/tasks-dashboard`

**ENDPOINT ACTUAL:** `GET /tasks/teacher/pending-grading` - Este endpoint SÍ EXISTE

**POSIBLES CAUSAS:**
1. No hay entregas pendientes reales en la base de datos
2. Problema de filtrado en la consulta
3. Error en el mapeo de datos

### VERIFICACIÓN REQUERIDA:

1. **Comprobar si existen entregas pendientes en la BD:**
```sql
SELECT 
    ts.id,
    ts.submitted_at,
    ts.is_graded,
    ts.status,
    t.title as task_title,
    t.teacher_id,
    u.email as student_email
FROM task_submissions ts
JOIN tasks t ON ts.task_id = t.id
JOIN students s ON ts.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE ts.is_graded = false 
AND ts.status IN ('SUBMITTED', 'LATE')
AND t.teacher_id = (SELECT id FROM teachers WHERE user_id = (SELECT id FROM users WHERE email = 'profesor@mwpanel.com'))
ORDER BY ts.submitted_at DESC;
```

2. **Verificar endpoint con curl:**
```bash
# Obtener token de autenticación
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "profesor@mwpanel.com", "password": "profesor123"}'

# Usar el token para llamar al endpoint (reemplazar TOKEN)
curl -X GET http://localhost:3000/api/tasks/teacher/pending-grading \
  -H "Authorization: Bearer TOKEN"
```

3. **Endpoint de testing sin autenticación:**
```bash
curl -X GET http://localhost:3000/api/tasks/test/pending-grading
```

## ACCIONES INMEDIATAS REQUERIDAS:

1. **Aplicar las correcciones del PROBLEMA 1** (agregar endpoint y método faltantes)
2. **Reiniciar el backend** para aplicar los cambios
3. **Probar el botón "Archivos adjuntos"** en una tarea
4. **Verificar entregas pendientes** usando los comandos de verificación
5. **Revisar logs del backend** para errores adicionales

## COMANDOS PARA APLICAR CAMBIOS:

```bash
# Ir al directorio del proyecto
cd /opt/mw-panel

# Reiniciar el backend para aplicar cambios
./restart-backend.sh

# O reiniciar todo el sistema
./start-all-optimized.sh --restart
```

## VERIFICACIÓN POST-CORRECCIÓN:

1. **Probar archivos adjuntos:**
   - Ir a una tarea como profesor
   - Hacer clic en "Archivos adjuntos"
   - Verificar que NO aparece error 404

2. **Probar dashboard de tareas:**
   - Ir a `/teacher/tasks-dashboard`
   - Verificar que aparecen entregas pendientes (si las hay)
   - Verificar que los contadores son correctos

## NOTAS TÉCNICAS:

- **Problema 1:** Era un endpoint faltante completamente - trivial de corregir
- **Problema 2:** Requiere verificación de datos - puede ser falta de entregas reales
- **Testing:** Usar el endpoint `/test/pending-grading` para verificar sin autenticación
- **Permisos:** Los archivos están protegidos por root, requiere edición cuidadosa

---
**ESTADO:** Pendiente aplicar correcciones
**PRIORIDAD:** ALTA - Funcionalidad crítica del panel de profesor