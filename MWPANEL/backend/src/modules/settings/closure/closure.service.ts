import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings.service';
import { SettingCategory } from '../entities/system-setting.entity';
import {
  ClosureRole,
  CLOSURE_ROLES,
  DEFAULT_ALLOWED_SECTIONS,
  CLOSURE_SAFETY_FLOOR_SECTIONS,
} from './closure-sections';

const KEY_ENABLED = 'closure_mode_enabled';
const KEY_MESSAGE = 'closure_message';
const KEY_UPDATED_AT = 'closure_updated_at';
const KEY_UPDATED_BY = 'closure_updated_by';
const keyAllowed = (role: ClosureRole) => `closure_allowed_sections_${role}`;

@Injectable()
export class ClosureService {
  constructor(private readonly settingsService: SettingsService) {}

  async isEnabled(): Promise<boolean> {
    return this.settingsService.getBoolean(KEY_ENABLED, false);
  }

  async getMessage(): Promise<string> {
    return this.settingsService.getString(KEY_MESSAGE, '');
  }

  async getAllowedSections(role: ClosureRole): Promise<string[]> {
    const stored = await this.settingsService.getJSON<string[]>(
      keyAllowed(role),
      DEFAULT_ALLOWED_SECTIONS,
    );
    const base = Array.isArray(stored) && stored.length ? stored : DEFAULT_ALLOWED_SECTIONS;
    return Array.from(new Set([...base, ...CLOSURE_SAFETY_FLOOR_SECTIONS]));
  }

  async getStatusForRole(role: string): Promise<{ enabled: boolean; allowedSections: string[]; message: string }> {
    const enabled = await this.isEnabled();
    const affected = CLOSURE_ROLES.includes(role as ClosureRole);
    if (!enabled || !affected) {
      return { enabled: false, allowedSections: [], message: '' };
    }
    return {
      enabled: true,
      allowedSections: await this.getAllowedSections(role as ClosureRole),
      message: await this.getMessage(),
    };
  }

  async getConfig() {
    const allowedSectionsByRole = {} as Record<ClosureRole, string[]>;
    for (const role of CLOSURE_ROLES) {
      // Config view: lista almacenada tal cual (sin forzar suelo) para edición.
      allowedSectionsByRole[role] = await this.settingsService.getJSON<string[]>(
        keyAllowed(role),
        DEFAULT_ALLOWED_SECTIONS,
      );
    }
    return {
      enabled: await this.isEnabled(),
      allowedSectionsByRole,
      message: await this.getMessage(),
      updatedAt: await this.settingsService.getString(KEY_UPDATED_AT, ''),
      updatedBy: await this.settingsService.getString(KEY_UPDATED_BY, ''),
    };
  }

  private async persistLists(allowedSectionsByRole: Record<string, string[]>): Promise<void> {
    for (const role of CLOSURE_ROLES) {
      const list = allowedSectionsByRole[role];
      if (Array.isArray(list)) {
        await this.settingsService.upsert(keyAllowed(role), list, {
          name: `Cierre: secciones permitidas (${role})`,
          category: SettingCategory.GENERAL,
        });
      }
    }
  }

  private async stampActor(actor: string): Promise<void> {
    await this.settingsService.upsert(KEY_UPDATED_AT, new Date().toISOString(), { name: 'Cierre: última modificación' });
    await this.settingsService.upsert(KEY_UPDATED_BY, actor || '', { name: 'Cierre: modificado por' });
  }

  async enable(input: { allowedSectionsByRole: Record<string, string[]>; message?: string }, actor: string): Promise<void> {
    await this.persistLists(input.allowedSectionsByRole || {});
    await this.settingsService.upsert(KEY_MESSAGE, input.message || '', { name: 'Cierre: mensaje' });
    await this.settingsService.upsert(KEY_ENABLED, true, { name: 'Cierre de curso activo' });
    await this.stampActor(actor);
  }

  async updateConfig(input: { allowedSectionsByRole?: Record<string, string[]>; message?: string }, actor: string): Promise<void> {
    if (input.allowedSectionsByRole) {
      await this.persistLists(input.allowedSectionsByRole);
    }
    if (typeof input.message === 'string') {
      await this.settingsService.upsert(KEY_MESSAGE, input.message, { name: 'Cierre: mensaje' });
    }
    await this.stampActor(actor);
  }

  async disable(actor: string): Promise<void> {
    await this.settingsService.upsert(KEY_ENABLED, false, { name: 'Cierre de curso activo' });
    await this.stampActor(actor);
  }
}
