import React, { useState } from 'react';
import {
  Card,
  List,
  Space,
  Tag,
  Button,
  Popconfirm,
  Typography,
  Empty,
  Avatar,
  Tooltip,
  Badge,
  Modal,
  Descriptions,
  Switch,
  message,
  Spin,
  Alert,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import educationalResourcesService, {
  EducationalResource,
  ResourceAssignment,
} from '../../services/educationalResourcesService';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface ResourceAssignmentsProps {
  resource: EducationalResource;
  onAssignmentsChange?: () => void;
}

const ResourceAssignments: React.FC<ResourceAssignmentsProps> = ({
  resource,
  onAssignmentsChange,
}) => {
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<ResourceAssignment | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [studentsModalVisible, setStudentsModalVisible] = useState(false);
  const [selectedAssignmentForStudents, setSelectedAssignmentForStudents] = useState<string | null>(null);

  // Query to fetch students for a group assignment
  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['assignment-students', selectedAssignmentForStudents],
    queryFn: () => educationalResourcesService.getAssignmentStudents(selectedAssignmentForStudents!),
    enabled: !!selectedAssignmentForStudents && studentsModalVisible,
  });

  // Mutation to exclude student
  const excludeStudentMutation = useMutation({
    mutationFn: ({ assignmentId, studentId }: { assignmentId: string; studentId: string }) =>
      educationalResourcesService.excludeStudentFromAssignment(assignmentId, studentId),
    onSuccess: () => {
      message.success('Estudiante excluido de la asignación');
      refetchStudents();
    },
    onError: () => {
      message.error('Error al excluir estudiante');
    },
  });

  // Mutation to include student
  const includeStudentMutation = useMutation({
    mutationFn: ({ assignmentId, studentId }: { assignmentId: string; studentId: string }) =>
      educationalResourcesService.includeStudentInAssignment(assignmentId, studentId),
    onSuccess: () => {
      message.success('Estudiante incluido en la asignación');
      refetchStudents();
    },
    onError: () => {
      message.error('Error al incluir estudiante');
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      educationalResourcesService.unassignResource(resource.id, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      if (onAssignmentsChange) {
        onAssignmentsChange();
      }
    },
  });

  const handleViewDetails = (assignment: ResourceAssignment) => {
    // If it's a group assignment, show the students management modal
    if (assignment.classGroupId) {
      setSelectedAssignmentForStudents(assignment.id);
      setStudentsModalVisible(true);
    } else {
      // For individual assignments, show the simple details modal
      setSelectedAssignment(assignment);
      setDetailsModalVisible(true);
    }
  };

  const handleCloseDetails = () => {
    setSelectedAssignment(null);
    setDetailsModalVisible(false);
  };

  const handleCloseStudentsModal = () => {
    setStudentsModalVisible(false);
    setSelectedAssignmentForStudents(null);
  };

  const handleToggleStudentAccess = (studentId: string, isCurrentlyExcluded: boolean) => {
    if (!selectedAssignmentForStudents) return;

    if (isCurrentlyExcluded) {
      // Re-include student
      includeStudentMutation.mutate({
        assignmentId: selectedAssignmentForStudents,
        studentId,
      });
    } else {
      // Exclude student
      excludeStudentMutation.mutate({
        assignmentId: selectedAssignmentForStudents,
        studentId,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const isOverdue = (dueDateString?: string) => {
    if (!dueDateString) return false;
    return dayjs(dueDateString).isBefore(dayjs(), 'day');
  };

  const getDaysUntilDue = (dueDateString?: string) => {
    if (!dueDateString) return null;
    const dueDate = dayjs(dueDateString);
    const today = dayjs();
    return dueDate.diff(today, 'day');
  };

  const getAssignmentStatus = (assignment: ResourceAssignment) => {
    if (!assignment.dueDate) return null;
    
    const daysUntil = getDaysUntilDue(assignment.dueDate);
    if (daysUntil === null) return null;
    
    if (daysUntil < 0) {
      return { status: 'error', text: `Vencido hace ${Math.abs(daysUntil)} días` };
    } else if (daysUntil === 0) {
      return { status: 'warning', text: 'Vence hoy' };
    } else if (daysUntil <= 3) {
      return { status: 'warning', text: `Vence en ${daysUntil} días` };
    } else {
      return { status: 'success', text: `${daysUntil} días restantes` };
    }
  };

  if (!resource.assignments || resource.assignments.length === 0) {
    return (
      <Card title="Asignaciones" size="small">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No hay asignaciones para este recurso"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <span>Asignaciones</span>
          <Badge count={resource.assignments.length} showZero color="blue" />
        </Space>
      }
      size="small"
    >
      <List
        dataSource={resource.assignments}
        renderItem={(assignment) => {
          const status = getAssignmentStatus(assignment);
          
          return (
            <List.Item
              actions={[
                <Tooltip title="Ver detalles">
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => handleViewDetails(assignment)}
                  />
                </Tooltip>,
                <Popconfirm
                  title="¿Eliminar asignación?"
                  description="Esta acción no se puede deshacer"
                  onConfirm={() => removeAssignmentMutation.mutate(assignment.id)}
                  okText="Sí"
                  cancelText="No"
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    loading={removeAssignmentMutation.isPending}
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={assignment.classGroupId ? <TeamOutlined /> : <UserOutlined />}
                    style={{
                      backgroundColor: assignment.classGroupId ? '#1890ff' : '#52c41a',
                    }}
                  />
                }
                title={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space wrap>
                      <Text strong>
                        {assignment.classGroupId
                          ? `Clase: ${assignment.classGroup?.name || 'Nombre no disponible'}`
                          : `Estudiante: ${
                              assignment.student?.profile 
                                ? `${assignment.student.profile.firstName || ''} ${assignment.student.profile.lastName || ''}`.trim() || 'Nombre no disponible'
                                : assignment.student?.email || 'Nombre no disponible'
                            }`
                        }
                      </Text>
                      
                      {assignment.dueDate && (
                        <Tag
                          color={status?.status === 'error' ? 'red' : status?.status === 'warning' ? 'orange' : 'green'}
                          icon={<CalendarOutlined />}
                        >
                          {formatDate(assignment.dueDate)}
                        </Tag>
                      )}
                      
                      {status && (
                        <Tag
                          color={status.status}
                          icon={<ClockCircleOutlined />}
                        >
                          {status.text}
                        </Tag>
                      )}
                    </Space>
                    
                    {assignment.instructions && (
                      <Paragraph
                        ellipsis={{ rows: 2, expandable: true }}
                        style={{ marginBottom: 0, color: '#666' }}
                      >
                        <Text type="secondary">
                          <strong>Instrucciones:</strong> {assignment.instructions}
                        </Text>
                      </Paragraph>
                    )}
                    
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Asignado el {formatDate(assignment.assignedAt)} por {
                        assignment.assignedBy?.profile 
                          ? `${assignment.assignedBy.profile.firstName || ''} ${assignment.assignedBy.profile.lastName || ''}`.trim() || assignment.assignedBy?.email || 'Usuario'
                          : assignment.assignedBy?.email || 'Usuario'
                      }
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />

      {/* Details Modal */}
      <Modal
        title="Detalles de la Asignación"
        open={detailsModalVisible}
        onCancel={handleCloseDetails}
        footer={[
          <Button key="close" onClick={handleCloseDetails}>
            Cerrar
          </Button>,
        ]}
        width={600}
      >
        {selectedAssignment && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Tipo de Asignación">
              <Space>
                {selectedAssignment.classGroupId ? (
                  <>
                    <TeamOutlined style={{ color: '#1890ff' }} />
                    <Text>Clase Completa</Text>
                  </>
                ) : (
                  <>
                    <UserOutlined style={{ color: '#52c41a' }} />
                    <Text>Estudiante Individual</Text>
                  </>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Asignado a">
              <Text strong>
                {selectedAssignment.classGroupId
                  ? `${selectedAssignment.classGroup?.name || 'Nombre no disponible'}`
                  : selectedAssignment.student?.profile
                    ? `${selectedAssignment.student.profile.firstName || ''} ${selectedAssignment.student.profile.lastName || ''}`.trim() || 'Nombre no disponible'
                    : selectedAssignment.student?.email || 'Nombre no disponible'
                }
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Fecha de Asignación">
              <Space>
                <CalendarOutlined />
                <Text>{formatDate(selectedAssignment.assignedAt)}</Text>
              </Space>
            </Descriptions.Item>

            {selectedAssignment.dueDate && (
              <Descriptions.Item label="Fecha Límite">
                <Space>
                  <CalendarOutlined />
                  <Text>{formatDate(selectedAssignment.dueDate)}</Text>
                  {getAssignmentStatus(selectedAssignment) && (
                    <Tag color={getAssignmentStatus(selectedAssignment)?.status}>
                      {getAssignmentStatus(selectedAssignment)?.text}
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Asignado Por">
              <Text>
                {selectedAssignment.assignedBy?.profile
                  ? `${selectedAssignment.assignedBy.profile.firstName || ''} ${selectedAssignment.assignedBy.profile.lastName || ''}`.trim() || selectedAssignment.assignedBy?.email || 'Usuario'
                  : selectedAssignment.assignedBy?.email || 'Usuario'
                }
              </Text>
            </Descriptions.Item>

            {selectedAssignment.instructions && (
              <Descriptions.Item label="Instrucciones">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedAssignment.instructions}
                </Paragraph>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Students Management Modal for Group Assignments */}
      <Modal
        title={
          <Space>
            <TeamOutlined style={{ color: '#1890ff' }} />
            <span>Gestión de Acceso por Estudiante</span>
          </Space>
        }
        open={studentsModalVisible}
        onCancel={handleCloseStudentsModal}
        footer={[
          <Button key="close" onClick={handleCloseStudentsModal}>
            Cerrar
          </Button>,
        ]}
        width={700}
      >
        {studentsLoading ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-4">Cargando estudiantes...</div>
          </div>
        ) : studentsData ? (
          <div>
            {/* Assignment Info Header */}
            <Card size="small" className="mb-4" style={{ backgroundColor: '#f5f5f5' }}>
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Grupo">
                  <Text strong>{studentsData.assignment.classGroupName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Recurso">
                  <Text>{studentsData.assignment.resourceTitle}</Text>
                </Descriptions.Item>
                {studentsData.assignment.dueDate && (
                  <Descriptions.Item label="Fecha límite">
                    <Text>{formatDate(studentsData.assignment.dueDate)}</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Asignado el">
                  <Text>{formatDate(studentsData.assignment.assignedAt)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Summary Stats */}
            <Alert
              message={
                <Space>
                  <span>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> Con acceso:{' '}
                    <strong>{studentsData.totalStudents - studentsData.excludedCount}</strong>
                  </span>
                  <span style={{ marginLeft: 16 }}>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Sin acceso:{' '}
                    <strong>{studentsData.excludedCount}</strong>
                  </span>
                  <span style={{ marginLeft: 16 }}>
                    Total: <strong>{studentsData.totalStudents}</strong>
                  </span>
                </Space>
              }
              type="info"
              className="mb-4"
            />

            {/* Students List */}
            <List
              dataSource={studentsData.students}
              renderItem={(student) => (
                <List.Item
                  actions={[
                    <Tooltip
                      title={student.isExcluded ? 'Dar acceso al recurso' : 'Quitar acceso al recurso'}
                    >
                      <Switch
                        checked={!student.isExcluded}
                        onChange={() => handleToggleStudentAccess(student.id, student.isExcluded)}
                        loading={
                          (excludeStudentMutation.isPending || includeStudentMutation.isPending) &&
                          (excludeStudentMutation.variables?.studentId === student.id ||
                            includeStudentMutation.variables?.studentId === student.id)
                        }
                        checkedChildren={<CheckCircleOutlined />}
                        unCheckedChildren={<CloseCircleOutlined />}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<UserOutlined />}
                        style={{
                          backgroundColor: student.isExcluded ? '#ff4d4f' : '#52c41a',
                        }}
                      />
                    }
                    title={
                      <Space>
                        <Text style={{ textDecoration: student.isExcluded ? 'line-through' : 'none' }}>
                          {student.profile
                            ? `${student.profile.firstName} ${student.profile.lastName}`.trim()
                            : student.email}
                        </Text>
                        {student.isExcluded && (
                          <Tag color="red" icon={<CloseCircleOutlined />}>
                            Sin acceso
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      student.profile ? (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {student.email}
                        </Text>
                      ) : null
                    }
                  />
                </List.Item>
              )}
            />

            {studentsData.students.length === 0 && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay estudiantes en este grupo"
              />
            )}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No se pudo cargar la información"
          />
        )}
      </Modal>
    </Card>
  );
};

export default ResourceAssignments;