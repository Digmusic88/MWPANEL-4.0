import React from 'react';
import { Typography } from 'antd';
import { 
  SunOutlined, 
  CoffeeOutlined, 
  MoonOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface DynamicGreetingProps {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  fallbackText?: string;
  level?: 1 | 2 | 3 | 4 | 5;
  className?: string;
  showSubtext?: boolean;
  subtextContent?: string;
}

const DynamicGreeting: React.FC<DynamicGreetingProps> = ({
  firstName,
  lastName,
  fullName,
  email,
  fallbackText = 'Usuario',
  level = 2,
  className = '!mb-2',
  showSubtext = false,
  subtextContent
}) => {
  // Dynamic greeting system active ✅
  // Obtener la hora actual
  const currentHour = new Date().getHours();
  
  // Determinar el saludo e icono según la hora
  const getGreetingAndIcon = () => {
    if (currentHour >= 6 && currentHour < 14) {
      // Mañana: 6:00 - 13:59
      return {
        greeting: 'Buenos días',
        icon: <SunOutlined style={{ color: '#faad14', fontSize: '1.2em', marginRight: '8px' }} />
      };
    } else if (currentHour >= 14 && currentHour < 20) {
      // Tarde: 14:00 - 19:59
      return {
        greeting: 'Buenas tardes',
        icon: <CoffeeOutlined style={{ color: '#fa8c16', fontSize: '1.2em', marginRight: '8px' }} />
      };
    } else {
      // Noche: 20:00 - 5:59
      return {
        greeting: 'Buenas noches',
        icon: <MoonOutlined style={{ color: '#722ed1', fontSize: '1.2em', marginRight: '8px' }} />
      };
    }
  };

  // Obtener el nombre para mostrar
  const getDisplayName = () => {
    if (firstName) {
      return firstName;
    }
    if (fullName) {
      return fullName;
    }
    if (email) {
      return email;
    }
    return fallbackText;
  };

  const { greeting, icon } = getGreetingAndIcon();
  const displayName = getDisplayName();

  return (
    <>
      <Title level={level} className={className}>
        {icon}
        <strong>{greeting}, {displayName}</strong>
      </Title>
      {showSubtext && subtextContent && (
        <Text type="secondary" className="block">
          {subtextContent}
        </Text>
      )}
    </>
  );
};

export default DynamicGreeting;