import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Vendor = {
  name: string
  number: string
  weight: number
}

export type WaLink = {
  id: string
  lid: string
  description: string
  initial_message: string | null
  rotator: boolean
  whatsapp_number: string | null
  vendors: Vendor[] | null
  redirect_url: string | null
  created_at: string
}
