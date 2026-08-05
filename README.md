# Secretaría — Mundo World

Plataforma de gestión administrativa para centros educativos, desarrollada como módulo integrado de **MW Panel**, el sistema de gestión escolar de Mundo World School (Navarra, España).

Sustituye la gestión manual en Excel de matrículas, pagos y domiciliaciones bancarias por un sistema centralizado, con la misma base de usuarios, autenticación y datos que el resto de la plataforma escolar.

## ¿Qué resuelve?

Los centros educativos de tamaño pequeño y mediano suelen gestionar matrículas, cuotas, listas de espera y remesas SEPA en hojas de cálculo dispersas, sin trazabilidad ni validación. Secretaría centraliza ese flujo:

- Alumnos y familias
- Matrículas y listas de espera
- Pagos y cuotas por servicio/programa
- Domiciliaciones SEPA (remesas XML pain.008)
- Horarios
- Documentación administrativa
- Dashboard e informes

## Stack técnico

- **Frontend:** React 18 + TypeScript + Vite (Ant Design / Tailwind), con soporte PWA
- **Backend:** NestJS + TypeScript + TypeORM
- **Base de datos:** PostgreSQL (schema dedicado `secretaria`, cross-schema con MW Panel)
- **Autenticación:** JWT compartido con MW Panel, roles propios (`secretaria_admin`, `secretaria_staff`, `direccion`)
- **Despliegue:** Docker, detrás de nginx, con Cloudflare

## Estado del proyecto

> **Fase 0 (descubrimiento): completada.** Ver [`docs/INTEGRACION_MWPANEL.md`](docs/INTEGRACION_MWPANEL.md).
> Desarrollo activo, en fase de definición de datos para arrancar Fase 1.

### Roadmap por fases

- [x] Fase 0 — Descubrimiento + documentación de integración
- [ ] Fase 1 — Schema `secretaria`, migraciones, roles y datos semilla
- [ ] Fase 2 — Alumnos/familias + matrículas/listas de espera
- [ ] Fase 3 — Importador desde Excel (dry-run + informe de anomalías)
- [ ] Fase 4 — Pagos + dashboard
- [ ] Fase 5 — SEPA (XML pain.008 + devoluciones)
- [ ] Fase 6 — Horarios
- [ ] Fase 7 — Documentación + pruebas
- [ ] Fase 8 — Rifas, cierre de curso, informes
- [ ] Fase 9 — Hardening, backups, RGPD, producción

## Preguntas abiertas (necesarias para Fase 1)

1. Horarios: tabla común `secretaria.schedule_slots` vs. adaptador a `schedule_sessions` de MW Panel
2. Tarifas reales por servicio/programa para el seed de `fee_schedules`
3. Formato de remesa bancaria: XML pain.008 (SEPA Core) vs. CSV del banco
4. Acceso de familias a sus pagos desde MW Panel: ¿en esta versión o se pospone?
5. DNI de tutores para mandatos SEPA: ¿obligatorio ya o se incorpora después?

## Importar el Excel de prueba (Fase 3)

```bash
scp "Datos y Pagos 25-26.xlsx" usuario@IP_DEL_SERVIDOR:/opt/mw-secretaria/import/
```

## Autor

Desarrollado y mantenido por [@Digmusic88](https://github.com/Digmusic88), como parte de la plataforma MW Panel para Mundo World School.

## Licencia

MIT — ver [LICENSE](LICENSE).
