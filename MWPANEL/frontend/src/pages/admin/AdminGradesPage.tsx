import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Table,
  Tag,
  Progress,
  Statistic,
  Button,
  Space,
  Empty,
  Spin,
  Alert,
  Segmented,
  Input,
  Tooltip,
  Badge,
  Avatar,
  List,
  Descriptions,
  Tabs,
} from 'antd';
import {
  BarChartOutlined,
  DownloadOutlined,
  FilterOutlined,
  SearchOutlined,
  TeamOutlined,
  BookOutlined,
  TrophyOutlined,
  DashboardOutlined,
  BankOutlined,
  UserOutlined,
  RiseOutlined,
  FallOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  SettingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useGrades from '../../hooks/useGrades';
import useEducationalLevels from '../../hooks/useEducationalLevels';
import useCourses from '../../hooks/useCourses';
import useClassGroups from '../../hooks/useClassGroups';
import { useResponsive } from '../../hooks/useResponsive';
import { Column, Line } from '@ant-design/plots'; // Removed Pie to fix shape errors
import UnifiedGradingManager from '../../components/grades/UnifiedGradingManager';
import UnifiedGradesViewer from '../../components/grades/UnifiedGradesViewer';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TabPane } = Tabs;

interface SchoolOverview {
  overview: Array<{
    classGroup: {
      id: string;
      name: string;
      level?: string;
      course?: string;
    };
    studentCount: number;
    classAverage: number;
    passingRate: number;
  }>;
  totals: {
    totalClasses: number;
    totalStudents: number;
    schoolAverage: number;
  };
}

const AdminGradesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('traditional');
  const [viewMode, setViewMode] = useState<'overview' | 'levels' | 'classes'>('overview');
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<string | undefined>();
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [schoolOverview, setSchoolOverview] = useState<SchoolOverview | null>(null);
  const [searchText, setSearchText] = useState('');

  const { getSchoolGradesOverview, loading } = useGrades();
  const { educationalLevels } = useEducationalLevels();
  const { courses } = useCourses();
  const { classGroups } = useClassGroups();
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    fetchSchoolOverview();
  }, [selectedLevelId, selectedCourseId, selectedClassId]);

  const fetchSchoolOverview = async () => {
    const overview = await getSchoolGradesOverview({
      levelId: selectedLevelId,
      courseId: selectedCourseId,
      classGroupId: selectedClassId,
    });
    if (overview) {
      setSchoolOverview(overview);
    }
  };

  const getGradeColor = (grade: number): string => {
    if (grade >= 90) return '#52c41a';
    if (grade >= 70) return '#1890ff';
    if (grade >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const getGradeLabel = (grade: number): string => {
    if (grade >= 90) return 'Excelente';
    if (grade >= 70) return 'Notable';
    if (grade >= 50) return 'Aprobado';
    return 'Suspenso';
  };

  const exportData = (format: 'excel' | 'pdf') => {
    // In real implementation, this would generate the file
    const message = format === 'excel' 
      ? 'Exportando a Excel...' 
      : 'Generando informe PDF...';
    console.log(message);
  };

  // Prepare data for charts
  const preparePieData = () => {
    if (!schoolOverview || !schoolOverview.overview || schoolOverview.overview.length === 0) return [];
    
    const distribution = {
      'Excelente': 0,
      'Notable': 0,
      'Aprobado': 0,
      'Suspenso': 0,
    };

    schoolOverview.overview
      .filter(classData => classData && typeof classData.classAverage === 'number')
      .forEach(classData => {
        const avg = classData.classAverage;
        if (isNaN(avg)) return;
        
        if (avg >= 90) distribution['Excelente']++;
        else if (avg >= 70) distribution['Notable']++;
        else if (avg >= 50) distribution['Aprobado']++;
        else distribution['Suspenso']++;
      });

    const total = schoolOverview.overview.length;
    return Object.entries(distribution)
      .filter(([, value]) => value > 0)
      .map(([type, value]) => ({
        type,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      }));
  };

  const prepareBarData = () => {
    if (!schoolOverview || !schoolOverview.overview || schoolOverview.overview.length === 0) return [];
    
    return schoolOverview.overview
      .filter(classData => 
        classData && 
        classData.classGroup && 
        classData.classGroup.name &&
        typeof classData.classAverage === 'number' &&
        !isNaN(classData.classAverage)
      )
      .sort((a, b) => (b.classAverage || 0) - (a.classAverage || 0))
      .slice(0, 10)
      .map(classData => ({
        class: classData.classGroup.name,
        average: Number(classData.classAverage) || 0,
        students: classData.studentCount || 0,
      }));
  };

  const prepareTrendData = () => {
    // This would normally use historical data
    const months = ['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];
    const baseAverage = schoolOverview?.totals?.schoolAverage || 0;
    
    return months.map((month, index) => {
      const variation = (Math.random() - 0.5) * 0.5; // Smaller variation
      const average = Math.max(0, Math.min(10, baseAverage + variation));
      
      return {
        month,
        average: Number(average.toFixed(2)),
      };
    });
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Clase',
      dataIndex: ['classGroup', 'name'],
      key: 'className',
      fixed: 'left',
      width: 150,
      render: (text: string, record) => (
        <Space>
          <TeamOutlined />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.classGroup.level} - {record.classGroup.course}
            </Text>
          </div>
        </Space>
      ),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => {
        const searchValue = value as string;
        return record.classGroup.name.toLowerCase().includes(searchValue.toLowerCase()) ||
               record.classGroup.level?.toLowerCase().includes(searchValue.toLowerCase()) ||
               record.classGroup.course?.toLowerCase().includes(searchValue.toLowerCase());
      },
    },
    {
      title: 'Estudiantes',
      dataIndex: 'studentCount',
      key: 'studentCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: '#1890ff' }} />
      ),
      sorter: (a, b) => a.studentCount - b.studentCount,
    },
    {
      title: 'Promedio',
      dataIndex: 'classAverage',
      key: 'classAverage',
      width: 120,
      align: 'center',
      render: (avg: number) => (
        <Space>
          <Progress
            type="circle"
            percent={avg}
            width={50}
            status={avg >= 50 ? 'normal' : 'exception'}
            format={() => avg.toFixed(1)}
          />
          <Tag color={getGradeColor(avg)}>
            {getGradeLabel(avg)}
          </Tag>
        </Space>
      ),
      sorter: (a, b) => a.classAverage - b.classAverage,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Tasa Aprobación',
      dataIndex: 'passingRate',
      key: 'passingRate',
      width: 120,
      align: 'center',
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 70 ? 'success' : rate >= 50 ? 'normal' : 'exception'}
          format={(percent) => `${percent}%`}
        />
      ),
      sorter: (a, b) => a.passingRate - b.passingRate,
    },
    {
      title: 'Tendencia',
      key: 'trend',
      width: 100,
      align: 'center',
      render: () => {
        const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
        return trend === 'up' ? (
          <RiseOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
        ) : trend === 'down' ? (
          <FallOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
        ) : (
          <Text type="secondary">--</Text>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              onClick={() => {
                setSelectedClassId(record.classGroup.id);
                setViewMode('classes');
              }}
            />
          </Tooltip>
          <Tooltip title="Exportar">
            <Button type="text" icon={<ExportOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading && !schoolOverview) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large">
          <div className="text-center p-4">Cargando datos de calificaciones...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <DashboardOutlined style={{ marginRight: 8 }} />
            Panel de Calificaciones
          </Title>
          <Text type="secondary">
            Sistema completo de gestión de calificaciones
          </Text>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => exportData('excel')}
            >
              Excel
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => exportData('pdf')}
            >
              Informe PDF
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Tabs System */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        size="large"
        style={{ marginBottom: 24 }}
      >
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              Sistema Tradicional
            </span>
          } 
          key="traditional"
        >
          {/* Contenido del sistema tradicional */}

      {/* View Mode Selector */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={8}>
            <Segmented
              options={[
                { label: 'Vista General', value: 'overview', icon: <DashboardOutlined /> },
                { label: 'Por Niveles', value: 'levels', icon: <BankOutlined /> },
                { label: 'Por Clases', value: 'classes', icon: <TeamOutlined /> },
              ]}
              value={viewMode}
              onChange={(value) => {
                // Smooth transition with loading state
                setViewTransitioning(true);
                setTimeout(() => {
                  setViewMode(value as 'overview' | 'levels' | 'classes');
                  setViewTransitioning(false);
                }, 150);
              }}
              block
              style={{
                backgroundColor: '#f5f5f5',
                transition: 'all 0.3s ease',
              }}
            />
          </Col>
          <Col xs={24} lg={16}>
            <Space wrap style={{ width: '100%' }}>
              <Select
                style={{ width: 200 }}
                placeholder="Nivel educativo"
                allowClear
                value={selectedLevelId}
                onChange={setSelectedLevelId}
              >
                {educationalLevels.map(level => (
                  <Option key={level.id} value={level.id}>
                    {level.name}
                  </Option>
                ))}
              </Select>
              <Select
                style={{ width: 200 }}
                placeholder="Curso"
                allowClear
                value={selectedCourseId}
                onChange={setSelectedCourseId}
                disabled={!selectedLevelId}
              >
                {courses
                  .filter(course => !selectedLevelId || course.cycle?.educationalLevel?.id === selectedLevelId)
                  .map(course => (
                    <Option key={course.id} value={course.id}>
                      {course.name}
                    </Option>
                  ))}
              </Select>
              <Select
                style={{ width: 200 }}
                placeholder="Clase"
                allowClear
                value={selectedClassId}
                onChange={setSelectedClassId}
                disabled={!selectedLevelId && !selectedCourseId}
              >
                {classGroups
                  .filter(group => {
                    // Filtrar por nivel educativo si está seleccionado
                    if (selectedLevelId) {
                      const hasSelectedLevel = group.courses?.some(course => 
                        course.cycle?.educationalLevel?.id === selectedLevelId
                      );
                      if (!hasSelectedLevel) return false;
                    }
                    
                    // Filtrar por curso si está seleccionado
                    if (selectedCourseId) {
                      const hasSelectedCourse = group.courses?.some(course => 
                        course.id === selectedCourseId
                      );
                      if (!hasSelectedCourse) return false;
                    }
                    
                    return true;
                  })
                  .map(group => (
                    <Option key={group.id} value={group.id}>
                      {group.name}
                    </Option>
                  ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {schoolOverview && (
        <>
          {/* Summary Statistics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Promedio General"
                  value={schoolOverview.totals.schoolAverage}
                  precision={2}
                  prefix={<TrophyOutlined />}
                  suffix="/ 100"
                  valueStyle={{ color: getGradeColor(schoolOverview.totals.schoolAverage) }}
                />
                <Progress
                  percent={schoolOverview.totals.schoolAverage}
                  status={schoolOverview.totals.schoolAverage >= 50 ? 'normal' : 'exception'}
                  showInfo={false}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Clases"
                  value={schoolOverview.totals.totalClasses}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Estudiantes"
                  value={schoolOverview.totals.totalStudents}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>

          {viewTransitioning && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              background: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#666' }}>
                Cambiando vista...
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!viewTransitioning && viewMode === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {/* Charts Row */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} lg={8}>
                  <Card title="Distribución de Rendimiento">
                    {(() => {
                      const pieData = preparePieData();
                      
                      if (pieData.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Empty 
                              description="No hay datos de rendimiento disponibles" 
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                          </div>
                        );
                      }
                      
                      return (
                        <div className="w-full h-64 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-gray-200">
                          <div className="text-center">
                            <div className="text-4xl mb-3">📊</div>
                            <div className="text-gray-700 font-semibold text-lg mb-2">Distribución de Rendimiento</div>
                            <div className="text-gray-600 text-sm space-y-2">
                              {pieData.map((item, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <span className="font-medium">{item.type}:</span>
                                  <span className="text-blue-600">{item.value} clases ({item.percentage}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Top 10 Clases">
                    {(() => {
                      const barData = prepareBarData();
                      
                      if (barData.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Empty 
                              description="No hay datos de clases disponibles" 
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                          </div>
                        );
                      }
                      
                      return (
                        <Column
                          data={barData}
                          xField="class"
                          yField="average"
                          label={{
                            position: 'top',
                            style: {
                              fill: '#000',
                            },
                          }}
                          xAxis={{
                            label: {
                              autoHide: true,
                              autoRotate: false,
                            },
                            grid: null,
                          }}
                          yAxis={{
                            min: 0,
                            max: 10,
                            tickCount: 6,
                            grid: {
                              line: {
                                style: {
                                  stroke: '#f0f0f0',
                                  lineWidth: 1,
                                },
                              },
                            },
                          }}
                          tooltip={{
                            formatter: (datum: any) => {
                              return {
                                name: 'Promedio',
                                value: `${datum.average?.toFixed(1) || '0.0'} / 100`,
                              };
                            },
                          }}
                          meta={{
                            average: {
                              alias: 'Promedio',
                              min: 0,
                              max: 10,
                            },
                          }}
                        />
                      );
                    })()}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card title="Tendencia Temporal">
                    {(() => {
                      const trendData = prepareTrendData();
                      
                      if (trendData.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Empty 
                              description="No hay datos de tendencia disponibles" 
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                          </div>
                        );
                      }
                      
                      return (
                        <Line
                          data={trendData}
                          xField="month"
                          yField="average"
                          smooth
                          point={{
                            size: 5,
                            shape: 'diamond',
                          }}
                          tooltip={{
                            formatter: (datum: any) => {
                              return {
                                name: 'Promedio',
                                value: `${datum.average?.toFixed(1) || '0.0'} / 100`,
                              };
                            },
                          }}
                          xAxis={{
                            grid: null,
                          }}
                          yAxis={{
                            min: 0,
                            max: 10,
                            tickCount: 6,
                            grid: {
                              line: {
                                style: {
                                  stroke: '#f0f0f0',
                                  lineWidth: 1,
                                },
                              },
                            },
                          }}
                        />
                      );
                    })()}
                  </Card>
                </Col>
              </Row>

              {/* Quick Stats */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={24}>
                  <Card title="Estadísticas Rápidas por Nivel">
                    <List
                      grid={{
                        gutter: 16,
                        xs: 1,
                        sm: 2,
                        md: 3,
                        lg: 3,
                        xl: 3,
                        xxl: 3,
                      }}
                      dataSource={educationalLevels}
                      renderItem={level => {
                        const levelClasses = schoolOverview.overview.filter(
                          c => c.classGroup.level === level.name
                        );
                        const levelAvg = levelClasses.length > 0
                          ? levelClasses.reduce((sum, c) => sum + c.classAverage, 0) / levelClasses.length
                          : 0;
                        
                        return (
                          <List.Item>
                            <Card size="small">
                              <Statistic
                                title={level.name}
                                value={levelAvg}
                                precision={2}
                                valueStyle={{
                                  fontSize: '20px',
                                  color: getGradeColor(levelAvg),
                                }}
                                suffix="/ 100"
                              />
                              <Text type="secondary">
                                {levelClasses.length} clases
                              </Text>
                            </Card>
                          </List.Item>
                        );
                      }}
                    />
                  </Card>
                </Col>
                </Row>
              </motion.div>
            )}

            {/* Vista Por Niveles */}
            {!viewTransitioning && viewMode === 'levels' && (
              <motion.div
                key="levels-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Card title="Rendimiento por Nivel Educativo">
                  {educationalLevels.map(level => {
                    const levelClasses = schoolOverview.overview.filter(
                      c => c.classGroup.level === level.name
                    );
                    
                    if (levelClasses.length === 0) return null;

                    const levelAverage = levelClasses.reduce((sum, cls) => sum + cls.classAverage, 0) / levelClasses.length;
                    const totalStudents = levelClasses.reduce((sum, cls) => sum + cls.studentCount, 0);
                    const passingRate = levelClasses.reduce((sum, cls) => sum + cls.passingRate, 0) / levelClasses.length;

                    return (
                      <Card 
                        key={level.id} 
                        size="small" 
                        style={{ marginBottom: 16 }}
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{level.name}</span>
                            <div>
                              <Tag color={getGradeColor(levelAverage)}>
                                Promedio: {levelAverage.toFixed(1)} / 100
                              </Tag>
                              <Tag color="blue">
                                {totalStudents} estudiantes
                              </Tag>
                              <Tag color={passingRate >= 70 ? 'green' : passingRate >= 50 ? 'orange' : 'red'}>
                                {passingRate.toFixed(1)}% aprobación
                              </Tag>
                            </div>
                          </div>
                        }
                      >
                        <Table
                          columns={columns}
                          dataSource={levelClasses.map((item, index) => ({
                            key: `${level.id}-${index}`,
                            ...item,
                          }))}
                          pagination={false}
                          size="small"
                        />
                      </Card>
                    );
                  })}
                </Card>
              </motion.div>
            )}

            {/* Vista Por Clases */}
            {!viewTransitioning && viewMode === 'classes' && (
              <motion.div
                key="classes-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Card
                  title="Calificaciones por Clase"
                  extra={
                    <Search
                      placeholder="Buscar clase..."
                      allowClear
                      style={{ width: 250 }}
                      onSearch={setSearchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={schoolOverview.overview.map((item, index) => ({
                      key: index,
                      ...item,
                    }))}
                    scroll={{ x: 800 }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `Total ${total} clases`,
                    }}
                  />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
        </TabPane>

        <TabPane 
          tab={
            <span>
              <SwapOutlined />
              Sistema Unificado
            </span>
          } 
          key="unified"
        >
          <Tabs defaultActiveKey="viewer" type="card">
            <TabPane 
              tab={
                <span>
                  <TrophyOutlined />
                  Calificaciones Unificadas
                </span>
              } 
              key="viewer"
            >
              <UnifiedGradesViewer />
            </TabPane>
            <TabPane 
              tab={
                <span>
                  <SettingOutlined />
                  Gestión de Escalas
                </span>
              } 
              key="manager"
            >
              <UnifiedGradingManager />
            </TabPane>
          </Tabs>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AdminGradesPage;