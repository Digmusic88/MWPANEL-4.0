import React from 'react';
import { Tag, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

interface FamilyUser {
  id: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  familyInfo?: {
    children: string;
    childrenCount: number;
  };
}

interface FamilyChildrenTagsProps {
  user: FamilyUser;
  size?: 'small' | 'default';
  maxTags?: number;
}

const FamilyChildrenTags: React.FC<FamilyChildrenTagsProps> = ({
  user,
  size = 'small',
  maxTags = 3
}) => {
  const { user: currentUser } = useAuthStore();

  // DEBUG: Agregar logs para diagnosticar el problema
  console.log('🔍 FamilyChildrenTags DEBUG:', {
    userId: user.id,
    userRole: user.role,
    currentUserRole: currentUser?.role,
    familyInfo: user.familyInfo,
    hasChildren: !!user.familyInfo?.children,
    childrenValue: user.familyInfo?.children
  });

  // Solo mostrar si:
  // 1. El usuario actual es admin o teacher
  // 2. El usuario en la lista es una familia
  // 3. Hay información de hijos disponible
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'teacher')) {
    console.log(`❌ FamilyChildrenTags: Oculto - usuario actual no es admin/teacher (${currentUser?.role})`);
    return null;
  }

  if (user.role !== 'family') {
    console.log(`❌ FamilyChildrenTags: Oculto - usuario no es familia (${user.role})`);
    return null;
  }

  if (!user.familyInfo?.children) {
    console.log(`❌ FamilyChildrenTags: Oculto - sin familyInfo.children (${user.familyInfo?.children})`);
    return null;
  }

  // Procesar los nombres de los hijos desde familyInfo.children
  const childrenNames = user.familyInfo.children.split(' y ').filter(name => name.trim());

  if (childrenNames.length === 0) {
    console.log(`❌ FamilyChildrenTags: Oculto - sin hijos después de procesar (${childrenNames.length})`);
    return null;
  }

  console.log(`✅ FamilyChildrenTags: MOSTRANDO para usuario ${user.id}:`, childrenNames);

  // Colores predefinidos para las etiquetas
  const tagColors = [
    'blue', 'green', 'orange', 'red', 'purple', 'pink', 'cyan', 'lime'
  ];

  // Mostrar solo los primeros 'maxTags' hijos
  const visibleChildren = childrenNames.slice(0, maxTags);
  const hiddenCount = childrenNames.length - maxTags;

  return (
    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {visibleChildren.map((childName, index) => (
        <Tag
          key={index}
          color={tagColors[index % tagColors.length]}
          size={size}
          icon={<UserOutlined />}
          style={{
            fontSize: size === 'small' ? '11px' : '12px',
            margin: '1px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px'
          }}
        >
          {childName}
        </Tag>
      ))}

      {hiddenCount > 0 && (
        <Tooltip
          title={childrenNames.slice(maxTags).join(', ')}
          placement="top"
        >
          <Tag
            color="default"
            size={size}
            style={{
              fontSize: size === 'small' ? '11px' : '12px',
              margin: '1px',
              cursor: 'help'
            }}
          >
            +{hiddenCount}
          </Tag>
        </Tooltip>
      )}
    </div>
  );
};

export default FamilyChildrenTags;