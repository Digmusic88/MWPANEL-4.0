import React from 'react';
import { Typography } from 'antd';
import { 
  SunOutlined, 
  CloudOutlined, 
  MoonOutlined 
} from '@ant-design/icons';

const { Title } = Typography;

interface TimeBasedWelcomeProps {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  fallbackText?: string;
  level?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}

const TimeBasedWelcome: React.FC<TimeBasedWelcomeProps> = ({
  firstName,
  lastName,
  fullName,
  email,
  fallbackText = 'Usuario',
  level = 2,
  className = '!mb-2'
}) => {
  console.log('🎉 TIMEBASEDWELCOME_COMPONENT_LOADED_SUCCESS_20250819164000');
  
  // Obtener la hora actual
  const currentHour = new Date().getHours();
  
  console.log('⏰ CURRENT_HOUR_FOR_GREETING:', currentHour);
  
  // Determinar el saludo e icono según la hora
  const getGreetingAndIcon = () => {
    if (currentHour >= 6 && currentHour < 14) {
      // Mañana: 6:00 - 13:59
      console.log('🌅 MORNING_GREETING_SELECTED');
      return {
        greeting: 'Buenos días',
        icon: <SunOutlined style={{ color: '#faad14', fontSize: '1.2em', marginRight: '8px' }} />
      };
    } else if (currentHour >= 14 && currentHour < 20) {
      // Tarde: 14:00 - 19:59
      console.log('🌤️ AFTERNOON_GREETING_SELECTED');
      return {
        greeting: 'Buenas tardes',
        icon: <CloudOutlined style={{ color: '#fa8c16', fontSize: '1.2em', marginRight: '8px' }} />
      };
    } else {
      // Noche: 20:00 - 5:59
      console.log('🌙 EVENING_GREETING_SELECTED');
      return {
        greeting: 'Buenas noches',
        icon: <MoonOutlined style={{ color: '#722ed1', fontSize: '1.2em', marginRight: '8px' }} />
      };
    }
  };

  // Obtener el nombre para mostrar
  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (fullName) {
      return fullName;
    }
    if (firstName) {
      return firstName;
    }
    if (email) {
      return email;
    }
    return fallbackText;
  };

  const { greeting, icon } = getGreetingAndIcon();
  const displayName = getDisplayName();

  console.log('👋 FINAL_GREETING_DATA:', { greeting, displayName, currentHour });

  return (
    <Title level={level} className={className}>
      {icon}
      <strong>{greeting}, {displayName}</strong>
    </Title>
  );
};

export default TimeBasedWelcome;