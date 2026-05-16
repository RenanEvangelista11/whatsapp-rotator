import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .order('criado_em', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nome, whatsapp } = body

  if (!nome || !whatsapp) {
    return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sellers')
    .insert({ nome, whatsapp })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
