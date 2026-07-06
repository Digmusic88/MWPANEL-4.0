import React from 'react';
import { Row, Col, Empty, Spin, Pagination } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import ResourceCard from './ResourceCard';
import { EducationalResource } from '../../services/educationalResourcesService';

interface ResourceGridProps {
  resources: EducationalResource[];
  loading?: boolean;
  onResourceClick: (resource: EducationalResource) => void;
  onToggleFavorite?: (resource: EducationalResource) => void;
  onDelete?: (resource: EducationalResource) => void;
  onViewersClick?: (resourceId: string) => void;
  showAssignmentInfo?: boolean;
  canDelete?: boolean;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onChange: (page: number, pageSize?: number) => void;
  };
}

const ResourceGrid: React.FC<ResourceGridProps> = ({
  resources,
  loading = false,
  onResourceClick,
  onToggleFavorite,
  onDelete,
  onViewersClick,
  showAssignmentInfo = false,
  canDelete = false,
  pagination,
}) => {
  if (loading) {
    return (
      <div className="text-center py-16">
        <Spin size="large" tip="Cargando recursos..." />
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <Empty
        description="No se encontraron recursos"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        className="py-16"
      />
    );
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        <AnimatePresence>
          {resources.map((resource, index) => (
            <Col
              key={resource.id}
              xs={24}
              sm={12}
              md={8}
              lg={6}
              xl={6}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ResourceCard
                  resource={resource}
                  onClick={onResourceClick}
                  onToggleFavorite={onToggleFavorite}
                  onDelete={onDelete}
                  onViewersClick={onViewersClick}
                  showAssignmentInfo={showAssignmentInfo}
                  canDelete={canDelete}
                />
              </motion.div>
            </Col>
          ))}
        </AnimatePresence>
      </Row>

      {pagination && pagination.total > pagination.pageSize && (
        <div className="text-center mt-8">
          <Pagination
            current={pagination.current}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onChange={pagination.onChange}
            showSizeChanger={false}
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} de ${total} recursos`
            }
          />
        </div>
      )}
    </>
  );
};

export default ResourceGrid;