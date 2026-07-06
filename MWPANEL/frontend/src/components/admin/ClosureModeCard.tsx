import React, { useEffect, useState } from 'react';
import { Card, Switch, Checkbox, Input, Button, Alert, Tabs, message, Spin, Typography, Space, Divider } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { CLOSURE_SECTIONS_FE } from '../../config/closureSections';
import { getClosureConfig, enableClosure, disableClosure, updateClosure } from '../../services/closureApi';

const { Text, Paragraph } = Typography;
const ROLES: { key: string; label: string }[] = [
  { key: 'teacher', label: 'Profesores' },
  { key: 'student', label: 'Alumnos' },
  { key: 'family', label: 'Familias' },
];
const DEFAULT_ALLOWED = ['comunicaciones', 'blog', 'calendario', 'perfil'];
const FORCED_OPEN = ['perfil', 'comunicaciones']; // suelo de seguridad

const ClosureModeCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState('');
  const [byRole, setByRole] = useState<Record<string, string[]>>({
    teacher: DEFAULT_ALLOWED, student: DEFAULT_ALLOWED, family: DEFAULT_ALLOWED,
  });

  const load = async () => {
    try {
      const cfg = await getClosureConfig();
      setEnabled(cfg.enabled);
      setMsg(cfg.message || '');
      setByRole({
        teacher: cfg.allowedSectionsByRole?.teacher || DEFAULT_ALLOWED,
        student: cfg.allowedSectionsByRole?.student || DEFAULT_ALLOWED,
        family: cfg.allowedSectionsByRole?.family || DEFAULT_ALLOWED,
      });
    } catch {
      message.error('No se pudo cargar la configuración del cierre');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleSection = (role: string, key: string, checked: boolean) => {
    setByRole((prev) => {
      const set = new Set(prev[role]);
      if (checked) set.add(key); else set.delete(key);
      FORCED_OPEN.forEach((k) => set.add(k)); // nunca quitar el suelo de seguridad
      return { ...prev, [role]: Array.from(set) };
    });
  };

  const handleEnable = async () => {
    setSaving(true);
    try {
      await enableClosure({ allowedSectionsByRole: byRole, message: msg });
      setEnabled(true);
      message.success('Cierre de curso activado');
    } catch {
      message.error('No se pudo activar el cierre');
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClosure({ allowedSectionsByRole: byRole, message: msg });
      message.success('Configuración guardada');
    } catch {
      message.error('No se pudo guardar');
    } finally { setSaving(false); }
  };

  const handleDisable = async () => {
    setSaving(true);
    try {
      await disableClosure();
      setEnabled(false);
      message.success('Cierre de curso desactivado');
    } catch {
      message.error('No se pudo desactivar');
    } finally { setSaving(false); }
  };

  if (loading) return <Card><Spin /></Card>;

  const roleTabs = ROLES.map((role) => ({
    key: role.key,
    label: role.label,
    children: (
      <div>
        <Paragraph type="secondary">Marca las secciones que <b>permanecerán abiertas</b> para {role.label.toLowerCase()}.</Paragraph>
        <Space direction="vertical">
          {CLOSURE_SECTIONS_FE.map((s) => {
            const forced = FORCED_OPEN.includes(s.key);
            return (
              <Checkbox
                key={s.key}
                checked={byRole[role.key]?.includes(s.key) || forced}
                disabled={forced}
                onChange={(e) => toggleSection(role.key, s.key, e.target.checked)}
              >
                {s.label}{forced ? ' (siempre abierta)' : ''}
              </Checkbox>
            );
          })}
        </Space>
      </div>
    ),
  }));

  return (
    <Card title={<span><LockOutlined /> Cierre de Curso</span>}>
      <Alert
        type={enabled ? 'warning' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
        message={enabled ? 'El cierre de curso está ACTIVO' : 'El cierre de curso está inactivo'}
        description={enabled
          ? 'Profesores, alumnos y familias solo acceden a las secciones marcadas. El administrador mantiene acceso total.'
          : 'Al activarlo, profesores/alumnos/familias solo verán las secciones marcadas. Reversible en cualquier momento sin afectar otra configuración.'}
      />

      <Space style={{ marginBottom: 16 }}>
        <Text strong>Estado:</Text>
        <Switch
          checked={enabled}
          checkedChildren="Activo"
          unCheckedChildren="Inactivo"
          loading={saving}
          onChange={(v) => (v ? handleEnable() : handleDisable())}
        />
      </Space>

      <Divider />
      <Text strong>Secciones permitidas por rol</Text>
      <Tabs items={roleTabs} />

      <Divider />
      <Text strong>Mensaje para usuarios afectados (opcional)</Text>
      <Input.TextArea
        rows={2}
        value={msg}
        maxLength={300}
        placeholder="Ej.: La plataforma está en cierre de curso. Volveremos pronto."
        onChange={(e) => setMsg(e.target.value)}
        style={{ marginTop: 8 }}
      />

      <Divider />
      <Space>
        <Button type="primary" loading={saving} onClick={handleSave}>Guardar configuración</Button>
        {!enabled && <Button type="primary" danger loading={saving} onClick={handleEnable}>Activar cierre</Button>}
        {enabled && <Button danger loading={saving} onClick={handleDisable}>Desactivar cierre</Button>}
      </Space>
    </Card>
  );
};

export default ClosureModeCard;
