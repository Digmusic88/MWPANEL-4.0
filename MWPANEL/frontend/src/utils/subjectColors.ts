// Sistema de colores consistente para asignaturas
export interface SubjectColor {
  background: string;
  border: string;
  text: string;
}

export const SUBJECT_COLORS: Record<string, SubjectColor> = {
  // Colores específicos solicitados
  'matematicas': {
    background: '#e3f2fd', // Azul claro
    border: '#1976d2',     // Azul
    text: '#0d47a1'        // Azul oscuro
  },
  'ciencias-sociales': {
    background: '#fff3e0', // Naranja claro
    border: '#f57c00',     // Naranja
    text: '#e65100'        // Naranja oscuro
  },
  'ciencias-naturales': {
    background: '#e8f5e8', // Verde claro
    border: '#388e3c',     // Verde
    text: '#1b5e20'        // Verde oscuro
  },
  'lengua': {
    background: '#ffebee', // Rojo claro
    border: '#d32f2f',     // Rojo
    text: '#b71c1c'        // Rojo oscuro
  },
  
  // Colores adicionales coherentes
  'ingles': {
    background: '#f3e5f5', // Púrpura claro
    border: '#7b1fa2',     // Púrpura
    text: '#4a148c'        // Púrpura oscuro
  },
  'educacion-fisica': {
    background: '#e0f2f1', // Verde agua claro
    border: '#00695c',     // Verde agua
    text: '#004d40'        // Verde agua oscuro
  },
  'educacion-artistica': {
    background: '#fce4ec', // Rosa claro
    border: '#c2185b',     // Rosa
    text: '#880e4f'        // Rosa oscuro
  },
  'musica': {
    background: '#fff8e1', // Amarillo claro
    border: '#ffa000',     // Amarillo/Naranja
    text: '#ff6f00'        // Amarillo/Naranja oscuro
  },
  'religion': {
    background: '#f1f8e9', // Verde lima claro
    border: '#689f38',     // Verde lima
    text: '#33691e'        // Verde lima oscuro
  },
  'valores': {
    background: '#f1f8e9', // Verde lima claro (igual que religión)
    border: '#689f38',     // Verde lima
    text: '#33691e'        // Verde lima oscuro
  },
  
  // Color por defecto para asignaturas no clasificadas
  'default': {
    background: '#f5f5f5', // Gris claro
    border: '#757575',     // Gris
    text: '#424242'        // Gris oscuro
  }
};

/**
 * Obtiene el color para una asignatura basado en su nombre
 * Normaliza el nombre y busca coincidencias por palabras clave
 */
export const getSubjectColor = (subjectName: string): SubjectColor => {
  if (!subjectName) return SUBJECT_COLORS.default;
  
  const normalized = subjectName.toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z\s]/g, '')
    .trim();

  // Matemáticas
  if (normalized.includes('matematica') || normalized.includes('mate')) {
    return SUBJECT_COLORS['matematicas'];
  }
  
  // Ciencias Sociales
  if (normalized.includes('ciencias sociales') || 
      normalized.includes('sociales') || 
      normalized.includes('historia') || 
      normalized.includes('geografia')) {
    return SUBJECT_COLORS['ciencias-sociales'];
  }
  
  // Ciencias Naturales
  if (normalized.includes('ciencias de la naturaleza') || 
      normalized.includes('ciencias naturales') || 
      normalized.includes('biologia') || 
      normalized.includes('conocimiento del medio') ||
      normalized.includes('descubrimiento') ||
      normalized.includes('exploracion del entorno') ||
      normalized.includes('entorno')) {
    return SUBJECT_COLORS['ciencias-naturales'];
  }
  
  // Lengua
  if (normalized.includes('lengua') || 
      normalized.includes('castellana') || 
      normalized.includes('literatura')) {
    return SUBJECT_COLORS['lengua'];
  }
  
  // Inglés
  if (normalized.includes('ingles') || 
      normalized.includes('english') || 
      normalized.includes('primera lengua extranjera')) {
    return SUBJECT_COLORS['ingles'];
  }
  
  // Educación Física
  if (normalized.includes('educacion fisica') || 
      normalized.includes('deportes') || 
      normalized.includes('gimnasia')) {
    return SUBJECT_COLORS['educacion-fisica'];
  }
  
  // Educación Artística
  if (normalized.includes('educacion artistica') || 
      normalized.includes('arte') || 
      normalized.includes('plastica') || 
      normalized.includes('dibujo')) {
    return SUBJECT_COLORS['educacion-artistica'];
  }
  
  // Música
  if (normalized.includes('musica')) {
    return SUBJECT_COLORS['musica'];
  }
  
  // Religión/Valores
  if (normalized.includes('religion') || normalized.includes('valores')) {
    return normalized.includes('religion') ? 
      SUBJECT_COLORS['religion'] : 
      SUBJECT_COLORS['valores'];
  }
  
  return SUBJECT_COLORS.default;
};

/**
 * Genera estilos CSS para una asignatura
 */
export const getSubjectStyles = (subjectName: string) => {
  const colors = getSubjectColor(subjectName);
  return {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: '2px',
    borderStyle: 'solid',
    color: colors.text,
    borderRadius: '6px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: '500',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      transform: 'translateY(-1px)'
    }
  };
};