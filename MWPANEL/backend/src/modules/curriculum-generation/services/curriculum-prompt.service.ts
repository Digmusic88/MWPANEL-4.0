import { Injectable } from '@nestjs/common';

const KEY_COMPETENCIES = ['CCL', 'CP', 'STEM', 'CD', 'CPSAA', 'CC', 'CE', 'CCEC'];

@Injectable()
export class CurriculumPromptService {
  build(subjectName: string, scopeLabel: string, decreeText: string): { system: string; user: string } {
    const system = 'Eres un experto en el currículo LOMLOE de la Comunidad Foral de Navarra. Extraes y estructuras el currículo oficial. Devuelves SOLO JSON válido conforme al schema pedido, respetando los códigos y la redacción del decreto.';
    const schema = `{"specificCompetencies":[{"code":"CE.<AREA>.N","name":"...","description":"...","keyCompetencyCodes":["STEM"],"criteria":[{"code":"N.M","description":"..."}]}],"basicKnowledge":[{"code":"A.1","block":"A. ...","title":"...","description":"...","knowledgeType":"KNOWLEDGE"}]}`;
    const user =
      `DECRETO (texto oficial):\n${decreeText}\n\n` +
      `TAREA: para el área "${subjectName}" y el ámbito "${scopeLabel}", extrae del decreto y devuelve SOLO un JSON con este schema EXACTO:\n${schema}\n\n` +
      `Reglas: (1) usa los códigos y la redacción del decreto; (2) keyCompetencyCodes SOLO de esta lista: ${KEY_COMPETENCIES.join(', ')}; (3) incluye los criterios de evaluación de cada competencia específica y los saberes básicos del área para ese ciclo/curso; (4) knowledgeType uno de KNOWLEDGE|SKILL|ATTITUDE; (5) si el área no aparece en el decreto, devuelve {"specificCompetencies":[],"basicKnowledge":[]}.`;
    return { system, user };
  }
}
