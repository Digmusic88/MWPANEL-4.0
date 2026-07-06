import { CurriculumPromptService } from '../curriculum-prompt.service';

describe('CurriculumPromptService', () => {
  it('incluye área, ámbito, las 8 claves y el decreto en el prompt', () => {
    const svc = new CurriculumPromptService();
    const { system, user } = svc.build('Matemáticas', '3º Primaria', 'TEXTO DEL DECRETO XYZ');
    expect(system.toLowerCase()).toContain('lomloe');
    expect(user).toContain('Matemáticas');
    expect(user).toContain('3º Primaria');
    expect(user).toContain('TEXTO DEL DECRETO XYZ');
    for (const k of ['CCL','CP','STEM','CD','CPSAA','CC','CE','CCEC']) expect(user).toContain(k);
    expect(user).toContain('specificCompetencies');
    expect(user).toContain('basicKnowledge');
  });
});
