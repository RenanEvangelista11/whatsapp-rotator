-- Links WhatsApp (sem tracking, com descrição)
CREATE TABLE wa_links (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lid             TEXT UNIQUE NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  initial_message TEXT NOT NULL,
  rotator         BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  vendors         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
