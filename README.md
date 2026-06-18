# Secretaría — Mundo World (`secretaria.mundoworld.school`)

Plataforma de gestión administrativa del centro. Sustituye el Excel "Datos y Pagos 25-26".
Comparte la base PostgreSQL de MW Panel (schema `secretaria`), su login/JWT y su infraestructura.

> **Estado actual: Fase 0 (descubrimiento) COMPLETADA.** Ver `docs/INTEGRACION_MWPANEL.md`.
> Bloqueado para Fase 1 a la espera de respuestas (ver "Preguntas abiertas").

## Stack (alineado con MW Panel)
- Frontend: React 18 + TS + Vite (+ Ant Design / Tailwind, igual que MW Panel). PWA para el mostrador.
- Backend: NestJS + TS + TypeORM.
- BD: PostgreSQL `mwpanel`, **schema `secretaria`** (cross-schema con `public` de MW Panel).
- Auth: JWT de MW Panel + tabla `secretaria.staff_roles` (roles secretaria_admin / secretaria_staff / direccion).
- Despliegue: contenedores Docker propios tras el nginx del sistema; subdominio en Cloudflare.

## Plan por fases (criterios de aceptación en el prompt maestro)
- [x] **Fase 0** — Descubrimiento + `docs/INTEGRACION_MWPANEL.md`.
- [ ] **Fase 1** — Schema `secretaria` + migraciones + roles + seed services/programs.
- [ ] **Fase 2** — M1 (Alumnos/Familias) + M2 (Matrículas/Lista de espera).
- [ ] **Fase 3** — M11 Importador del Excel (dry-run + informe de anomalías).
- [ ] **Fase 4** — M4 Pagos + M10 Dashboard.
- [ ] **Fase 5** — M5 SEPA (XML pain.008 + devoluciones).
- [ ] **Fase 6** — M3 Horarios + Puente C.
- [ ] **Fase 7** — M6 Documentación + Puente B, M7 Pruebas, M9 Táper.
- [ ] **Fase 8** — M8 Rifas, rollover de curso, informes.
- [ ] **Fase 9** — Hardening, backups, RGPD, despliegue producción.

## Preguntas abiertas (necesarias para Fase 1)
1. Horarios: **C1** tabla común `secretaria.schedule_slots` (recomendado) vs **C2** adaptador a `schedule_sessions` de MW Panel.
2. **Tarifas reales** por servicio/programa (mensualidades, matrículas, material) para el seed de `fee_schedules`.
3. Banco y formato de remesa: **pain.008 XML** (SEPA Core) directo vs CSV de la web del banco.
4. Acceso de familias a sus pagos desde MW Panel: ¿en esta versión o se pospone?
5. DNI de tutores para mandatos SEPA: ¿obligatorio ya o se incorpora después?

## Cómo enviar el Excel de prueba (para Fase 3)
Desde tu ordenador (terminal local), súbelo al servidor por SCP:
```
scp "Datos y Pagos 25-26.xlsx" usuario@IP_DEL_SERVIDOR:/opt/mw-secretaria/import/
```
(crearé la carpeta `/opt/mw-secretaria/import/` cuando lleguemos a la Fase 3).
