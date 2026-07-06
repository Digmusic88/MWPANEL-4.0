/**
 * @archivo: email-automation.service.ts
 * @módulo: Communications - Email Notifications System
 * @función: Servicio para gestión de automatizaciones de email
 * @creado_por: Sistema de Notificaciones Automatizadas MW Panel 2.0
 * @fecha: 2025-01-13
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailAutomation, EmailEventType, EmailRecipientType } from '../entities/email-automation.entity';
import { EmailTemplate } from '../entities/email-template.entity';
import { User } from '../../users/entities/user.entity';
import { CreateEmailAutomationDto, UpdateEmailAutomationDto } from '../dto/email-automation.dto';

@Injectable()
export class EmailAutomationService {
  private readonly logger = new Logger(EmailAutomationService.name);

  constructor(
    @InjectRepository(EmailAutomation)
    private emailAutomationRepository: Repository<EmailAutomation>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Crear nueva automatización
   */
  async createAutomation(createDto: CreateEmailAutomationDto): Promise<EmailAutomation> {
    // Verificar que la plantilla existe
    const template = await this.emailTemplateRepository.findOne({ 
      where: { id: createDto.templateId } 
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const automation = this.emailAutomationRepository.create({
      ...createDto,
      conditions: createDto.conditions ? JSON.stringify(createDto.conditions) : null,
      isActive: createDto.isActive ?? true,
    });

    const savedAutomation = await this.emailAutomationRepository.save(automation);
    this.logger.log(`✅ Created email automation: ${savedAutomation.name}`);
    
    return this.getAutomationById(savedAutomation.id);
  }

  /**
   * Actualizar automatización
   */
  async updateAutomation(id: string, updateDto: UpdateEmailAutomationDto): Promise<EmailAutomation> {
    const automation = await this.emailAutomationRepository.findOne({ where: { id } });
    
    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    // Verificar plantilla si se está cambiando
    if (updateDto.templateId) {
      const template = await this.emailTemplateRepository.findOne({ 
        where: { id: updateDto.templateId } 
      });
      if (!template) {
        throw new NotFoundException('Template not found');
      }
    }

    Object.assign(automation, {
      ...updateDto,
      conditions: updateDto.conditions ? JSON.stringify(updateDto.conditions) : automation.conditions,
    });

    const savedAutomation = await this.emailAutomationRepository.save(automation);
    this.logger.log(`✅ Updated email automation: ${savedAutomation.name}`);
    
    return this.getAutomationById(savedAutomation.id);
  }

  /**
   * Obtener todas las automatizaciones
   */
  async getAllAutomations(): Promise<EmailAutomation[]> {
    return await this.emailAutomationRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['template', 'createdBy'],
    });
  }

  /**
   * Obtener automatizaciones activas
   */
  async getActiveAutomations(): Promise<EmailAutomation[]> {
    return await this.emailAutomationRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
      relations: ['template'],
    });
  }

  /**
   * Obtener automatización por ID
   */
  async getAutomationById(id: string): Promise<EmailAutomation> {
    const automation = await this.emailAutomationRepository.findOne({
      where: { id },
      relations: ['template', 'createdBy'],
    });

    if (!automation) {
      throw new NotFoundException(`Automation with ID ${id} not found`);
    }

    return automation;
  }

  /**
   * Obtener automatizaciones por tipo de evento
   */
  async getAutomationsByEvent(eventType: EmailEventType): Promise<EmailAutomation[]> {
    return await this.emailAutomationRepository.find({
      where: { eventType, isActive: true },
      relations: ['template'],
    });
  }

  /**
   * Eliminar automatización
   */
  async deleteAutomation(id: string): Promise<void> {
    const automation = await this.getAutomationById(id);
    await this.emailAutomationRepository.remove(automation);
    this.logger.log(`🗑️ Deleted email automation: ${automation.name}`);
  }

  /**
   * Activar/desactivar automatización
   */
  async toggleAutomationActive(id: string): Promise<EmailAutomation> {
    const automation = await this.getAutomationById(id);
    automation.isActive = !automation.isActive;
    
    const savedAutomation = await this.emailAutomationRepository.save(automation);
    this.logger.log(`🔄 Toggled automation active status: ${automation.name} -> ${automation.isActive}`);
    
    return savedAutomation;
  }

  /**
   * Obtener estadísticas de automatizaciones
   */
  async getAutomationStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalEmailsSent: number;
    byEventType: Record<string, number>;
  }> {
    const automations = await this.getAllAutomations();
    
    const total = automations.length;
    const active = automations.filter(a => a.isActive).length;
    const inactive = total - active;
    const totalEmailsSent = automations.reduce((sum, a) => sum + a.totalEmailsSent, 0);
    
    const byEventType = automations.reduce((acc, automation) => {
      acc[automation.eventType] = (acc[automation.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive,
      totalEmailsSent,
      byEventType,
    };
  }

  /**
   * Incrementar contador de emails enviados
   */
  async incrementEmailsSent(id: string): Promise<void> {
    await this.emailAutomationRepository.increment({ id }, 'totalEmailsSent', 1);
  }
}