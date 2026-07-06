import React from 'react';
import { Card, Tooltip, Typography } from 'antd';
import { AcademiaSlot } from '@services/academiaService';

// Vista calendario semanal (portada del diseño de Secretaría que le gusta al usuario).
const { Text } = Typography;
const WEEKDAYS: [number, string][] = [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [7, 'Domingo']];
const HOUR_PX = 46;
const toMin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const pastel = (hex?: string, ratio = 0.86): string | null => {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length < 6) return null;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(isNaN)) return null;
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};
function levelColor(name?: string): string | null {
  const n = (name || '').toLowerCase();
  if (!n) return null;
  if (n.includes('infant')) return '#F48FB1';
  if (n.includes('starter') || n.includes('prestarter') || n.includes('pre starter')) return '#FB8C00';
  if (n.includes('mover')) return '#8E24AA';
  if (n.includes('flyer')) return '#9CCC65';
  if (n.includes('key') || /\bket\b/.test(n)) return '#00897B';
  if (n.includes('pet') || n.includes('prelim')) return '#E53935';
  if (n.includes('fce') || n.includes('first')) return '#2E7D32';
  if (n.includes('cae') || n.includes('advanced')) return '#1E88E5';
  return null;
}
const effGroupColor = (color?: string, name?: string, programName?: string): string | null =>
  color || levelColor(name) || levelColor(programName) || null;

const AcademiaScheduleCalendar: React.FC<{ slots: AcademiaSlot[] }> = ({ slots }) => {
  if (!slots.length) return <Text type="secondary">No hay franjas horarias en tus grupos de tarde.</Text>;

  const dayStart = Math.floor(Math.min(...slots.map(s => toMin(s.startTime))) / 60) * 60;
  const dayEnd = Math.ceil(Math.max(...slots.map(s => toMin(s.endTime))) / 60) * 60;
  const totalH = Math.max(HOUR_PX, ((dayEnd - dayStart) / 60) * HOUR_PX);
  const hours: number[] = []; for (let m = dayStart; m <= dayEnd; m += 60) hours.push(m);
  const used = new Set(slots.map(s => s.weekday));
  const days = WEEKDAYS.filter(([wd]) => wd <= 5 || used.has(wd));

  // Empaquetado en "lanes" para clases solapadas el mismo día
  const layoutDay = (wd: number) => {
    const evs = slots.filter(s => s.weekday === wd).sort((a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(a.endTime) - toMin(b.endTime));
    const laneEnds: number[] = [];
    return evs.map(e => {
      let lane = laneEnds.findIndex(end => end <= toMin(e.startTime));
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = toMin(e.endTime);
      return { e, lane };
    }).map(p => ({ ...p, lanes: laneEnds.length }));
  };

  return (
    <Card bodyStyle={{ padding: 8, overflowX: 'auto' }}>
      <div style={{ display: 'flex', minWidth: 720 }}>
        {/* Gutter de horas */}
        <div style={{ width: 50, flexShrink: 0, position: 'relative', marginTop: 24, height: totalH }}>
          {hours.map(h => (
            <div key={h} style={{ position: 'absolute', top: ((h - dayStart) / 60) * HOUR_PX - 7, right: 6, fontSize: 11, color: '#999' }}>{hhmm(h)}</div>
          ))}
        </div>
        {/* Columnas por día */}
        {days.map(([wd, label]) => {
          const placed = layoutDay(wd);
          return (
            <div key={wd} style={{ flex: 1, minWidth: 110, borderLeft: '3px solid #cfc7bb' }}>
              <div style={{ textAlign: 'center', fontWeight: 600, height: 24, fontSize: 13 }}>{label}</div>
              <div style={{ position: 'relative', height: totalH, background: '#fcfcfc' }}>
                {hours.map(h => (
                  <div key={h} style={{ position: 'absolute', top: ((h - dayStart) / 60) * HOUR_PX, left: 0, right: 0, borderTop: '1px solid #f0f0f0' }} />
                ))}
                {placed.map(({ e, lane, lanes }) => {
                  const top = ((toMin(e.startTime) - dayStart) / 60) * HOUR_PX;
                  const height = Math.max(20, ((toMin(e.endTime) - toMin(e.startTime)) / 60) * HOUR_PX - 2);
                  const w = 100 / lanes;
                  const effColor = effGroupColor(e.color, e.groupName, e.programName);
                  const color = effColor || e.serviceColor || '#579172';
                  return (
                    <Tooltip key={e.id} title={`${e.groupName || e.serviceName || 'Grupo'}${e.serviceName ? ` · ${e.serviceName}` : ''} · ${e.startTime}–${e.endTime}${e.room ? ` · Aula ${e.room}` : ''}`}>
                      <div style={{
                        position: 'absolute', top, height, left: `calc(${lane * w}% + 1px)`, width: `calc(${w}% - 2px)`,
                        background: pastel(effColor, 0.86) || '#fff', borderLeft: `3px solid ${color}`,
                        border: '1px solid #eee', borderLeftWidth: 3, borderRadius: 4,
                        padding: '1px 4px', overflow: 'hidden', fontSize: 11, lineHeight: 1.25,
                      }}>
                        <div style={{ fontWeight: 600 }}>{e.startTime}–{e.endTime}</div>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.groupName || e.serviceName}</div>
                        {e.room && <div style={{ color: '#999' }}>Aula {e.room}</div>}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
export default AcademiaScheduleCalendar;
