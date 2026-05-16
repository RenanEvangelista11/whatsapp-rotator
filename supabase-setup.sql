-- Vendedores
CREATE TABLE sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Links de redirecionamento
CREATE TABLE links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  mensagem TEXT DEFAULT 'Olá! Vim pelo link.',
  total_cliques INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Relação link <-> vendedor com percentual e contagem
CREATE TABLE link_sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
  percentual INTEGER NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  total_cliques INTEGER DEFAULT 0,
  UNIQUE(link_id, seller_id)
);

-- Analytics de cliques
CREATE TABLE clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES links(id),
  seller_id UUID REFERENCES sellers(id),
  ip TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
