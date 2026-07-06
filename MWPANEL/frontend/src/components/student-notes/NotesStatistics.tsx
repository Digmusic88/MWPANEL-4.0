import React from 'react';
import { Card, Row, Col, Statistic, Progress, Skeleton } from 'antd';
import {
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  SettingOutlined,
  HeartOutlined,
  PaperClipOutlined,
  BarChartOutlined,
  FileImageOutlined,
  ShareAltOutlined,
  InboxOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { NotesStatistics as NotesStatsType, NoteType } from '../../types/student-notes';

interface NotesStatisticsProps {
  statistics?: NotesStatsType;
  loading?: boolean;
}

const NotesStatistics: React.FC<NotesStatisticsProps> = ({
  statistics,
  loading = false,
}) => {
  if (loading) {
    return (
      <Row gutter={[16, 16]} className="mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Col key={i} xs={12} md={6}>
            <Card>
              <Skeleton active paragraph={false} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (!statistics) {
    return null;
  }

  const { totalNotes, favoriteNotes, notesWithAttachments, notesByType, sharedStats } = statistics;

  // Calcular porcentajes
  const favoritePercentage = totalNotes > 0 ? (favoriteNotes / totalNotes) * 100 : 0;
  const attachmentPercentage = totalNotes > 0 ? (notesWithAttachments / totalNotes) * 100 : 0;

  // Configuración de tipos de notas
  const noteTypesConfig = [
    {
      type: NoteType.TEXT,
      label: 'Texto',
      icon: <FileTextOutlined />,
      color: '#1890ff',
    },
    {
      type: NoteType.VOICE,
      label: 'Audio',
      icon: <AudioOutlined />,
      color: '#52c41a',
    },
    {
      type: NoteType.DRAWING,
      label: 'Dibujo',
      icon: <PictureOutlined />,
      color: '#fa8c16',
    },
    {
      type: NoteType.PRESENTATION,
      label: 'Presentación',
      icon: <FileImageOutlined />,
      color: '#eb2f96',
    },
    {
      type: NoteType.MIXED,
      label: 'Mixtos',
      icon: <SettingOutlined />,
      color: '#722ed1',
    },
    {
      type: NoteType.MINDMAP,
      label: 'Mind Maps',
      icon: <BranchesOutlined />,
      color: '#9254de',
    },
  ];

  return (
    <>
    <Row gutter={[16, 16]} className="mb-6">
      {/* Total de apuntes */}
      <Col xs={12} md={6}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="text-center">
            <Statistic
              title="Total de Apuntes"
              value={totalNotes}
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </motion.div>
      </Col>

      {/* Apuntes favoritos */}
      <Col xs={12} md={6}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="text-center">
            <Statistic
              title="Favoritos"
              value={favoriteNotes}
              prefix={<HeartOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div className="mt-2">
              <Progress
                percent={Math.round(favoritePercentage)}
                size="small"
                strokeColor="#ff4d4f"
                showInfo={false}
              />
              <div className="text-xs text-gray-500 mt-1">
                {favoritePercentage.toFixed(1)}% del total
              </div>
            </div>
          </Card>
        </motion.div>
      </Col>

      {/* Apuntes con archivos */}
      <Col xs={12} md={6}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="text-center">
            <Statistic
              title="Con Archivos"
              value={notesWithAttachments}
              prefix={<PaperClipOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="mt-2">
              <Progress
                percent={Math.round(attachmentPercentage)}
                size="small"
                strokeColor="#52c41a"
                showInfo={false}
              />
              <div className="text-xs text-gray-500 mt-1">
                {attachmentPercentage.toFixed(1)}% del total
              </div>
            </div>
          </Card>
        </motion.div>
      </Col>

      {/* Distribución por tipos */}
      <Col xs={12} md={6}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-3">
              Tipos de Apuntes
            </div>
            <div className="space-y-2">
              {noteTypesConfig.map((config) => {
                const count = notesByType[config.type] || 0;
                const percentage = totalNotes > 0 ? (count / totalNotes) * 100 : 0;

                return (
                  <div key={config.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span style={{ color: config.color }}>
                        {config.icon}
                      </span>
                      <span>{config.label}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{count}</span>
                      <div className="w-16">
                        <Progress
                          percent={Math.round(percentage)}
                          size="small"
                          strokeColor={config.color}
                          showInfo={false}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </Col>
    </Row>

    {/* Segunda fila: Estadísticas de compartidos */}
    {sharedStats && (
      <Row gutter={[16, 16]} className="mb-6">
        {/* Apuntes enviados */}
        <Col xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="text-center">
              <Statistic
                title="Enviados"
                value={sharedStats.sent}
                prefix={<SendOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </motion.div>
        </Col>

        {/* Apuntes recibidos */}
        <Col xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="text-center">
              <Statistic
                title="Recibidos"
                value={sharedStats.received}
                prefix={<InboxOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </motion.div>
        </Col>

        {/* Compañeros de clase */}
        <Col xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="text-center">
              <Statistic
                title="Compañeros"
                value={sharedStats.classmates}
                prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </motion.div>
        </Col>

        {/* Profesores */}
        <Col xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="text-center">
              <Statistic
                title="Profesores"
                value={sharedStats.teachers}
                prefix={<UserOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>
    )}
    </>
  );
};

export default NotesStatistics;