import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Seller = {
  id: string
  nome: string
  whatsapp: string
  ativo: boolean
  criado_em: string
}

export type Link = {
  id: string
  slug: string
  mensagem: string
  total_cliques: number
  criado_em: string
}

export type LinkSeller = {
  id: string
  link_id: string
  seller_id: string
  percentual: number
  total_cliques: number
  sellers?: Seller
}
