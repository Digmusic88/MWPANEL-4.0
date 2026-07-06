# Guía de Uso: ScrollableModal

## 📋 Descripción

`ScrollableModal` es un componente wrapper del Modal de Ant Design que añade automáticamente scroll cuando el contenido excede la altura de la ventana. Funciona perfectamente en móvil, tablet y desktop.

## 🚀 Características

- ✅ **Scroll Automático**: Se activa automáticamente cuando el contenido es más alto que la ventana
- ✅ **Responsive**: Funciona en todos los dispositivos (móvil, tablet, desktop)
- ✅ **Scrollbar Personalizado**: Estilos consistentes con el diseño de MW Panel
- ✅ **Compatible**: Mantiene todas las props del Modal original de Ant Design
- ✅ **Centrado Inteligente**: Se centra verticalmente cuando el contenido es pequeño
- ✅ **Smooth Scroll**: Comportamiento de scroll suave

## 📦 Instalación

El componente ya está instalado y listo para usar. Solo necesitas importarlo:

```tsx
import ScrollableModal from '@/components/common/ScrollableModal';
```

## 🎯 Uso Básico

### Ejemplo Simple

```tsx
import React, { useState } from 'react';
import { Button, Form, Input } from 'antd';
import ScrollableModal from '@/components/common/ScrollableModal';

const MyComponent = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button onClick={() => setVisible(true)}>
        Abrir Modal
      </Button>

      <ScrollableModal
        title="Mi Modal con Scroll"
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={() => setVisible(false)}
      >
        {/* Contenido del modal - puede ser tan largo como necesites */}
        <p>Contenido muy largo...</p>
        <p>Más contenido...</p>
        {/* El scroll aparecerá automáticamente si es necesario */}
      </ScrollableModal>
    </>
  );
};
```

### Ejemplo con Formulario Largo

```tsx
<ScrollableModal
  title="Formulario de Registro"
  open={visible}
  onCancel={handleCancel}
  footer={null}
  width={600}
>
  <Form layout="vertical">
    <Form.Item label="Campo 1" name="field1">
      <Input />
    </Form.Item>
    <Form.Item label="Campo 2" name="field2">
      <Input />
    </Form.Item>
    {/* Añade tantos campos como necesites */}
    {/* El scroll aparecerá automáticamente */}
  </Form>
</ScrollableModal>
```

## ⚙️ Props Personalizadas

### `maxBodyHeight`

Define la altura máxima del cuerpo del modal.

- **Tipo**: `string`
- **Default**: `'90vh'` (90% de la altura de la ventana)
- **Ejemplo**:

```tsx
<ScrollableModal
  maxBodyHeight="80vh"
  // ... otras props
>
  {/* Contenido */}
</ScrollableModal>
```

### `applyBodyPadding`

Controla si se aplica padding al body del modal.

- **Tipo**: `boolean`
- **Default**: `true`
- **Ejemplo**:

```tsx
<ScrollableModal
  applyBodyPadding={false}
  // ... otras props
>
  {/* Contenido sin padding */}
</ScrollableModal>
```

## 🎨 Todas las Props de Ant Design Modal

ScrollableModal acepta **todas las props del Modal original** de Ant Design:

```tsx
<ScrollableModal
  // Props estándar de Ant Design Modal
  title="Mi Modal"
  open={visible}
  onCancel={handleCancel}
  onOk={handleOk}
  footer={null}
  width={800}
  centered={true}
  closable={true}
  maskClosable={false}

  // Props personalizadas de ScrollableModal
  maxBodyHeight="85vh"
  applyBodyPadding={true}
>
  {/* Contenido */}
</ScrollableModal>
```

## 📱 Comportamiento por Dispositivo

### Desktop
- Altura máxima: 90vh
- Scroll vertical automático
- Scrollbar personalizado con colores MW Panel

### Tablet
- Altura máxima: 90vh
- Scroll vertical automático
- Scrollbar adaptado para touch

