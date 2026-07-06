#!/usr/bin/env node
/**
 * Script para generar embeddings iniciales con IA real PlanTL-GOB-ES/roberta-large-bne
 * 
 * Uso:
 * npm run generate:embeddings
 * 
 * Este script utiliza el modelo real de IA para generar embeddings de alta calidad
 * de todos los descriptores curriculares para comparaciones semánticas avanzadas
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { NlpService } from '../src/modules/semantic-evaluation/services/nlp.service';

// Importar entidades
import { Competency } from '../src/modules/competencies/entities/competency.entity';
import { OperativeDescriptor } from '../src/modules/competencies/entities/operative-descriptor.entity';
import { SpecificCompetency } from '../src/modules/competencies/entities/specific-competency.entity';
import { EvaluationCriterion } from '../src/modules/competencies/entities/evaluation-criterion.entity';
import { BasicKnowledge } from '../src/modules/competencies/entities/basic-knowledge.entity';

interface EmbeddingRecord {
  id: string;
  type: string;
  text: string;
  embedding: number[];
  generatedAt: Date;
}

class EmbeddingGenerator {
  private logger = new Logger(EmbeddingGenerator.name);
  private dataSource: DataSource;
  private nlpService: NlpService;
  private batchSize = 10; // Procesar en lotes para optimizar memoria

  constructor(dataSource: DataSource, nlpService: NlpService) {
    this.dataSource = dataSource;
    this.nlpService = nlpService;
  }

  async generateAllEmbeddings(): Promise<void> {
    this.logger.log('🚀 Iniciando proceso de generación de embeddings con IA real...');

    try {
      // Verificar que el modelo de IA esté listo
      await this.waitForModelReady();

      // Mostrar información del modelo
      const modelInfo = this.nlpService.getModelInfo();
      this.logger.log(`🤖 Modelo: ${modelInfo.name} (${modelInfo.embeddingDimension}D)`);
      this.logger.log(`📊 Pipeline local: ${modelInfo.hasLocalPipeline ? '✅' : '❌'}`);
      this.logger.log(`🌐 API remota: ${modelInfo.hasRemoteAPI ? '✅' : '❌'}`);

      // Crear tabla de embeddings si no existe
      await this.createEmbeddingsTable();

      // Limpiar embeddings existentes para regenerar
      await this.cleanExistingEmbeddings();

      // Generar embeddings para cada tipo de descriptor en lotes
      await this.generateCompetencyEmbeddings();
      await this.generateOperativeDescriptorEmbeddings();
      await this.generateSpecificCompetencyEmbeddings();
      await this.generateEvaluationCriterionEmbeddings();
      await this.generateBasicKnowledgeEmbeddings();

      // Mostrar estadísticas finales
      await this.showFinalStats();

      this.logger.log('🎉 Generación de embeddings completada exitosamente!');

    } catch (error) {
      this.logger.error('❌ Error durante la generación de embeddings:', error);
      throw error;
    }
  }

  private async createEmbeddingsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS descriptor_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        descriptor_id UUID NOT NULL,
        descriptor_type VARCHAR(50) NOT NULL,
        text_content TEXT NOT NULL,
        embedding_vector FLOAT8[] NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(descriptor_id, descriptor_type)
      );
      
      CREATE INDEX IF NOT EXISTS idx_descriptor_embeddings_type 
      ON descriptor_embeddings(descriptor_type);
      
      CREATE INDEX IF NOT EXISTS idx_descriptor_embeddings_generated 
      ON descriptor_embeddings(generated_at);
    `;

    await this.dataSource.query(query);
    this.logger.log('Embeddings table created/verified');
  }

  private async generateCompetencyEmbeddings(): Promise<void> {
    this.logger.log('🎯 Generando embeddings para competencias...');

    const competencies = await this.dataSource
      .getRepository(Competency)
      .find();

    let processed = 0;
    let errors = 0;

    const processor = async (competency: any) => {
      try {
        const text = `${competency.name}. ${competency.description}`;
        const embedding = await this.nlpService.generateEmbedding(text);
        
        await this.saveEmbedding(
          competency.id,
          'competency',
          text,
          embedding
        );
        
        processed++;
      } catch (error) {
        errors++;
        this.logger.warn(`⚠️  Error procesando competencia ${competency.id}: ${error.message}`);
      }
    };

    await this.processBatch(competencies, processor);

    this.logger.log(`✅ Competencias completadas: ${processed}/${competencies.length} (${errors} errores)`);
  }

  private async generateOperativeDescriptorEmbeddings(): Promise<void> {
    this.logger.log('🎯 Generando embeddings para descriptores operativos...');

    const descriptors = await this.dataSource
      .getRepository(OperativeDescriptor)
      .find();

    let processed = 0;
    let errors = 0;

    const processor = async (descriptor: any) => {
      try {
        const text = `${descriptor.code}. ${descriptor.description}`;
        const embedding = await this.nlpService.generateEmbedding(text);
        
        await this.saveEmbedding(
          descriptor.id,
          'operative_descriptor',
          text,
          embedding
        );
        
        processed++;
      } catch (error) {
        errors++;
        this.logger.warn(`⚠️  Error procesando descriptor operativo ${descriptor.id}: ${error.message}`);
      }
    };

    await this.processBatch(descriptors, processor);

    this.logger.log(`✅ Descriptores operativos completados: ${processed}/${descriptors.length} (${errors} errores)`);
  }

  private async generateSpecificCompetencyEmbeddings(): Promise<void> {
    this.logger.log('🎯 Generando embeddings para competencias específicas...');

    const competencies = await this.dataSource
      .getRepository(SpecificCompetency)
      .find();

    let processed = 0;
    let errors = 0;

    const processor = async (competency: any) => {
      try {
        const text = `${competency.code}. ${competency.description}`;
        const embedding = await this.nlpService.generateEmbedding(text);
        
        await this.saveEmbedding(
          competency.id,
          'specific_competency',
          text,
          embedding
        );
        
        processed++;
      } catch (error) {
        errors++;
        this.logger.warn(`⚠️  Error procesando competencia específica ${competency.id}: ${error.message}`);
      }
    };

    await this.processBatch(competencies, processor);

    this.logger.log(`✅ Competencias específicas completadas: ${processed}/${competencies.length} (${errors} errores)`);
  }

  private async generateEvaluationCriterionEmbeddings(): Promise<void> {
    this.logger.log('🎯 Generando embeddings para criterios de evaluación...');

    const criteria = await this.dataSource
      .getRepository(EvaluationCriterion)
      .find();

    let processed = 0;
    let errors = 0;

    const processor = async (criterion: any) => {
      try {
        const text = `${criterion.code}. ${criterion.description}`;
        const embedding = await this.nlpService.generateEmbedding(text);
        
        await this.saveEmbedding(
          criterion.id,
          'evaluation_criterion',
          text,
          embedding
        );
        
        processed++;
      } catch (error) {
        errors++;
        this.logger.warn(`⚠️  Error procesando criterio de evaluación ${criterion.id}: ${error.message}`);
      }
    };

    await this.processBatch(criteria, processor);

    this.logger.log(`✅ Criterios de evaluación completados: ${processed}/${criteria.length} (${errors} errores)`);
  }

  private async generateBasicKnowledgeEmbeddings(): Promise<void> {
    this.logger.log('🎯 Generando embeddings para saberes básicos...');

    const knowledge = await this.dataSource
      .getRepository(BasicKnowledge)
      .find();

    let processed = 0;
    let errors = 0;

    const processor = async (item: any) => {
      try {
        const text = `${item.code}. ${item.description}`;
        const embedding = await this.nlpService.generateEmbedding(text);
        
        await this.saveEmbedding(
          item.id,
          'basic_knowledge',
          text,
          embedding
        );
        
        processed++;
      } catch (error) {
        errors++;
        this.logger.warn(`⚠️  Error procesando saber básico ${item.id}: ${error.message}`);
      }
    };

    await this.processBatch(knowledge, processor);

    this.logger.log(`✅ Saberes básicos completados: ${processed}/${knowledge.length} (${errors} errores)`);
  }

  private async saveEmbedding(
    descriptorId: string,
    descriptorType: string,
    textContent: string,
    embedding: number[]
  ): Promise<void> {
    const query = `
      INSERT INTO descriptor_embeddings (descriptor_id, descriptor_type, text_content, embedding_vector)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (descriptor_id, descriptor_type) 
      DO UPDATE SET 
        text_content = EXCLUDED.text_content,
        embedding_vector = EXCLUDED.embedding_vector,
        generated_at = CURRENT_TIMESTAMP
    `;

    await this.dataSource.query(query, [
      descriptorId,
      descriptorType,
      textContent,
      embedding
    ]);
  }

  async getEmbeddingStats(): Promise<any> {
    const query = `
      SELECT 
        descriptor_type,
        COUNT(*) as count,
        MAX(generated_at) as last_generated,
        AVG(array_length(embedding_vector, 1)) as avg_dimension
      FROM descriptor_embeddings
      GROUP BY descriptor_type
      ORDER BY descriptor_type
    `;

    const stats = await this.dataSource.query(query);
    return stats;
  }

  // Nuevos métodos para IA real

  private async waitForModelReady(): Promise<void> {
    this.logger.log('⏳ Esperando que el modelo de IA esté listo...');
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos máximo
    
    while (!this.nlpService.isReady() && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      attempts++;
      
      if (attempts % 6 === 0) { // Cada 30 segundos
        this.logger.log(`⏳ Esperando modelo... ${attempts * 5}s transcurridos`);
      }
    }
    
    if (!this.nlpService.isReady()) {
      throw new Error('El modelo de IA no está disponible después de 5 minutos');
    }
    
    this.logger.log('✅ Modelo de IA listo para generar embeddings');
  }

  private async cleanExistingEmbeddings(): Promise<void> {
    this.logger.log('🧹 Limpiando embeddings existentes...');
    
    const deleteQuery = 'DELETE FROM descriptor_embeddings';
    await this.dataSource.query(deleteQuery);
    
    this.logger.log('✅ Embeddings existentes eliminados');
  }

  private async showFinalStats(): Promise<void> {
    this.logger.log('📊 Estadísticas finales de generación:');
    
    const stats = await this.getEmbeddingStats();
    
    let totalEmbeddings = 0;
    
    stats.forEach((stat: any) => {
      const count = parseInt(stat.count);
      totalEmbeddings += count;
      
      this.logger.log(`  📁 ${stat.descriptor_type}: ${count} embeddings (${stat.avg_dimension}D)`);
    });
    
    this.logger.log(`  📈 Total: ${totalEmbeddings} embeddings generados`);
    
    // Mostrar estadísticas del cache
    const cacheStats = this.nlpService.getCacheStats();
    this.logger.log(`  💾 Cache: ${cacheStats.size}/${cacheStats.maxSize} (${Math.round(cacheStats.memoryUsage / 1024 / 1024)}MB)`);
  }

  private async processBatch<T>(items: T[], processor: (item: T) => Promise<void>): Promise<void> {
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      // Procesar lote en paralelo
      await Promise.all(batch.map(processor));
      
      // Mostrar progreso
      const progress = Math.min(i + this.batchSize, items.length);
      this.logger.log(`  📊 Progreso: ${progress}/${items.length} (${Math.round(progress / items.length * 100)}%)`);
      
      // Pequeña pausa para no sobrecargar el sistema
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
}

async function main() {
  const logger = new Logger('EmbeddingScript');
  
  try {
    logger.log('🚀 Inicializando aplicación NestJS para IA...');
    
    const app = await NestFactory.create(AppModule);
    const dataSource = app.get(DataSource);
    const nlpService = app.get(NlpService);

    const generator = new EmbeddingGenerator(dataSource, nlpService);
    
    // Mostrar información inicial
    logger.log('🤖 Script de generación de embeddings con IA real');
    logger.log('📋 Modelo: PlanTL-GOB-ES/roberta-large-bne');
    logger.log('🎯 Objetivo: Generar embeddings de alta calidad para análisis semántico');
    
    // Generar embeddings
    const startTime = Date.now();
    await generator.generateAllEmbeddings();
    const endTime = Date.now();

    // Mostrar estadísticas finales
    const stats = await generator.getEmbeddingStats();
    logger.log('📊 Estadísticas de generación de embeddings:');
    console.table(stats.map((stat: any) => ({
      'Tipo': stat.descriptor_type,
      'Cantidad': parseInt(stat.count),
      'Dimensiones': Math.round(parseFloat(stat.avg_dimension || 0)),
      'Última Generación': new Date(stat.last_generated).toLocaleString()
    })));

    const totalTime = Math.round((endTime - startTime) / 1000);
    logger.log(`⏱️  Tiempo total: ${totalTime} segundos`);

    // Mostrar estadísticas del cache
    const cacheStats = nlpService.getCacheStats();
    logger.log(`💾 Cache final: ${cacheStats.size} embeddings (${Math.round(cacheStats.memoryUsage / 1024 / 1024)}MB)`);

    await app.close();
    logger.log('✅ Aplicación cerrada exitosamente');

  } catch (error) {
    logger.error('❌ Falló la ejecución del script:', error);
    process.exit(1);
  }
}

// Ejecutar script si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { EmbeddingGenerator };