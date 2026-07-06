import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGrades } from '../../hooks/useGrades';
import { useCurrentAcademicYear } from '../../hooks/useCurrentAcademicYear';

interface DartboardGradesProps {
  studentId: string;
}

interface SubjectPoint {
  id: string;
  name: string;
  score: number;
  color: string;
  angle: number;
  distance: number;
}

const DartboardGrades: React.FC<DartboardGradesProps> = ({ studentId }) => {
  const [subjectPoints, setSubjectPoints] = useState<SubjectPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: gradesData } = useGrades(studentId);
  const { currentAcademicYear } = useCurrentAcademicYear();

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
  ];

  useEffect(() => {
    if (gradesData?.subjectGrades) {
      const points = gradesData.subjectGrades
        .filter(subject => typeof subject.averageGrade === 'number')
        .map((subject, index) => ({
          id: subject.subjectId,
          name: subject.subjectName,
          score: Math.max(0, Math.min(100, subject.averageGrade as number)),
          color: colors[index % colors.length],
          angle: (index * 360) / gradesData.subjectGrades.length,
          distance: Math.max(20, Math.min(80, (subject.averageGrade as number) * 0.8))
        }));

      // Animate subjects appearing one by one
      points.forEach((point, index) => {
        setTimeout(() => {
          setSubjectPoints(prev => [...prev, point]);
        }, index * 400);
      });

      setTimeout(() => setIsLoading(false), points.length * 400);
    }
  }, [gradesData]);

  const polarToCartesian = (angle: number, distance: number) => {
    const angleRad = ((angle - 90) * Math.PI) / 180;
    return {
      x: 50 + (distance * Math.cos(angleRad)) / 100 * 40,
      y: 50 + (distance * Math.sin(angleRad)) / 100 * 40
    };
  };

  const DartboardCircle = ({ radius, delay = 0 }: { radius: number; delay?: number }) => (
    <motion.circle
      cx="50"
      cy="50"
      r={radius}
      fill="none"
      stroke="#e5e7eb"
      strokeWidth="0.5"
      strokeDasharray="2,2"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
    />
  );

  const ScoreLabel = ({ score, angle }: { score: number; angle: number }) => {
    const pos = polarToCartesian(angle, 85);
    return (
      <motion.text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs font-bold fill-gray-600"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        {score}
      </motion.text>
    );
  };

  const SubjectMarker = ({ point, index }: { point: SubjectPoint; index: number }) => {
    const pos = polarToCartesian(point.angle, point.distance);
    
    return (
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8 + index * 0.2, duration: 0.6, type: "spring" }}
      >
        {/* Line from center */}
        <motion.line
          x1="50"
          y1="50"
          x2={pos.x}
          y2={pos.y}
          stroke={point.color}
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.8 + index * 0.2, duration: 0.8 }}
        />
        
        {/* Subject point */}
        <motion.circle
          cx={pos.x}
          cy={pos.y}
          r="3"
          fill={point.color}
          className="drop-shadow-md"
          whileHover={{ scale: 1.5 }}
        />
        
        {/* Subject name */}
        <motion.text
          x={pos.x}
          y={pos.y - 8}
          textAnchor="middle"
          className="text-[10px] font-medium fill-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 + index * 0.2, duration: 0.4 }}
        >
          {point.name}
        </motion.text>
        
        {/* Score */}
        <motion.text
          x={pos.x}
          y={pos.y + 12}
          textAnchor="middle"
          className="text-[8px] font-bold"
          style={{ fill: point.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 + index * 0.2, duration: 0.4 }}
        >
          {point.score.toFixed(0)}
        </motion.text>
      </motion.g>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-2xl shadow-xl">
        <div className="relative">
          {/* Animated dartboard loading */}
          <motion.div
            className="w-64 h-64 border-4 border-gray-200 border-t-purple-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Center target */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-red-500 rounded-full" />
            <div className="absolute w-16 h-16 bg-red-500 rounded-full" />
            <div className="absolute w-4 h-4 bg-white rounded-full" />
          </div>
          
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-sm text-gray-600 font-medium">Cargando calificaciones...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-xl p-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Diana de Calificaciones
        </h3>
        <p className="text-sm text-gray-600">
          {currentAcademicYear?.name || 'Año Académico'}
        </p>
      </div>

      <div className="relative mx-auto" style={{ width: '300px', height: '300px' }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background circles */}
          <DartboardCircle radius="10" delay={0} />
          <DartboardCircle radius="20" delay={0.1} />
          <DartboardCircle radius="30" delay={0.2} />
          <DartboardCircle radius="40" delay={0.3} />
          
          {/* Score rings */}
          <motion.circle
            cx="50"
            cy="50"
            r="8"
            fill="#ef4444"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="5"
            fill="#fbbf24"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="2"
            fill="#22c55e"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          />
          
          {/* Score labels */}
          {[0, 20, 40, 60, 80, 100].map((score, index) => (
            <ScoreLabel key={score} score={score} angle={index * 60} />
          ))}
          
          {/* Subject points */}
          <AnimatePresence>
            {subjectPoints.map((point, index) => (
              <SubjectMarker key={point.id} point={point} index={index} />
            ))}
          </AnimatePresence>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {subjectPoints.map((point) => (
          <motion.div
            key={point.id}
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 + subjectPoints.indexOf(point) * 0.1 }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: point.color }}
            />
            <span className="text-xs text-gray-700">
              {point.name}: {point.score.toFixed(0)}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Average score */}
      {subjectPoints.length > 0 && (
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
        >
          <p className="text-sm text-gray-600">Promedio General</p>
          <p className="text-2xl font-bold text-gray-800">
            {(
              subjectPoints.reduce((sum, point) => sum + point.score, 0) /
              subjectPoints.length
            ).toFixed(1)}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DartboardGrades;