### Móvil
- Altura máxima: 90vh
- Scroll nativo optimizado para touch
- Margen superior reducido automáticamente

## 🎯 Casos de Uso

### ✅ Usar ScrollableModal cuando:

1. **Formularios Largos**: Formularios con muchos campos
2. **Listas Extensas**: Listas de items que pueden crecer
3. **Contenido Dinámico**: Cuando no sabes cuánto contenido habrá
4. **Detalles Completos**: Modales con mucha información
5. **Multi-paso**: Wizards o formularios multi-paso

### ❌ NO necesitas ScrollableModal cuando:

1. Modal con muy poco contenido (1-3 campos)
2. Confirmaciones simples
3. Alertas cortas
4. Modales que siempre serán pequeños

## 🔧 Personalización Avanzada

### Cambiar Colores del Scrollbar

Edita `/opt/mw-panel/frontend/src/styles/scrollable-modal.css`:

```css
.ant-modal-body::-webkit-scrollbar-thumb {
  background: #TU_COLOR_AQUI;
}

.ant-modal-body::-webkit-scrollbar-thumb:hover {
  background: #TU_COLOR_HOVER_AQUI;
}
```

### Altura Personalizada por Modal

```tsx
<ScrollableModal
  maxBodyHeight="70vh" // Modal más pequeño
  // ...
/>

<ScrollableModal
  maxBodyHeight="95vh" // Modal casi full screen
  // ...
/>
```

## 🐛 Troubleshooting

### El scroll no aparece

**Problema**: El modal es pequeño pero quieres que tenga altura fija con scroll.

**Solución**: Ajusta `maxBodyHeight` a un valor más pequeño:

```tsx
<ScrollableModal maxBodyHeight="50vh">
```

### Padding no deseado

**Problema**: Quieres contenido edge-to-edge.

**Solución**: Desactiva el padding del body:

```tsx
<ScrollableModal applyBodyPadding={false}>
```

### Contenido cortado en móvil

**Problema**: El contenido se ve cortado en dispositivos móviles.

**Solución**: El componente ya maneja esto automáticamente. Si persiste, verifica que no haya estilos personalizados conflictivos.

## 📊 Migración desde Modal Normal

### Antes

```tsx
import { Modal } from 'antd';

<Modal title="Mi Modal" open={visible}>
  {/* contenido largo */}
</Modal>
```

### Después

```tsx
import ScrollableModal from '@/components/common/ScrollableModal';

<ScrollableModal title="Mi Modal" open={visible}>
  {/* contenido largo - ahora con scroll automático */}
</ScrollableModal>
```

## 🎉 Ejemplos Reales en el Sistema

### LoginPage - Modal de Recuperación de Contraseña

```tsx
// /opt/mw-panel/frontend/src/pages/auth/LoginPage.tsx

<ScrollableModal
  title={
    <div className="text-center">
      <h3 className="text-xl font-bold text-slate-800">
        Recuperar Contraseña
      </h3>
    </div>
  }
  open={forgotPasswordVisible}
  onCancel={() => {
    setForgotPasswordVisible(false);
    forgotPasswordForm.resetFields();
  }}
  footer={null}
  centered
  className="rounded-2xl"
>
  <div className="py-4">
    <p className="text-slate-600 mb-6 text-center">
      Ingresa tu correo electrónico y te enviaremos
      una nueva contraseña temporal.
    </p>
    <Form form={forgotPasswordForm} onFinish={handleForgotPassword}>
      {/* Formulario */}
    </Form>
  </div>
</ScrollableModal>
```

## 🚀 Próximos Pasos

1. **Usa ScrollableModal** en lugar de Modal para modales con contenido variable
2. **Personaliza** usando las props `maxBodyHeight` y `applyBodyPadding`
3. **Mantén** todas las props del Modal original que ya usabas

## 📞 Soporte

Si encuentras problemas o tienes sugerencias, contacta al equipo de desarrollo.

---

**Versión**: 1.0.0
**Última actualización**: Noviembre 2025
**Compatibilidad**: Ant Design 5.x, React 18+
