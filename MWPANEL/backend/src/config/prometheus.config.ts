import { registerAs } from '@nestjs/config';

export default registerAs('prometheus', () => ({
  defaultLabels: {
    app: 'mw-panel',
    env: process.env.NODE_ENV || 'development',
  },
  metricsPath: '/metrics',
  defaultMetrics: {
    enabled: process.env.PROMETHEUS_DEFAULT_METRICS_ENABLED !== 'false',
  },
  customMetrics: {
    httpRequestDuration: {
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    },
    dbQueryDuration: {
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    },
    cacheHitRate: {
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type'],
    },
    activeUsers: {
      name: 'active_users_total',
      help: 'Total number of active users',
      labelNames: ['role'],
    },
    businessMetrics: {
      studentsEnrolled: {
        name: 'students_enrolled_total',
        help: 'Total number of enrolled students',
        labelNames: ['educational_level', 'course'],
      },
      activitiesCreated: {
        name: 'activities_created_total',
        help: 'Total number of activities created',
        labelNames: ['type', 'subject'],
      },
      evaluationsCompleted: {
        name: 'evaluations_completed_total',
        help: 'Total number of evaluations completed',
        labelNames: ['evaluation_type', 'competency'],
      },
      messagesExchanged: {
        name: 'messages_exchanged_total',
        help: 'Total number of messages exchanged',
        labelNames: ['sender_role', 'receiver_role'],
      },
    },
  },
  aggregators: {
    p50: 0.5,
    p90: 0.9,
    p95: 0.95,
    p99: 0.99,
  },
  pushgateway: {
    enabled: process.env.PROMETHEUS_PUSHGATEWAY_ENABLED === 'true',
    url: process.env.PROMETHEUS_PUSHGATEWAY_URL || 'http://localhost:9091',
    interval: parseInt(process.env.PROMETHEUS_PUSH_INTERVAL || '30000', 10),
    job: 'mw-panel-backend',
  },
}));