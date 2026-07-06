# WorldLoader Component

Componente de carga personalizado con globo girando y animación de puntos suspensivos.

## Uso

```tsx
import WorldLoader from './components/common/WorldLoader';

// Uso básico
<WorldLoader visible={isLoading} />

// Con mensaje personalizado
<WorldLoader visible={isLoading} message="Procesando datos" />
```

## Props

| Prop | Tipo | Requerido | Valor por defecto | Descripción |
|------|------|-----------|-------------------|-------------|
| `visible` | `boolean` | ✅ | - | Controla si el loader está visible |
| `message` | `string` | ❌ | `"Cargando datos"` | Mensaje a mostrar bajo el globo |

## Características

- ✨ Globo 3D girando lentamente (5 segundos por rotación)
- 📝 Texto con animación de puntos suspensivos
- 🎨 Fondo semitransparente oscuro
- 📱 Responsive y centrado
- 🎯 Z-index alto (z-50) para overlay

## Ejemplos de uso

### En un Dashboard
```tsx
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    await fetchDashboardData();
  } finally {
    setLoading(false);
  }
};

return (
  <>
    <WorldLoader visible={loading} message="Cargando dashboard" />
    {/* Contenido del dashboard */}
  </>
);
```

### En una operación específica
```tsx
const [saving, setSaving] = useState(false);

const handleSave = async () => {
  setSaving(true);
  try {
    await saveData();
  } finally {
    setSaving(false);
  }
};

return (
  <>
    <WorldLoader visible={saving} message="Guardando cambios" />
    <Button onClick={handleSave}>Guardar</Button>
  </>
);
```

## Animaciones CSS

El componente incluye dos animaciones personalizadas:

1. **fade-in**: Aparición suave del texto (1s)
2. **dots**: Animación de puntos suspensivos (1.2s loop)

## Configuración Tailwind

Se añadió la animación `spin-slow` al archivo `tailwind.config.js`:

```js
extend: {
  animation: {
    'spin-slow': 'spin 5s linear infinite',
  },
}
```