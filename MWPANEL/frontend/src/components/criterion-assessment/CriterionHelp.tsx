import React from 'react';
import { Collapse, Tag, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const STATES = [
  {
    label: 'No completado',
    description: 'Todavía no muestra el aprendizaje del criterio; necesita apoyo.',
    color: 'red' as const,
  },
  {
    label: 'En proceso',
    description: 'Progresa hacia el criterio; logros parciales o irregulares.',
    color: 'blue' as const,
  },
  {
    label: 'Alcanzado',
    description: 'Logra el criterio de forma satisfactoria y autónoma.',
    color: 'green' as const,
  },
];

const MODES = [
  {
    label: 'Paralelo',
    description:
      'Por defecto. Las marcas NO cambian la nota numérica: conviven con exámenes, tareas y actividades como una capa de información.',
    color: 'default' as const,
  },
  {
    label: 'Derivar',
    description:
      'Las marcas cuentan en la nota del trimestre con el peso «Criterios» que fijes en la modal de Pesos del Cuaderno.',
    color: 'blue' as const,
  },
  {
    label: 'Sustituir',
    description:
      'La nota del trimestre pasa a ser la valoración de los criterios (ignora exámenes, tareas y actividades).',
    color: 'gold' as const,
  },
];

const helpContent = (
  <div style={{ lineHeight: 1.7 }}>
    <Paragraph>
      <Text strong>¿Qué es?</Text>
      <br />
      Aquí evalúas a cada alumno frente a los{' '}
      <Text italic>criterios de evaluación</Text> oficiales (LOMLOE) de la
      asignatura. Los criterios describen lo que el alumno debe ser capaz de
      saber y de hacer; son el referente para valorar en qué grado va
      adquiriendo cada competencia específica.
    </Paragraph>

    <Paragraph>
      <Text strong>¿Cómo se usa?</Text>
      <ol style={{ marginTop: 4, paddingLeft: 20 }}>
        <li>Elige la asignatura/grupo y el trimestre.</li>
        <li>
          Elige la <Text strong>escala</Text> (arriba): «3 estados» o
          «Numérico» (0–10).
        </li>
        <li>
          En la rejilla, marca cada criterio para cada alumno. Algunas casillas
          pueden aparecer ya rellenas y con la etiqueta{' '}
          <Text italic>«derivada»</Text>: provienen de trabajos calificados
          atados a ese criterio; puedes sobrescribirlas a mano.
        </li>
        <li>
          Si quieres que estas marcas influyan en la nota del trimestre, elige
          el <Text strong>modo</Text> (Paralelo / Derivar / Sustituir).
        </li>
        <li>
          Pulsa <Text strong>Guardar</Text>. La valoración por competencias
          clave (radar) se calcula automáticamente.
        </li>
      </ol>
    </Paragraph>

    <Text strong>Escala «3 estados»:</Text>
    <div style={{ marginTop: 8, marginBottom: 12 }}>
      {STATES.map((s) => (
        <div
          key={s.label}
          style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}
        >
          <Tag color={s.color} style={{ minWidth: 104, textAlign: 'center', fontWeight: 600 }}>
            {s.label}
          </Tag>
          <span>{s.description}</span>
        </div>
      ))}
      <Paragraph style={{ marginTop: 4, marginBottom: 0 }} type="secondary">
        Como alternativa puedes usar la escala <Text strong>Numérica</Text>{' '}
        (0–10) desde el selector «Escala».
      </Paragraph>
    </div>

    <Text strong>Modo de nota del trimestre:</Text>
    <div style={{ marginTop: 8 }}>
      {MODES.map((m) => (
        <div
          key={m.label}
          style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}
        >
          <Tag color={m.color} style={{ minWidth: 84, textAlign: 'center', fontWeight: 600 }}>
            {m.label}
          </Tag>
          <span>{m.description}</span>
        </div>
      ))}
      <Paragraph style={{ marginTop: 4, marginBottom: 0 }} type="secondary">
        El modo se fija por asignatura y trimestre. El efecto sobre la nota se
        aplica al recalcular ese trimestre en el <Text strong>Cuaderno</Text>.
      </Paragraph>
    </div>

    <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
      <Text strong>¿Para qué sirve?</Text>
      <br />
      El conjunto de marcas alimenta la{' '}
      <Text italic>valoración competencial</Text> del alumno, puede contar en la
      nota del trimestre (según el modo) y se vuelca al boletín y al expediente
      académico.
    </Paragraph>
  </div>
);

export const CriterionHelp: React.FC = () => (
  <Collapse
    defaultActiveKey={['help']}
    style={{ marginBottom: 16 }}
    items={[
      {
        key: 'help',
        label: (
          <span>
            <QuestionCircleOutlined style={{ marginRight: 6 }} />
            ¿Qué es esta página y cómo se usa?
          </span>
        ),
        children: helpContent,
      },
    ]}
  />
);
