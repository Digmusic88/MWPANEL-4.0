import React from 'react';
import { Segmented, InputNumber } from 'antd';
import { ScaleType, AchievementLevel } from '@/types/criterionAssessment';

const LEVELS: { label: string; value: AchievementLevel }[] = [
  { label: 'E', value: 'EMERGING' },
  { label: 'D', value: 'DEVELOPING' },
  { label: 'A', value: 'ACHIEVING' },
  { label: 'X', value: 'EXCEEDING' },
];

const LEVELS3: { label: string; value: AchievementLevel }[] = [
  { label: 'No completado', value: 'NOT_ACHIEVED' },
  { label: 'En proceso', value: 'IN_PROGRESS' },
  { label: 'Alcanzado', value: 'ACHIEVED' },
];

interface Props {
  scaleType: ScaleType;
  numericMax: number;
  value: { levelValue?: AchievementLevel; numericValue?: number };
  onChange: (v: { levelValue?: AchievementLevel; numericValue?: number }) => void;
  source?: 'manual' | 'derived';
}

export const AssessmentCell: React.FC<Props> = ({ scaleType, numericMax, value, onChange, source }) => {
  const levelOptions = scaleType === 'levels3' ? LEVELS3 : LEVELS;
  const control = scaleType === 'numeric' ? (
    <InputNumber
      size="small"
      min={0}
      max={numericMax}
      value={value.numericValue}
      onChange={(n) => onChange({ numericValue: typeof n === 'number' ? n : undefined })}
    />
  ) : (
    <Segmented
      size="small"
      options={levelOptions.map((l) => ({ label: l.label, value: l.value }))}
      value={value.levelValue}
      onChange={(v) => onChange({ levelValue: v as AchievementLevel })}
    />
  );

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      {control}
      {source === 'derived' && (
        <span
          title="Derivado automáticamente de las notas"
          style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: 3, background: '#1677ff' }}
        />
      )}
    </span>
  );
};
