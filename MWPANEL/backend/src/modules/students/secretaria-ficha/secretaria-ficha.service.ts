import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getFicha } from './secretaria-ficha.client';

export type FichaResult =
  | { kind: 'ok'; ficha: any }
  | { kind: 'none' }
  | { kind: 'error'; message: string };

export function mapFichaResponse(status: number, body: any): FichaResult {
  if (status === 200) return { kind: 'ok', ficha: body };
  if (status === 404) return { kind: 'none' };
  return { kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' };
}

@Injectable()
export class SecretariaFichaService {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  private signServiceToken(): string {
    const sub = this.config.get<string>('SECRETARIA_SERVICE_USER_ID') || process.env.SECRETARIA_SERVICE_USER_ID;
    if (!sub) throw new InternalServerErrorException('Falta SECRETARIA_SERVICE_USER_ID en el servidor');
    const secret = this.config.get<string>('app.jwt.secret');
    return this.jwt.sign({ sub }, { secret, expiresIn: '5m' });
  }

  async fetchFicha(mwStudentId: string): Promise<FichaResult> {
    const token = this.signServiceToken(); // 500 si falta el sub configurado
    let res: { status: number; body: any };
    try {
      res = await getFicha(mwStudentId, token);
    } catch {
      return { kind: 'error', message: 'No se pudo cargar la ficha desde Secretaría' };
    }
    return mapFichaResponse(res.status, res.body);
  }
}
