# Protección de datos (RGPD/LOPDGDD) — Plataforma Secretaría

> Documento de cumplimiento del **Reglamento (UE) 2016/679 (RGPD)** y la **LOPDGDD 3/2018**
> para la plataforma **Secretaría** (`secretaria.mundoworld.school`).
> Última actualización: 2026-06-13. Campos entre «…» los completa el centro.

## 1. Responsable del tratamiento
- **Responsable:** «Razón social del centro» — Mundo World School.
- **CIF:** «…». **Domicilio:** «…», Pamplona (Navarra).
- **Contacto privacidad / DPD:** «correo de contacto» (designar Delegado de Protección de Datos si procede).

La plataforma Secretaría es un sistema interno de gestión administrativa de la academia/escuela,
integrado con MW Panel y alojado en la infraestructura propia del centro.

## 2. Categorías de datos tratados
- **Alumnado (incluidos menores):** nombre y apellidos, fecha de nacimiento, edad, colegio de origen,
  curso, servicio/grupo, fotografía/consentimientos, historial de matrícula y de pagos.
- **Familias y tutores:** nombre, teléfono(s), correo, dirección, **DNI/NIF** (opcional), relación.
- **Datos bancarios:** **IBAN** y datos del mandato SEPA (para domiciliación).
- **Datos de salud / categorías especiales:** «notas médicas» del alumno (alergias, necesidades).
- **Documentación:** estado de entrega de documentos (autorizaciones, tarjeta sanitaria, etc.).

> ⚠️ Se tratan datos de **menores** y **categorías especiales (salud)** → exige especial diligencia.

## 3. Finalidades y base jurídica
| Finalidad | Base jurídica (art. 6 RGPD) |
|---|---|
| Gestión de matrículas, grupos y horarios | Ejecución de contrato (6.1.b) |
| Cobro de cuotas y domiciliación SEPA | Ejecución de contrato (6.1.b) / obligación legal contable (6.1.c) |
| Comunicación con familias | Ejecución de contrato / interés legítimo (6.1.f) |
| Uso de imagen del menor | **Consentimiento** explícito (6.1.a) — autorización firmada |
| Datos de salud | **Consentimiento explícito** (9.2.a) para protección del alumno |
| Conservación contable/fiscal | Obligación legal (6.1.c) |

Para menores, el consentimiento lo otorgan los **titulares de la patria potestad o tutela**.

## 4. Conservación
- Datos académicos y de contacto: mientras dure la relación + plazos legales aplicables.
- Datos contables y de pagos (recibos, SEPA): **mínimo 6 años** (Código de Comercio / normativa fiscal).
- IBAN y mandatos SEPA: mientras esté vigente la domiciliación + plazos de reclamación de adeudos.
- Imágenes: hasta retirada del consentimiento.
- Bajas: los alumnos dados de baja se conservan marcados como `baja` el tiempo legalmente necesario y luego se anonimizan/suprimen.

## 5. Medidas de seguridad técnicas (implementadas)
- **Cifrado en reposo de datos sensibles:** IBAN y notas médicas se almacenan **cifrados** con `pgp_sym_encrypt` (pgcrypto); la clave (`SECRETARIA_CRYPTO_KEY`) vive solo como variable de entorno del servidor, nunca en la base ni en el código. En la interfaz solo se muestran los **últimos 4 dígitos** del IBAN.
- **Cifrado en tránsito:** HTTPS/TLS en todo el dominio (certificado Cloudflare).
- **Control de acceso:** autenticación mediante JWT de MW Panel + autorización por **roles** (`secretaria_admin`, `secretaria_staff`) con guards en cada endpoint. Solo personal autorizado (tabla `staff_roles`) accede.
- **Trazabilidad:** `audit_log` con trigger automático en tablas sensibles (familias, cuentas bancarias, remesas SEPA…) registrando alta/modificación/baja.
- **Minimización:** el acceso de las familias a sus pagos está pospuesto; v1 es solo para personal del centro.
- **Aislamiento:** esquema `secretaria` separado, base de datos en contenedor no expuesto a Internet; la API solo escucha en `127.0.0.1`.
- **Copias de seguridad:** backups automáticos de la base de datos (compartida con MW Panel) con retención y limpieza programada.

## 6. Medidas organizativas (a aplicar por el centro)
- Firmar **autorizaciones** (imagen, salida, tratamiento de datos de salud) con las familias.
- Limitar las altas de personal en `staff_roles` al estrictamente necesario; revisar accesos periódicamente.
- Custodiar la `SECRETARIA_CRYPTO_KEY` y los secretos del servidor.
- Formar al personal en confidencialidad y en el procedimiento ante brechas.

## 7. Derechos de las personas interesadas
Las familias/tutores pueden ejercer los derechos de **acceso, rectificación, supresión, oposición,
limitación y portabilidad** dirigiéndose a «correo de contacto». El centro debe responder en **un mes**.
- *Acceso/portabilidad:* exportable vía la sección **Informes** (CSV) o consulta directa.
- *Rectificación:* edición de los datos en la propia plataforma.
- *Supresión:* baja y posterior anonimización/eliminación cumplidos los plazos legales.

## 8. Encargados del tratamiento y terceros
- **Infraestructura/CDN:** Cloudflare (proxy/TLS) — datos en tránsito.
- **Correo transaccional:** «proveedor de email» (p. ej. Resend) si se usan notificaciones.
- (MW Panel emplea Google Drive para recursos; **Secretaría no exporta a Google Drive** datos administrativos.)
- Debe existir **contrato de encargado del tratamiento (art. 28 RGPD)** con cada proveedor.

## 9. Registro de Actividades de Tratamiento (RAT)
El centro mantendrá su RAT incluyendo, al menos, los tratamientos: *Gestión de alumnado*,
*Gestión económica y domiciliaciones*, *Documentación y autorizaciones*, *Datos de salud del alumnado*.

## 10. Violaciones de seguridad (brechas)
Ante una brecha que afecte a datos personales, el responsable debe **notificar a la AEPD en 72 horas**
(art. 33) y, si hay alto riesgo, **a los afectados** (art. 34). Registrar toda brecha (alcance, medidas, comunicación).

## 11. Evaluación de impacto (EIPD)
Por tratarse de datos de **menores** y **categorías especiales (salud)** a cierta escala, se recomienda
realizar una **Evaluación de Impacto (art. 35 RGPD)** antes de ampliaciones significativas (p. ej. portal de familias).

---
*Este documento es una guía técnico-organizativa del sistema; no sustituye al asesoramiento jurídico.
El centro, como responsable, debe validarlo y completarlo con sus datos identificativos y su RAT.*
