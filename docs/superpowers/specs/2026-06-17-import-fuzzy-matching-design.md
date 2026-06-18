# Diseño: Fuzzy matching en importador Excel

**Fecha:** 2026-06-17  
**Proyecto:** Secretaría — módulo Importar Excel  
**Estado:** Aprobado

---

## Problema

El importador empareja filas de la hoja de pagos con alumnos del listado comparando nombres normalizados de forma exacta. Cualquier diferencia de grafía (tilde, orden de apellidos, abreviatura) produce un aviso genérico de "N filas no emparejadas" sin mostrar cuáles son, dejando al usuario sin forma de actuar desde el panel.

**Avisos actuales en el Excel real (curso 2025-2026):**
- INGLÉS: 34 filas
- APOYO: 53 filas
- DANZA: 14 filas
- ESCUELA: 6 filas

---

## Solución elegida: Enfoque A

Fuzzy matching en el parser + campo `mappings` opcional en el commit. Stateless; sigue el flujo preview → commit ya existente sin cambio de esquema ni estado en servidor.

---

## Sección 1 — Lógica de similitud (parser)

### Nueva función `similarity(a, b): number`

Opera sobre cadenas **ya normalizadas** (resultado de `norm()`).

1. **Word-set match**: si el conjunto de palabras de `a` es igual al de `b` (independientemente del orden) → devuelve `1.0`.  
   Cubre "García López" vs "López García".

2. **Levenshtein**: `1 - levenshtein(a, b) / Math.max(a.length, b.length)`.  
   Cubre tildes residuales, letras de más, abreviaturas leves.

La función `levenshtein` se implementa inline en el parser (sin dependencias externas).

### Umbrales

| Rango | Acción |
|---|---|
| ≥ 0.88 | **Auto-emparejado** — se aplica sin intervención; se registra en `fuzzyMatched[]` |
| 0.45 – 0.87 | **Revisión manual** — candidato propuesto en `needsReview[]` |
| < 0.45 | **Sin candidato razonable** — entra en `needsReview[]` con `candidates: []` |

### Cambio en `parseWorkbook` — tipo de retorno

```ts
interface FuzzyMatch {
  svc: string;
  paymentName: string;   // nombre tal como aparece en la hoja de pagos
  rosterName: string;    // nombre del alumno en el listado
  similarity: number;    // 0–1
}

interface ReviewItem {
  svc: string;
  paymentName: string;
  candidates: { name: string; similarity: number }[];  // top 3, orden desc
}

// parseWorkbook devuelve:
{
  students: ParsedStudent[];
  warnings: string[];
  fuzzyMatched: FuzzyMatch[];
  needsReview: ReviewItem[];
}
```

Los avisos "N filas no emparejadas" solo contarán los `needsReview` que el usuario no resuelva en el commit.

---

## Sección 2 — API

### `POST /secretaria/import/preview` (sin cambio de firma)

Devuelve los campos adicionales en el JSON de respuesta:

```json
{
  "porServicio": [...],
  "warnings": [...],
  "muestra": [...],
  "fuzzyMatched": [
    { "svc": "INGLES", "paymentName": "Juan Garcia Lopez", "rosterName": "Juan García López", "similarity": 0.94 }
  ],
  "needsReview": [
    { "svc": "APOYO", "paymentName": "Ana Mtnez", "candidates": [
        { "name": "Ana Martínez Ruiz", "similarity": 0.71 }
      ]
    }
  ]
}
```

### `POST /secretaria/import/commit` (nuevo campo opcional)

Multipart form:
- `file` — el Excel (igual que ahora)
- `mappings` *(opcional)* — JSON string con las decisiones del usuario

Formato de `mappings`:
```json
{
  "INGLES": { "juan garcia lopez": "Juan García López" },
  "APOYO":  { "ana mtnez": "Ana Martínez Ruiz" }
}
```

Las claves son `norm(paymentName)`. El backend, antes del bucle de pagos de cada servicio, inyecta las entradas de `mappings[svc]` en el `byName` del servicio (valor = el objeto `ParsedStudent` del alumno con ese `rosterName`). Los items de `needsReview` sin mapping se saltan igual que antes y generan warning en el resultado.

---

## Sección 3 — Frontend (página "Importar Excel")

El flujo subir → preview → confirmar no cambia. Se añaden dos tarjetas entre el resumen y el botón de importar, visibles solo si hay datos.

### Tarjeta A — "Emparejados automáticamente"

Visible si `fuzzyMatched.length > 0`. Colapsable (expandida por defecto).

| Col | Contenido |
|---|---|
| Nombre en Excel | `paymentName` |
| → | Nombre en listado: `rosterName` |
| Similitud | badge % (verde ≥ 90, naranja < 90) |
| Acción | Checkbox marcado por defecto; desmarcar excluye el emparejamiento |

Los desmarcados no se incluyen en `mappings` → ese pago queda sin importar.

### Tarjeta B — "Requieren revisión manual"

Visible si `needsReview.length > 0`. Colapsable (expandida por defecto).

| Col | Contenido |
|---|---|
| Servicio | tag de color |
| Nombre en Excel | `paymentName` |
| Asignar a… | `<Select>` con hasta 3 candidatos (label: "Nombre — 71%") + opción "No importar" |
| — | Si `candidates` vacío: `<Select>` de búsqueda libre sobre alumnos del servicio (GET `/students?serviceId=…`) |

"No importar" (o dejar sin seleccionar) → el pago se omite y cuenta en warnings.

### Construcción de `mappings` al commitear

```ts
const mappings: Record<string, Record<string, string>> = {};
// Tarjeta A: solo los items con checkbox marcado
for (const item of checkedAutoMatches) {
  mappings[item.svc] ??= {};
  mappings[item.svc][norm(item.paymentName)] = item.rosterName;
}
// Tarjeta B: solo los items con selección != "No importar"
for (const item of manualSelections) {
  if (item.selected && item.selected !== '__skip__') {
    mappings[item.svc] ??= {};
    mappings[item.svc][norm(item.paymentName)] = item.selected;
  }
}
```

Se envía como campo `mappings` (JSON.stringify) junto al fichero.

### Edge cases

- `fuzzyMatched` y `needsReview` vacíos → tarjetas no aparecen (comportamiento actual intacto).
- Usuario no resuelve algún item de B → importación procede, warnings incluyen los no resueltos.
- Popconfirm actual se mantiene.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `backend/src/modules/import/import.parser.ts` | Añadir `levenshtein`, `similarity`, modificar bucle de pagos, ampliar tipo de retorno |
| `backend/src/modules/import/import.controller.ts` | `commit`: leer campo `mappings` del body, inyectarlo en `byName` antes del bucle de pagos; `preview`: pasar `fuzzyMatched`/`needsReview` al summary |
| `frontend/src/App.tsx` — función `Importador()` (línea ~2013) | Añadir tarjetas A y B, refactorizar `send` para commit con `mappings` |

---

## Lo que NO cambia

- Esquema de BD — sin migraciones.
- Lógica de commit (transacción, creación de familias/alumnos/matrículas/recibos).
- Reglas de bajas (`bajaStart`).
- Endpoint de preview (firma idéntica, solo respuesta más rica).
