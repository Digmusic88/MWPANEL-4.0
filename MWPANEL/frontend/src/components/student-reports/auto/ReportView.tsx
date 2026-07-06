import React from 'react';
import { StudentAutoReportResult, AutoReportSectionKey } from '@/types/studentAutoReport';
import { ReportVerdictHeader } from './ReportVerdictHeader';
import { ReportNarrativeSection } from './ReportNarrativeSection';
import { ReportAcademicSection } from './ReportAcademicSection';
import { ReportCompetenciesSection } from './ReportCompetenciesSection';
import { ReportLomloeCriteriaSection } from './ReportLomloeCriteriaSection';
import { ReportSocioEmotionalSection } from './ReportSocioEmotionalSection';
import { ReportAttendanceDuaSection } from './ReportAttendanceDuaSection';
import { ReportQualitativeSection } from './ReportQualitativeSection';

interface Props {
  result: StudentAutoReportResult;
  activeSections: Set<AutoReportSectionKey>;
}

export const ReportView: React.FC<Props> = ({ result, activeSections }) => {
  const on = (k: AutoReportSectionKey) => activeSections.has(k);
  return (
    <div>
      <ReportVerdictHeader result={result} />
      <ReportNarrativeSection narrative={result.narrative} />
      {on('academic') && result.data.academic && <ReportAcademicSection data={result.data.academic} />}
      {on('competencies') && result.data.competencies && <ReportCompetenciesSection data={result.data.competencies} metrics={result.metrics} />}
      {result.data.lomloeProgress && <ReportLomloeCriteriaSection data={result.data.lomloeProgress} />}
      {on('socioEmotional') && result.data.socioEmotional && <ReportSocioEmotionalSection data={result.data.socioEmotional} />}
      {(on('attendance') || on('dua')) && (result.data.attendance || result.data.dua) && <ReportAttendanceDuaSection attendance={result.data.attendance} dua={result.data.dua} />}
      {on('qualitative') && result.data.qualitative && <ReportQualitativeSection data={result.data.qualitative} />}
    </div>
  );
};
