-- Links WhatsApp (igual ao CRM)
CREATE TABLE wa_links (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lid         TEXT UNIQUE NOT NULL,
  pixel_id    TEXT NOT NULL,
  access_token TEXT NOT NULL,
  initial_message TEXT NOT NULL,
  rotator     BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  vendors     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de rastreamento
CREATE TABLE wa_tracking_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     TEXT UNIQUE NOT NULL,
  link_id      UUID REFERENCES wa_links(id) ON DELETE CASCADE,
  vendor_name  TEXT,
  vendor_number TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_content  TEXT,
  utm_term     TEXT,
  utm_id       TEXT,
  sck          TEXT,
  src          TEXT,
  fbclid       TEXT,
  gclid        TEXT,
  fbp          TEXT,
  fbc          TEXT,
  external_id  TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  event_fired  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
