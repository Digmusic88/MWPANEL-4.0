import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Empty,
  Spin,
  message,
  Select,
  DatePicker,
  Table,
  Tag,
  Progress,
  List,
  Avatar,
  Tooltip,
  Badge,
} from 'antd';
import {
  BarChartOutlined,
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  TrophyOutlined,
  CalendarOutlined,
  BookOutlined,
  TeamOutlined,
  GlobalOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';
import { StatCard, NumberCounter } from '@/components/animations';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface BlogAnalyticsData {
  // Engagement Metrics
  totalViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
  
  // Content Metrics
  totalPosts: number;
  publishedThisMonth: number;
  avgPostsPerWeek: number;
  mostViewedPosts: Array<{
    id: string;
    title: string;
    views: number;
    category?: string;
    publishedAt: string;
  }>;
  
  // Community Metrics
  totalComments: number;
  activeCommenters: number;
  avgCommentsPerPost: number;
  moderationMetrics: {
    pending: number;
    approved: number;
    rejected: number;
    avgModerationTime: number;
  };
  
  // Educational Metrics (Specific to educational center)
  audienceDistribution: {
    families: { views: number; comments: number; percentage: number };
    students: { views: number; comments: number; percentage: number };
    staff: { views: number; comments: number; percentage: number };
    public: { views: number; comments: number; percentage: number };
  };
  
  categoriesPerformance: Array<{
    id: string;
    name: string;
    color: string;
    posts: number;
    views: number;
    engagement: number;
    averageRating: number;
  }>;
  
  // Educational Impact Metrics
  communicationEffectiveness: {
    announcementsRead: number;
    familyEngagement: number;
    teacherParticipation: number;
    eventAnnouncements: number;
  };
  
  // Temporal Analysis
  monthlyTrends: Array<{
    month: string;
    posts: number;
    views: number;
    comments: number;
    engagement: number;
  }>;
  
  topAuthors: Array<{
    id: string;
    name: string;
    role: string;
    posts: number;
    totalViews: number;
    avgEngagement: number;
  }>;
}

interface EducationalBlogMetrics {
  // School Communication Effectiveness
  communicationReach: {
    familiesReached: number;
    totalFamilies: number;
    percentage: number;
  };
  
  // Content Categories Educational Impact
  educationalImpact: {
    academicNews: { posts: number; engagement: number };
    events: { posts: number; engagement: number };
    achievements: { posts: number; engagement: number };
    resources: { posts: number; engagement: number };
    policies: { posts: number; engagement: number };
  };
  
  // Multilingual Engagement (if applicable)
  languageEngagement?: {
    spanish: { views: number; comments: number };
    catalan: { views: number; comments: number };
    english: { views: number; comments: number };
  };
  
  // Seasonal Trends (educational calendar specific)
  seasonalTrends: {
    firstTrimester: { posts: number; engagement: number };
    secondTrimester: { posts: number; engagement: number };
    thirdTrimester: { posts: number; engagement: number };
    summer: { posts: number; engagement: number };
  };
}

const BlogAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<BlogAnalyticsData | null>(null);
  const [educationalMetrics, setEducationalMetrics] = useState<EducationalBlogMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedCategories]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Mock analytics data specific to educational blog
      const mockAnalyticsData: BlogAnalyticsData = {
        totalViews: 15420,
        uniqueVisitors: 8350,
        avgTimeOnPage: 245, // seconds
        bounceRate: 35.2, // percentage
        
        totalPosts: 127,
        publishedThisMonth: 18,
        avgPostsPerWeek: 4.2,
        
        mostViewedPosts: [
          {
            id: '1',
            title: 'Nueva normativa de uniformes para el curso 2024-2025',
            views: 1250,
            category: 'Normativas',
            publishedAt: new Date().toISOString(),
          },
          {
            id: '2', 
            title: 'Celebración del Día del Libro - Actividades programadas',
            views: 980,
            category: 'Eventos',
            publishedAt: new Date().toISOString(),
          },
          {
            id: '3',
            title: 'Reunión de padres - Segundo trimestre',
            views: 875,
            category: 'Reuniones',
            publishedAt: new Date().toISOString(),
          },
        ],
        
        totalComments: 342,
        activeCommenters: 156,
        avgCommentsPerPost: 2.7,
        
        moderationMetrics: {
          pending: 12,
          approved: 318,
          rejected: 24,
          avgModerationTime: 4.2, // hours
        },
        
        audienceDistribution: {
          families: { views: 8200, comments: 189, percentage: 53.2 },
          students: { views: 2100, comments: 67, percentage: 13.6 },
          staff: { views: 3800, comments: 78, percentage: 24.6 },
          public: { views: 1320, comments: 8, percentage: 8.6 },
        },
        
        categoriesPerformance: [
          {
            id: 'cat1',
            name: 'Noticias Académicas',
            color: '#579172',
            posts: 35,
            views: 5200,
            engagement: 4.2,
            averageRating: 4.6,
          },
          {
            id: 'cat2',
            name: 'Eventos y Celebraciones',
            color: '#52c41a',
            posts: 28,
            views: 4100,
            engagement: 5.1,
            averageRating: 4.8,
          },
          {
            id: 'cat3',
            name: 'Comunicados Familiares',
            color: '#fa8c16',
            posts: 22,
            views: 3400,
            engagement: 3.8,
            averageRating: 4.3,
          },
        ],
        
        communicationEffectiveness: {
          announcementsRead: 87.3, // percentage
          familyEngagement: 62.1, // percentage
          teacherParticipation: 78.4, // percentage
          eventAnnouncements: 24,
        },
        
        monthlyTrends: [
          { month: 'Enero', posts: 12, views: 1800, comments: 45, engagement: 3.8 },
          { month: 'Febrero', posts: 15, views: 2200, comments: 58, engagement: 4.1 },
          { month: 'Marzo', posts: 18, views: 2700, comments: 72, engagement: 4.5 },
          { month: 'Abril', posts: 14, views: 2100, comments: 51, engagement: 3.9 },
          { month: 'Mayo', posts: 16, views: 2400, comments: 63, engagement: 4.2 },
          { month: 'Junio', posts: 11, views: 1650, comments: 38, engagement: 3.6 },
        ],
        
        topAuthors: [
          {
            id: 'auth1',
            name: 'Dirección Académica',
            role: 'admin',
            posts: 28,
            totalViews: 4200,
            avgEngagement: 4.7,
          },
          {
            id: 'auth2',
            name: 'María García',
            role: 'teacher',
            posts: 22,
            totalViews: 3100,
            avgEngagement: 4.2,
          },
          {
            id: 'auth3',
            name: 'Carlos Ruiz',
            role: 'teacher',
            posts: 18,
            totalViews: 2400,
            avgEngagement: 3.8,
          },
        ],
      };
      
      const mockEducationalMetrics: EducationalBlogMetrics = {
        communicationReach: {
          familiesReached: 156,
          totalFamilies: 180,
          percentage: 86.7,
        },
        
        educationalImpact: {
          academicNews: { posts: 35, engagement: 4.2 },
          events: { posts: 28, engagement: 5.1 },
          achievements: { posts: 19, engagement: 4.8 },
          resources: { posts: 15, engagement: 3.7 },
          policies: { posts: 12, engagement: 3.9 },
        },
        
        seasonalTrends: {
          firstTrimester: { posts: 42, engagement: 4.3 },
          secondTrimester: { posts: 38, engagement: 4.1 },
          thirdTrimester: { posts: 35, engagement: 4.0 },
          summer: { posts: 12, engagement: 3.5 },
        },
      };
      
      setAnalyticsData(mockAnalyticsData);
      setEducationalMetrics(mockEducationalMetrics);
      
    } catch (error) {
      console.error('Error fetching blog analytics:', error);
      message.error('Error al cargar analytics del blog');
    } finally {
      setLoading(false);
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 4.5) return '#52c41a'; // green
    if (engagement >= 3.5) return '#faad14'; // yellow
    return '#ff4d4f'; // red
  };
  
  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'families': return <UserOutlined style={{ color: '#fa8c16' }} />;
      case 'students': return <BookOutlined style={{ color: '#52c41a' }} />;
      case 'staff': return <TeamOutlined style={{ color: '#579172' }} />;
      case 'public': return <GlobalOutlined style={{ color: '#722ed1' }} />;
      default: return <UserOutlined />;
    }
  };

  const getAudienceLabel = (audience: string) => {
    const labels = {
      families: 'Familias',
      students: 'Estudiantes', 
      staff: 'Personal',
      public: 'Público General',
    };
    return labels[audience as keyof typeof labels] || audience;
  };

  const mostViewedColumns = [
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <div>
          <Text strong style={{ fontSize: '13px' }}>{title}</Text>
          {record.category && (
            <div style={{ marginTop: '4px' }}>
              <Tag size="small" color="#579172">{record.category}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vistas',
      dataIndex: 'views',
      key: 'views',
      render: (views: number) => (
        <Space>
          <EyeOutlined style={{ color: '#579172' }} />
          <Text strong>{views.toLocaleString()}</Text>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })}
        </Text>
      ),
    },
  ];

  const authorsColumns = [
    {
      title: 'Autor',
      key: 'author',
      render: (record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{record.name}</div>
            <Tag size="small" color={record.role === 'admin' ? 'red' : 'blue'}>
              {record.role === 'admin' ? 'Administrador' : 'Profesor'}
            </Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Posts',
      dataIndex: 'posts',
      key: 'posts',
      render: (posts: number) => (
        <Badge count={posts} showZero color="#579172" />
      ),
    },
    {
      title: 'Vistas Totales',
      dataIndex: 'totalViews',
      key: 'totalViews',
      render: (views: number) => (
        <Text>{views.toLocaleString()}</Text>
      ),
    },
    {
      title: 'Engagement',
      dataIndex: 'avgEngagement',
      key: 'avgEngagement',
      render: (engagement: number) => (
        <Space>
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getEngagementColor(engagement)
            }}
          />
          <Text>{engagement.toFixed(1)}</Text>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!analyticsData || !educationalMetrics) {
    return (
      <Empty 
        description="No hay datos de analytics disponibles"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      {/* Filters */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>Período:</Text>
          </Col>
          <Col>
            <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
              <Option value="week">Semana</Option>
              <Option value="month">Mes</Option>
              <Option value="quarter">Trimestre</Option>
              <Option value="year">Año</Option>
            </Select>
          </Col>
          <Col>
            <RangePicker size="small" />
          </Col>
        </Row>
      </Card>

      {/* Key Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="Vistas Totales"
            value={<NumberCounter value={analyticsData.totalViews} delay={0.2} />}
            icon={<EyeOutlined />}
            trend="up"
            trendValue="+12% vs mes anterior"
            size="small"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Visitantes Únicos"
            value={<NumberCounter value={analyticsData.uniqueVisitors} delay={0.4} />}
            icon={<UserOutlined />}
            trend="up"
            trendValue="+8% vs mes anterior"
            size="small"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Engagement Rate"
            value={<NumberCounter value={4.2} delay={0.6} decimals={1} suffix="/5" />}
            icon={<StarOutlined />}
            trend="up"
            trendValue="Muy bueno"
            size="small"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="Alcance Familias"
            value={<NumberCounter value={educationalMetrics.communicationReach.percentage} delay={0.8} decimals={1} suffix="%" />}
            icon={<TeamOutlined />}
            trend="up"
            trendValue={`${educationalMetrics.communicationReach.familiesReached}/${educationalMetrics.communicationReach.totalFamilies}`}
            size="small"
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Audience Distribution */}
        <Col xs={24} lg={12}>
          <Card title="Distribución de Audiencia" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(analyticsData.audienceDistribution).map(([audience, data]) => (
                <div key={audience}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Space>
                      {getAudienceIcon(audience)}
                      <Text>{getAudienceLabel(audience)}</Text>
                    </Space>
                    <Text strong>{data.percentage.toFixed(1)}%</Text>
                  </div>
                  <Progress 
                    percent={data.percentage} 
                    size="small"
                    strokeColor={{
                      families: '#fa8c16',
                      students: '#52c41a',
                      staff: '#579172',
                      public: '#722ed1',
                    }[audience]}
                    showInfo={false}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '12px' }}>
                    <span>{data.views.toLocaleString()} vistas</span>
                    <span>{data.comments} comentarios</span>
                  </div>
                </div>
              ))}
            </Space>
          </Card>
        </Col>

        {/* Educational Impact */}
        <Col xs={24} lg={12}>
          <Card title="Impacto Educativo por Categoría" size="small">
            <List
              dataSource={analyticsData.categoriesPerformance}
              renderItem={(category) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <div 
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: category.color,
                          borderRadius: '2px',
                        }}
                      />
                      <div>
                        <Text style={{ fontSize: '13px', fontWeight: 500 }}>{category.name}</Text>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          {category.posts} posts • {category.views.toLocaleString()} vistas
                        </div>
                      </div>
                    </Space>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: getEngagementColor(category.engagement) }}>
                        {category.engagement.toFixed(1)}/5
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        ⭐ {category.averageRating.toFixed(1)}
                      </div>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Most Viewed Posts */}
        <Col xs={24} lg={14}>
          <Card title="Posts Más Vistos" size="small">
            <Table
              columns={mostViewedColumns}
              dataSource={analyticsData.mostViewedPosts}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Top Authors */}
        <Col xs={24} lg={10}>
          <Card title="Autores Más Activos" size="small">
            <Table
              columns={authorsColumns}
              dataSource={analyticsData.topAuthors}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Educational Communication Effectiveness */}
        <Col xs={24}>
          <Card title="Efectividad de la Comunicación Educativa" size="small">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#52c41a' }}>
                    {analyticsData.communicationEffectiveness.announcementsRead}%
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Comunicados Leídos</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#579172' }}>
                    {analyticsData.communicationEffectiveness.familyEngagement}%
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Engagement Familias</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#722ed1' }}>
                    {analyticsData.communicationEffectiveness.teacherParticipation}%
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Participación Profesores</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 600, color: '#fa8c16' }}>
                    {analyticsData.communicationEffectiveness.eventAnnouncements}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Eventos Anunciados</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Seasonal Trends */}
        <Col xs={24}>
          <Card title="Tendencias por Trimestre Académico" size="small">
            <Row gutter={[16, 16]}>
              {Object.entries(educationalMetrics.seasonalTrends).map(([season, data]) => {
                const seasonNames = {
                  firstTrimester: 'Primer Trimestre',
                  secondTrimester: 'Segundo Trimestre', 
                  thirdTrimester: 'Tercer Trimestre',
                  summer: 'Verano',
                };
                
                return (
                  <Col xs={12} sm={6} key={season}>
                    <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <Title level={5} style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                        {seasonNames[season as keyof typeof seasonNames]}
                      </Title>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#579172', marginBottom: '4px' }}>
                        {data.posts} posts
                      </div>
                      <div style={{ fontSize: '13px', color: getEngagementColor(data.engagement) }}>
                        {data.engagement.toFixed(1)}/5 engagement
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BlogAnalytics;