# Análisis del Excel "Datos y Pagos 25-26 OFICIAL.xlsx"

Ubicación: `/opt/mw-secretaria/Datos y Pagos  25-26 OFICIAL.xlsx` (¡doble espacio en el nombre!).
24 hojas, estructura heterogénea del mundo real. Fechas en formato serial Excel (ej. 44422 = fecha nac.; en hojas de pago el serial = fecha en que se pagó ese mes).

## Hojas de LISTADO (roster) — alumnos + familias
Estructura: secciones por grupo. Una fila CABECERA (col2 = "Fecha nac.") cuyo col0 = nombre del grupo; debajo, filas de alumno (col0 = índice numérico, col1 = nombre).
- **"INGLES 25-26"** [2]: 17 grupos (Infants 1, Starters 1/2, Pre Movers, Movers, Flyers 1, Key 1A/2A, PET 1A/2A/2B, First 1A/2B/1B/2, CAE 1/2), ~220 alumnos.
  Cols: 0 grupo/idx, 1 nombre, 2 Fecha nac., 3 Edad, 4 Colegio, 5 Grado, 6 Madre, 7 Padre, 8 Dirección, 9 Cod.Postal, 10 Teléfono 1, 11 (Tel2?), 12 fotos(SI), 13 salida.
- **"APOYO"** [6]: roster apoyo (cols similares + Teléfono 2, Autorización fotos/Salida).
- **"DANZA 25-26"** [9]: roster danza (col con DÍA/color de grupo).
- **"ESC.ALT."** [14]: roster escuela alternativa (Foto, Tarjeta Sanitaria, Correo).
- **"MATRICULAS INGLES 26-27"** [4], **"Matricula Apoyo 26-27"** [8]: rosters del curso siguiente.

## Hojas de PAGOS — matriz alumno × mes (serial = fecha de pago; "x" = exento/no aplica)
- **"P I 25-26"** [3] / "Copia de P I 25-26" [5]: Inglés. Cols: idx, nombre, Mat, Sep..Jun, Matrícula 26-27.
- **"PA25-26"** [7]: Apoyo (idx, nombre, Mat, Sep..Jun, IBAN al final en algunas filas).
- **"PD25-26"** [10]: Danza.
- **"PEs25-26"** [16]: Escuela alt. (Matricula, Material, Agosto, Sep..).

## Otras
- **"RIFAS"** [13]: nombre, pares (Número rifas "1-50" / Dinero entregado), Mercadillo.
- **"Tupper ESC.ALT"** [19]: táper escuela, alumno × mes (nº días/importe).
- **"Horario 25-26"/[1]/"Horario danza"[11]/[12]/"Horario Esc. Enero"[17]**: horarios (rejilla, difícil de parsear automáticamente).
- **"Grupos 2526"** [18]: aulas/grupos escuela. **"FOTO-TARJETA INSCRIPCIONES"** [15]: documentos sueltos.

## Notas para el importador (M11)
- Sin ID de familia → no se pueden agrupar hermanos con fiabilidad. v1: una familia por alumno (displayName=nombre), guardians = Madre+Padre (nombre + teléfono).
- Fechas serie Excel → convertir (X.SSF o epoch 1899-12-30).
- Roster → familias+alumnos+guardians+matrículas (servicio+grupo, status matriculado, curso 2025-2026). Grupos: crear/casar por nombre.
- DRY-RUN obligatorio: previsualizar (conteos, muestra, avisos) antes de escribir. Producción.
- Pagos: importar como recibos (charges) marcados 'pagado' con paid_at=fecha serie; "x"=exento; vacío=sin recibo. OJO importe: sale de las tarifas (fn_resolve); como aún son de prueba (65€), avisar en dry-run de configurar tarifas reales antes para importes correctos. Emparejado alumno↔pago por NOMBRE normalizado (quitar acentos/espacios); hay diferencias de grafía (Dennis/Denis) → reportar no emparejados en dry-run. Filtrar filas que son sub-cabeceras de horario ("Miércoles 3.30...").

## REGLA DE BAJAS (dato del usuario)
En cada hoja de roster, a partir de un alumno concreto hacia abajo, son alumnos DADOS DE BAJA → importar con status 'baja' (no 'matriculado'). Marcadores de inicio de bajas:
- INGLES 25-26: "Dario Gonzales Montori" (fila ~174).
- APOYO: "Azman Chiaa Mansur".
- DANZA 25-26: "Sofía Chueca Rubio".
- ESC.ALT.: "Lorea Mariñelarena Pérez".
REACTIVACIÓN: tras el marcador, baja=true; pero una nueva CABECERA de grupo reactiva (baja=false) → grupos reales tras el marcador (p.ej. Inglés FIRST 1B/FIRST 2) siguen activos. Filtro anti-basura: solo cuenta como alumno si tiene fecha nac. o teléfono (≥6 dígitos).
Importador: config per-sheet con bajaStartName; al llegar a ese nombre, el resto = baja. (Las "cabeceras de grupo" detectadas dentro de la zona de bajas se ignoran para grupo.)
Pagos/rifas/táper-excel: fase posterior.
