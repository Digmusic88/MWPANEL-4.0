import React from 'react';
import { Collapse, Tag, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface GradingPageHelpProps {
  title: string;
  whatIs: React.ReactNode;
  steps: string[];
  purpose: React.ReactNode;
  levels?: { label: string; color: string; meaning: string }[];
}

export const GradingPageHelp: React.FC<GradingPageHelpProps> = ({
  title, whatIs, steps, purpose, levels,
}) => {
  const helpContent = (
    <div style={{ lineHeight: 1.7 }}>
      <Paragraph>
        <Text strong>Qué es</Text>
        <br />
        {whatIs}
      </Paragraph>
      <Paragraph>
        <Text strong>Cómo se usa</Text>
        <ol style={{ marginTop: 4, paddingLeft: 20 }}>
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </Paragraph>
      <Paragraph>
        <Text strong>Para qué sirve</Text>
        <br />
        {purpose}
      </Paragraph>
      {levels && levels.length > 0 && (
        <>
          <Text strong>Niveles:</Text>
          <div style={{ marginTop: 8 }}>
            {levels.map((lvl) => (
              <div
                key={lvl.label}
                style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}
              >
                <Tag color={lvl.color} style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                  {lvl.label}
                </Tag>
                <span>{lvl.meaning}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <Collapse
      defaultActiveKey={['help']}
      style={{ marginBottom: 16 }}
      items={[
        {
          key: 'help',
          label: (
            <span>
              <QuestionCircleOutlined style={{ marginRight: 6 }} />
              {title}
            </span>
          ),
          children: helpContent,
        },
      ]}
    />
  );
};
