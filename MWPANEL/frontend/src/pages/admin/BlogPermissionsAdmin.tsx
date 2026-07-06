import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Transfer,
  message,
  Space,
  Tag,
  Avatar,
  Typography,
  Empty,
  Spin,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/apiClient';

const { Title, Text } = Typography;

interface Teacher {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  allowedGroups: { id: string; name: string }[];
}

interface ClassGroup {
  id: string;
  name: string;
}

const BlogPermissionsAdmin: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all teachers with permissions
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery<Teacher[]>({
    queryKey: ['blog-permissions-teachers'],
    queryFn: async () => {
      const response = await api.get('/blog/permissions/teachers');
      return response.data;
    },
  });

  // Fetch all class groups
  const { data: classGroups = [], isLoading: loadingGroups } = useQuery<ClassGroup[]>({
    queryKey: ['class-groups'],
    queryFn: async () => {
      const response = await api.get('/class-groups');
      return response.data;
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({
      teacherId,
      classGroupIds,
    }: {
      teacherId: string;
      classGroupIds: string[];
    }) => {
      const response = await api.put(`/blog/permissions/teacher/${teacherId}`, {
        classGroupIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-permissions-teachers'] });
      message.success('Permisos actualizados correctamente');
      handleCloseModal();
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || 'Error al actualizar los permisos'
      );
    },
  });

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setSelectedGroups(teacher.allowedGroups.map((g) => g.id));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingTeacher(null);
    setSelectedGroups([]);
    setIsModalOpen(false);
  };

  const handleSavePermissions = () => {
    if (!editingTeacher) return;

    updatePermissionsMutation.mutate({
      teacherId: editingTeacher.teacherId,
      classGroupIds: selectedGroups,
    });
  };

  const handleTransferChange = (nextTargetKeys: string[]) => {
    setSelectedGroups(nextTargetKeys);
  };

  const columns = [
    {
      title: 'Profesor',
      key: 'teacher',
      render: (_: any, record: Teacher) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{record.teacherName}</div>
            <Text type="secondary" className="text-sm">
              {record.teacherEmail}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Grupos Permitidos',
      key: 'groups',
      render: (_: any, record: Teacher) => (
        <div className="flex flex-wrap gap-1">
          {record.allowedGroups.length === 0 ? (
            <Text type="secondary">Sin permisos asignados</Text>
          ) : (
            record.allowedGroups.map((group) => (
              <Tag key={group.id} color="blue">
                {group.name}
              </Tag>
            ))
          )}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_: any, record: Teacher) => (
        <Space>
          <Tooltip title="Editar permisos">
            <Button
              type="primary"
              ghost
              icon={<EditOutlined />}
              onClick={() => handleEditTeacher(record)}
            />
          </Tooltip>
          {record.allowedGroups.length > 0 && (
            <Tooltip title="Quitar todos los permisos">
              <Button
                danger
                ghost
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Quitar todos los permisos',
                    content: `¿Estas seguro de que quieres quitar todos los permisos de publicacion de ${record.teacherName}?`,
                    okText: 'Si, quitar',
                    cancelText: 'Cancelar',
                    okButtonProps: { danger: true },
                    onOk: () => {
                      updatePermissionsMutation.mutate({
                        teacherId: record.teacherId,
                        classGroupIds: [],
                      });
                    },
                  });
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (loadingTeachers || loadingGroups) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} className="mb-2">
          <TeamOutlined className="mr-2" />
          Permisos de Publicacion del Blog
        </Title>
        <Text type="secondary">
          Gestiona que profesores pueden publicar en que grupos de clase. Los
          profesores solo podran crear publicaciones visibles para los grupos que
          tengan asignados.
        </Text>
      </div>

      <Card>
        {teachers.length === 0 ? (
          <Empty
            description="No hay profesores registrados"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={teachers}
            columns={columns}
            rowKey="teacherId"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `${total} profesores`,
            }}
          />
        )}
      </Card>

      {/* Edit Permissions Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>
              Editar permisos de {editingTeacher?.teacherName}
            </span>
          </Space>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        width={700}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>
            Cancelar
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSavePermissions}
            loading={updatePermissionsMutation.isPending}
          >
            Guardar Cambios
          </Button>,
        ]}
      >
        <div className="py-4">
          <Text type="secondary" className="block mb-4">
            Selecciona los grupos de clase en los que{' '}
            <strong>{editingTeacher?.teacherName}</strong> puede publicar.
            Mueve los grupos de izquierda a derecha para asignar permisos.
          </Text>

          <Transfer
            dataSource={classGroups.map((group) => ({
              key: group.id,
              title: group.name,
            }))}
            titles={['Grupos Disponibles', 'Grupos Permitidos']}
            targetKeys={selectedGroups}
            onChange={handleTransferChange}
            render={(item) => item.title}
            listStyle={{
              width: 280,
              height: 350,
            }}
            showSearch
            filterOption={(inputValue, option) =>
              option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
            }
          />
        </div>
      </Modal>
    </div>
  );
};

export default BlogPermissionsAdmin;
