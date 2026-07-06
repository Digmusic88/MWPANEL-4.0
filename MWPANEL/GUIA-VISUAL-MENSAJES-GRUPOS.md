# 📨 Guía Visual: Envío de Mensajes por Grupos de Clase

## 🎯 Ubicación de la Funcionalidad

### Cómo Acceder (Profesor o Admin)

1. **Ir a Comunicaciones**
   - En el menú lateral izquierdo, haz clic en "Comunicaciones"
   - O navega a: `https://plataforma.mundoworld.school/teacher/communications`

2. **Abrir Modal de Mensaje Masivo**
   - En la página de Comunicaciones, busca el botón verde grande
   - Texto del botón: **"Seleccionar Destinatarios"** 📧
   - Haz clic en ese botón

3. **Ubicar la Nueva Sección**
   - Se abrirá un modal grande con varias secciones
   - La nueva funcionalidad está ubicada DESPUÉS de "Acciones Rápidas"
   - Y ANTES de "Filtros"

## 📐 Estructura Visual del Modal

```
┌────────────────────────────────────────────────────────────────────┐
│  ✉️ Enviar Mensaje a Múltiples Usuarios                  [X]       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ℹ️ Enviando como: [Tu Nombre] (admin/teacher)                     │
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ Acciones Rápidas                                              ║ │
│  ╠═══════════════════════════════════════════════════════════════╣ │
│  ║ [👥 Mis Estudiantes] [Todos los Estudiantes]                 ║ │
│  ║ [Todos los Profesores] [Todas las Familias]                  ║ │
│  ║ [❌ Limpiar Selección]                                        ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ 👥 Padres por Grupos de Clase         ⬅️ ⭐ NUEVA SECCIÓN    ║ │
│  ╠═══════════════════════════════════════════════════════════════╣ │
│  ║                                                               ║ │
│  ║ Selecciona uno o más grupos de clase para añadir a los       ║ │
│  ║ padres cuyos hijos pertenecen a esos grupos. Los padres con  ║ │
│  ║ múltiples hijos en diferentes grupos se incluyen             ║ │
│  ║ automáticamente sin duplicados.                              ║ │
│  ║                                                               ║ │
│  ║ ┌────────────────────────────────────┐  ┌─────────────────┐ ║ │
│  ║ │ Seleccionar grupos de clase...     │  │ 👥 Añadir Padres│ ║ │
│  ║ │ [dropdown múltiple]                │  │    (botón)      │ ║ │
│  ║ │                                    │  └─────────────────┘ ║ │
│  ║ │ • 1º Primaria (25 estudiantes)     │                     ║ │
│  ║ │ • 2º Primaria (30 estudiantes)     │                     ║ │
│  ║ │ • 3º Primaria (28 estudiantes)     │                     ║ │
│  ║ └────────────────────────────────────┘                     ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║ 🔍 Filtros                                                    ║ │
│  ╠═══════════════════════════════════════════════════════════════╣ │
│  ║ [Filtrar por rol ▼]      [Filtrar por clase ▼]              ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                     │
│  ... [resto del modal: Transfer, Formulario, etc.] ...            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## 🎨 Características Visuales

### Sección "Padres por Grupos de Clase"

1. **Tarjeta (Card)**: Fondo blanco, bordes suaves, sombra ligera
2. **Título**:
   - Icono: 👥 (TeamOutlined de Ant Design)
   - Texto: "Padres por Grupos de Clase"
   - Estilo: Negrita, tamaño h5

3. **Texto Explicativo**:
   - Color: Gris secundario
   - Texto: Explicación de la funcionalidad con deduplicación

4. **Selector de Grupos**:
   - Tipo: Select múltiple (Ant Design)
   - Placeholder: "Seleccionar grupos de clase"
   - Ancho: 75% de la tarjeta
   - Características:
     - Permite seleccionar múltiples grupos
     - Muestra el nombre del grupo
     - Muestra entre paréntesis el número de estudiantes
     - Ejemplo: "1º Primaria (25 estudiantes)"

5. **Botón "Añadir Padres"**:
   - Color: Azul primario (primary de Ant Design)
   - Icono: 👥 (TeamOutlined)
   - Ancho: 25% de la tarjeta
   - Estado: Deshabilitado si no hay grupos seleccionados
   - Estado: Loading mientras carga

## 🔍 ¿Por Qué Podría No Verse?

### Checklist de Verificación:

1. **✅ Usuario Correcto**
   - ¿Estás logueado como `admin` o `teacher`?
   - La sección NO se muestra para `student` o `family`

2. **✅ Página Correcta**
   - ¿Estás en la página de Comunicaciones del profesor?
   - URL debe ser: `/teacher/communications`

3. **✅ Modal Correcto**
   - ¿Hiciste clic en el botón verde "Seleccionar Destinatarios"?
   - NO en "Enviar Mensaje Rápido" ni otros botones

4. **✅ Caché del Navegador**
   - ¿Hiciste Hard Refresh? (Ctrl + Shift + R)
   - ¿El navegador cargó el archivo con timestamp `20251104152200`?
   - Verifica en DevTools > Network > index-DAYJS-FIX-*.js

5. **✅ Grupos de Clase Existentes**
   - ¿Tu institución tiene grupos de clase creados?
   - Ve a: Admin > Grupos de Clase para verificar

## 🐛 Troubleshooting

### Si la sección no aparece:

1. **Abrir Consola del Navegador** (F12)
   - Pestaña "Console"
   - ¿Hay errores en rojo?
   - ¿Hay advertencias sobre classGroups?

2. **Verificar Red (Network)**
   - Filtrar por "class-groups"
   - ¿La petición GET /api/class-groups devuelve 200?
   - ¿El response tiene datos?

3. **Forzar Recarga Completa**
   - Ctrl + Shift + Delete
   - Limpiar "Caché" y "Cookies"
   - Cerrar y abrir el navegador
   - Volver a iniciar sesión

4. **Verificar Rol del Usuario**
   - En la consola del navegador escribe:
   ```javascript
   JSON.parse(localStorage.getItem('user'))?.role
   ```
   - Debe devolver: `"admin"` o `"teacher"`

## 📸 Captura de Pantalla Esperada

```
La tarjeta debe tener:
- Fondo: Blanco (#ffffff)
- Borde: Gris claro
- Padding: 16px
- Margin bottom: 16px
- Shadow: Sombra suave de Ant Design

El selector debe:
- Ser clickable
- Abrir dropdown con lista de grupos
- Permitir seleccionar múltiples con checkboxes
- Mostrar chips de grupos seleccionados

El botón debe:
- Ser azul (#1890ff)
- Tener icono de grupo (👥)
- Decir "Añadir Padres"
- Deshabilitarse si no hay selección
```

## 🎯 Flujo de Uso Completo

1. **Abrir modal** → "Seleccionar Destinatarios"
2. **Scroll down** → Ver la sección de grupos (3ª tarjeta)
3. **Click en selector** → Se abre lista de grupos
4. **Seleccionar 1+ grupos** → Por ejemplo: "1º Primaria" + "2º Primaria"
5. **Click "Añadir Padres"** → Botón azul a la derecha
6. **Resultado**:
   - Mensaje de éxito: "X padres de los grupos seleccionados añadidos"
   - Los padres aparecen en el Transfer component
   - El selector se limpia automáticamente
7. **Continuar** → Escribir mensaje y enviar

## 📞 Soporte

Si después de seguir esta guía:
- ✅ Verificaste todos los puntos del checklist
- ✅ Hiciste hard refresh (Ctrl + Shift + R)
- ✅ No hay errores en la consola
- ❌ TODAVÍA no ves la sección

Entonces comparte:
1. Captura de pantalla del modal completo
2. Captura de la consola del navegador (F12 > Console)
3. Captura de la pestaña Network (F12 > Network)
4. Tu rol de usuario (admin/teacher/etc)

---

**Última actualización**: 4 de Noviembre 2025, 15:22:00
**Timestamp del deploy**: `DAYJS-FIX-20251104152200`
**Archivo desplegado**: `/opt/mw-panel/frontend-dist/index-DAYJS-FIX-20251104152200.js`
