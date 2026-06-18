-- =====================================================================
-- Secretaría — Migración 010: grupos de chat (entre usuarios de secretaría)
-- =====================================================================
SET search_path TO secretaria, public;

CREATE TABLE IF NOT EXISTS secretaria.chat_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS secretaria.chat_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES secretaria.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE TABLE IF NOT EXISTS secretaria.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES secretaria.chat_groups(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_group ON secretaria.chat_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON secretaria.chat_members(user_id);
