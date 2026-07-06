import { useCallback, useRef, useState } from 'react';

export type DraftStatus = 'idle' | 'saving' | 'saved';

/**
 * Autoguardado de borradores en localStorage para modales de escritura.
 *
 * Guarda automáticamente (con debounce) lo que el usuario escribe, de forma
 * que si cierra el modal sin querer, navega a otra página o recarga,
 * el contenido se recupera al volver a abrir el modal.
 *
 * Uso:
 *   const { saveDraft, loadDraft, clearDraft, hasDraft } = useDraftAutosave('compose-message');
 *   <Form onValuesChange={(_, all) => saveDraft(all)} ...>
 */

const STORAGE_PREFIX = 'mw-autosave-draft:';

interface StoredDraft {
  savedAt: string;
  values: Record<string, any>;
}

// Los borradores caducan a los 7 días para no acumular basura
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useDraftAutosave(key: string, debounceMs = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Estado visible para mostrar "Guardando…/Borrador guardado" (estilo Gmail)
  const [status, setStatus] = useState<DraftStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveDraft = useCallback(
    (values: Record<string, any>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Señal inmediata de actividad: "Guardando…"
      setStatus('saving');
      timerRef.current = setTimeout(() => {
        try {
          // No guardar objetos no serializables (ficheros, etc.)
          const serializable: Record<string, any> = {};
          Object.entries(values || {}).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            const t = typeof v;
            if (t === 'string' || t === 'number' || t === 'boolean' || Array.isArray(v)) {
              serializable[k] = v;
            }
          });
          const hasContent = Object.values(serializable).some(
            (v) => (typeof v === 'string' && v.trim() !== '') || (Array.isArray(v) && v.length > 0),
          );
          if (!hasContent) {
            localStorage.removeItem(storageKey);
            setStatus('idle');
            setLastSavedAt(null);
            return;
          }
          const now = new Date();
          const payload: StoredDraft = {
            savedAt: now.toISOString(),
            values: serializable,
          };
          localStorage.setItem(storageKey, JSON.stringify(payload));
          setStatus('saved');
          setLastSavedAt(now);
        } catch {
          // localStorage lleno o no disponible: silencioso, no es crítico
          setStatus('idle');
        }
      }, debounceMs);
    },
    [storageKey, debounceMs],
  );

  const loadDraft = useCallback((): Record<string, any> | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: StoredDraft = JSON.parse(raw);
      if (!parsed?.values) return null;
      if (parsed.savedAt && Date.now() - new Date(parsed.savedAt).getTime() > DRAFT_TTL_MS) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return parsed.values;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignorar
    }
    setStatus('idle');
    setLastSavedAt(null);
  }, [storageKey]);

  const hasDraft = useCallback((): boolean => loadDraft() !== null, [loadDraft]);

  return { saveDraft, loadDraft, clearDraft, hasDraft, status, lastSavedAt };
}

export default useDraftAutosave;
