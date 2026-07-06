import apiClient from './apiClient';

export interface AIResponseOptions {
  tone?: 'formal' | 'empático' | 'informativo' | 'neutro';
  messageContext?: string[];
  senderRole?: string;
  recipientRole?: string;
  relatedStudent?: string;
}

export interface AIResponse {
  content: string;
  suggestions?: string[];
  confidence?: number;
}

interface AIComposeOptions {
  recipientId?: string;
  recipientName?: string;
  relatedStudent?: string;
  messageType?: 'announcement' | 'direct' | 'concern' | 'question' | 'request';
  tone?: 'formal' | 'empático' | 'informativo' | 'neutro';
}

class AIAssistantService {
  async generateResponse(
    messageContent: string,
    options: AIResponseOptions = {}
  ): Promise<AIResponse> {
    try {
      const response = await apiClient.post('/communications/ai/generate-response', {
        messageContent,
        options,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('No se pudo generar una respuesta automática');
    }
  }

  async composeMessage(
    intention: string,
    options: AIComposeOptions = {}
  ): Promise<AIResponse> {
    try {
      const response = await apiClient.post('/communications/ai/compose-message', {
        intention,
        ...options,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error composing AI message:', error);
      throw new Error('No se pudo componer el mensaje automático');
    }
  }

  async isAIEnabled(): Promise<boolean> {
    try {
      const response = await apiClient.get('/communications/ai/status');
      return response.data.enabled;
    } catch (error) {
      console.error('Error checking AI status:', error);
      return false;
    }
  }

  async validateUserPermissions(): Promise<boolean> {
    try {
      const response = await apiClient.get('/communications/ai/permissions');
      return response.data.canUseAI;
    } catch (error) {
      console.error('Error checking AI permissions:', error);
      return false;
    }
  }

  // Simular escritura estilo Gemini con efectos avanzados
  async simulateTyping(
    content: string,
    onUpdate: (text: string, isComplete: boolean) => void,
    speed: number = 50
  ): Promise<void> {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const characters = content.split('');
      const cursorChar = '▊'; // Cursor parpadeante tipo Gemini
      
      const typeNextChar = () => {
        if (currentIndex < characters.length) {
          const currentText = characters.slice(0, currentIndex + 1).join('');
          
          // Mostrar texto con cursor parpadeante
          onUpdate(currentText + cursorChar, false);
          currentIndex++;
          
          // Velocidad variable con pausas en puntuación
          let delay = speed;
          const currentChar = characters[currentIndex - 1];
          
          if (currentChar === '.' || currentChar === '!' || currentChar === '?') {
            delay = speed * 3; // Pausa larga después de puntos
          } else if (currentChar === ',' || currentChar === ';') {
            delay = speed * 2; // Pausa media después de comas
          } else if (currentChar === ' ') {
            delay = speed * 0.5; // Espacio más rápido
          } else {
            delay = speed + Math.random() * 20; // Variación natural
          }
          
          setTimeout(typeNextChar, delay);
        } else {
          // Animación final del cursor y texto completo
          let cursorVisible = true;
          let blinkCount = 0;
          const maxBlinks = 6;
          
          const blinkCursor = () => {
            if (blinkCount < maxBlinks) {
              const finalText = cursorVisible ? content + cursorChar : content;
              onUpdate(finalText, false);
              cursorVisible = !cursorVisible;
              blinkCount++;
              setTimeout(blinkCursor, 300);
            } else {
              // Texto final sin cursor
              onUpdate(content, true);
              resolve();
            }
          };
          
          blinkCursor();
        }
      };
      
      // Iniciar con cursor parpadeante
      onUpdate(cursorChar, false);
      setTimeout(typeNextChar, 200);
    });
  }

  // Nueva función para animación de escritura con chunks de palabras (alternativa)
  async simulateTypingByWords(
    content: string,
    onUpdate: (text: string, isComplete: boolean) => void,
    speed: number = 80
  ): Promise<void> {
    return new Promise((resolve) => {
      let currentIndex = 0;
      const words = content.split(' ');
      const cursorChar = '▊';
      
      const typeNextWord = () => {
        if (currentIndex < words.length) {
          const currentText = words.slice(0, currentIndex + 1).join(' ');
          onUpdate(currentText + cursorChar, false);
          currentIndex++;
          
          // Velocidad adaptativa según la longitud de la palabra
          const wordLength = words[currentIndex - 1]?.length || 0;
          const delay = speed + (wordLength * 10) + Math.random() * 30;
          
          setTimeout(typeNextWord, delay);
        } else {
          // Efecto final con cursor parpadeante
          let cursorVisible = true;
          let blinkCount = 0;
          
          const blinkCursor = () => {
            if (blinkCount < 4) {
              const finalText = cursorVisible ? content + cursorChar : content;
              onUpdate(finalText, false);
              cursorVisible = !cursorVisible;
              blinkCount++;
              setTimeout(blinkCursor, 250);
            } else {
              onUpdate(content, true);
              resolve();
            }
          };
          
          blinkCursor();
        }
      };
      
      typeNextWord();
    });
  }

  // Plantillas rápidas predefinidas
  getQuickTemplates(userRole: string): { [key: string]: string } {
    const baseTemplates = {
      'Gracias': 'Gracias por su mensaje. Lo he recibido correctamente.',
      'Revisión': 'Gracias por la información. Lo revisaré con calma y le responderé pronto.',
      'Confirmación': 'Confirmado. Procederemos según lo acordado.',
      'Disculpas': 'Disculpe las molestias. Trabajaremos para resolver esta situación.',
    };

    if (userRole === 'teacher') {
      return {
        ...baseTemplates,
        'Reunión padre': 'Gracias por su consulta. Me gustaría programar una reunión para conversar sobre {estudiante} con más detalle.',
        'Progreso estudiante': 'El progreso de {estudiante} ha sido satisfactorio. Le mantendré informado de cualquier novedad.',
        'Tarea pendiente': 'He notado que {estudiante} tiene algunas tareas pendientes. Sería conveniente reforzar el estudio en casa.',
        'Comportamiento': 'Quería comentarle sobre el comportamiento de {estudiante} en clase. Me gustaría conversar con usted.',
      };
    }

    if (userRole === 'admin') {
      return {
        ...baseTemplates,
        'Comunicado': 'Estimadas familias, les informamos sobre los siguientes cambios y actualizaciones.',
        'Evento': 'Les recordamos el próximo evento escolar. Por favor, confirmen su asistencia.',
        'Normativa': 'Queremos recordarles las siguientes normas y procedimientos del centro.',
        'Horario': 'Les comunicamos los cambios en el horario escolar que entrarán en vigor próximamente.',
      };
    }

    return baseTemplates;
  }
}

export default new AIAssistantService();
export type { AIComposeOptions };