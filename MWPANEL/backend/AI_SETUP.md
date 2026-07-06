# 🤖 Configuración del Sistema de IA para Evaluación Semántica

## 📋 Descripción General

Este sistema utiliza **inteligencia artificial real** con el modelo **PlanTL-GOB-ES/roberta-large-bne** para generar sugerencias automáticas de competencias, saberes básicos y criterios de evaluación según el currículo LOMLOE.

## 🔧 Configuración Técnica

### 1. Variables de Entorno

Agregar al archivo `.env`:

```bash
# HuggingFace Configuration for Semantic Evaluation
HUGGINGFACE_API_TOKEN=your-huggingface-api-token-here
NLP_MODEL_NAME=PlanTL-GOB-ES/roberta-large-bne
NLP_CACHE_SIZE=1000
NLP_BATCH_SIZE=8
NLP_MAX_TEXT_LENGTH=512
```

### 2. Token de HuggingFace

1. **Crear cuenta** en [HuggingFace](https://huggingface.co/)
2. **Generar token** en Settings → Access Tokens
3. **Configurar token** en variable `HUGGINGFACE_API_TOKEN`

### 3. Instalación de Dependencias

Las dependencias ya están configuradas en `package.json`:

```bash
npm install
# Instala automáticamente:
# - @huggingface/inference: API de HuggingFace
# - @xenova/transformers: Transformers locales
```

## 🚀 Inicialización del Sistema

### 1. Arranque Automático

El sistema de IA se inicializa automáticamente al arrancar el backend:

```bash
npm run start:dev
```

**Logs esperados:**
```
🤖 Inicializando modelo de IA PlanTL-GOB-ES/roberta-large-bne...
✅ HuggingFace Inference API configurada
📥 Cargando pipeline de embeddings...
📥 Descargando modelo: 45%...
✅ Pipeline de embeddings cargado
🎉 Modelo de IA listo para inferencia
```

### 2. Generación de Embeddings Iniciales

**Ejecutar script una sola vez** para generar embeddings de todos los descriptores curriculares:

```bash
npm run generate:embeddings
```

**Proceso esperado:**
```
🚀 Inicializando aplicación NestJS para IA...
🤖 Script de generación de embeddings con IA real
📋 Modelo: PlanTL-GOB-ES/roberta-large-bne
⏳ Esperando que el modelo de IA esté listo...
✅ Modelo de IA listo para generar embeddings
🎯 Generando embeddings para competencias...
📊 Progreso: 50/120 (42%)
✅ Competencias completadas: 120/120 (0 errores)
📊 Estadísticas finales de generación:
  📁 competency: 120 embeddings (768D)
  📁 specific_competency: 89 embeddings (768D)
  📈 Total: 450 embeddings generados
⏱️  Tiempo total: 234 segundos
✅ Aplicación cerrada exitosamente
```

## 🎯 Tipos de IA Implementados

### 1. **Pipeline Local** (Preferido)
- **Modelo**: PlanTL-GOB-ES/roberta-large-bne descargado localmente
- **Ventajas**: Rápido, sin límites de API, privacidad total
- **Desventajas**: Requiere más memoria (~2GB)
- **Dimensiones**: 768 (RoBERTa estándar)

### 2. **API Remota HuggingFace** (Fallback)
- **Modelo**: Mismo modelo en la nube
- **Ventajas**: Sin requerimientos de memoria local
- **Desventajas**: Requiere internet, límites de API
- **Dimensiones**: 768

### 3. **Modo Simulado Avanzado** (Fallback Final)
- **Funcionamiento**: Análisis semántico educativo avanzado
- **Ventajas**: Siempre funciona, rápido
- **Desventajas**: Menos precisión que IA real
- **Dimensiones**: 768 (compatible)

## 📊 Arquitectura del Sistema

### Flujo de Procesamiento

```
1. Texto de Actividad Educativa
   ↓
2. Preprocesamiento (limpieza, normalización)
   ↓
3. Generación de Embedding (768D)
   ↓
4. Búsqueda por Similitud Coseno
   ↓
5. Filtrado por Etapa/Materia
   ↓
6. Ranking por Confianza
   ↓
7. Sugerencias para el Profesor
```

### Cache Inteligente

- **Tamaño**: 1000 embeddings en memoria
- **Estrategia**: LRU (Least Recently Used)
- **Persistencia**: Base de datos PostgreSQL
- **Optimización**: Reutilización entre sesiones

## 🎨 Interfaz de Usuario

### Página del Profesor: `/teacher/auto-evaluator`

#### **Pestaña Analizador**
1. **Formulario de Entrada**:
   - Título de la actividad
   - Descripción detallada
   - Etapa educativa (Infantil/Primaria/Secundaria)
   - Materia (opcional)

2. **Resultados de IA**:
   - Cards de sugerencias con scores de confianza
   - Colores por tipo: Azul (competencias), Verde (saberes), Naranja (criterios)
   - Acciones: Aceptar/Rechazar
   - Progress bars de similitud

3. **Resumen de Selección**:
   - Estadísticas en tiempo real
   - Contador de aceptadas/rechazadas
   - Similitud promedio

#### **Pestaña Historial**
- Tabla de evaluaciones anteriores
- Filtros por fecha y etapa
- Exportación de resultados

#### **Pestaña Estadísticas**
- Métricas de uso personal
- Tasa de aceptación
- Gráficos de tendencias

## 🔍 Monitoreo y Debugging

### Logs del Sistema

```bash
# Verificar estado del modelo
curl http://localhost:3000/api/semantic-evaluation/health

# Response esperado:
{
  "status": "OK",
  "modelReady": true,
  "hasLocalPipeline": true,
  "embeddingDimension": 768
}
```

### Métricas de Rendimiento

```typescript
// Estadísticas del cache
GET /api/semantic-evaluation/stats

{
  "totalEvaluations": 156,
  "acceptanceRate": 78.5,
  "avgSimilarity": 0.742,
  "uniqueActivities": 89
}
```

## ⚡ Optimización de Rendimiento

### Recomendaciones de Hardware

- **RAM mínima**: 8GB (4GB para el modelo + 4GB sistema)
- **RAM recomendada**: 16GB+ para mejor rendimiento
- **CPU**: Multi-core recomendado
- **GPU**: Opcional, mejora velocidad de inferencia

### Configuración de Producción

```bash
# Variables de optimización en .env
NLP_CACHE_SIZE=2000        # Más cache para producción
NLP_BATCH_SIZE=16          # Lotes más grandes si hay RAM
NODE_ENV=production        # Optimizaciones automáticas
```

### Monitoreo de Memoria

```bash
# Ver uso de memoria del contenedor
docker stats mw-panel-backend

# Logs de memoria del sistema de IA
docker logs mw-panel-backend | grep "💾 Cache"
```

## 🛠️ Troubleshooting

### Problemas Comunes

1. **"Modelo no está listo"**
   - **Causa**: Descarga en progreso o fallo de conectividad
   - **Solución**: Esperar o verificar token HuggingFace

2. **"Error downloading model"**
   - **Causa**: Token inválido o límites de API
   - **Solución**: Verificar `HUGGINGFACE_API_TOKEN`

3. **"Out of memory"**
   - **Causa**: Insuficiente RAM
   - **Solución**: Aumentar memoria Docker o usar API remota

4. **"Embedding dimension mismatch"**
   - **Causa**: Mix de embeddings de diferentes modelos
   - **Solución**: Regenerar embeddings con `npm run generate:embeddings`

### Diagnóstico Avanzado

```bash
# Ver información detallada del modelo
curl http://localhost:3000/api/semantic-evaluation/health | jq

# Verificar embeddings en BD
docker exec -it mw-panel-postgres psql -U mwpanel -d mwpanel \
  -c "SELECT descriptor_type, COUNT(*), AVG(array_length(embedding_vector, 1)) FROM descriptor_embeddings GROUP BY descriptor_type;"

# Limpiar cache y reiniciar
curl -X POST http://localhost:3000/api/semantic-evaluation/clear-cache
```

## 🔄 Actualizaciones del Modelo

### Cambiar a Otro Modelo

1. **Actualizar configuración**:
```bash
# En .env
NLP_MODEL_NAME=otro-modelo-de-huggingface
```

2. **Regenerar embeddings**:
```bash
npm run generate:embeddings
```

3. **Verificar compatibilidad**:
```bash
curl http://localhost:3000/api/semantic-evaluation/health
```

## 📚 Recursos Adicionales

- [Documentación PlanTL-GOB-ES](https://huggingface.co/PlanTL-GOB-ES/roberta-large-bne)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers)
- [Xenova Transformers.js](https://huggingface.co/docs/transformers.js)

## 🎉 Estado de Implementación

✅ **IA Real Integrada**: Modelo PlanTL-GOB-ES/roberta-large-bne  
✅ **Cache Inteligente**: Optimización de memoria y velocidad  
✅ **Fallbacks Robustos**: 3 niveles de degradación graceful  
✅ **Interfaz Completa**: Dashboard para profesores  
✅ **Monitoreo Avanzado**: Métricas y debugging  
✅ **Documentación Completa**: Setup y troubleshooting  

**Sistema listo para producción con IA de última generación** 🚀