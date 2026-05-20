import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function GET() {
  const { data, error } = await supabase
    .from('wa_links')
    .select('id, lid, description, initial_message, rotator, whatsapp_number, vendors, redirect_url, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { description, initial_message, rotator, whatsapp_number, vendors, redirect_url } = body ?? {}

  const lid = randomUUID().replace(/-/g, '').slice(0, 12)

  // Modo redirect simples
  if (redirect_url) {
    const { error } = await supabase.from('wa_links').insert({
      lid,
      description: description?.trim() || '',
      redirect_url: redirect_url.trim(),
      initial_message: '',
      rotator: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lid }, { status: 201 })
  }

  // Modo WhatsApp
  if (!initial_message) return NextResponse.json({ error: 'Informe a mensagem inicial' }, { status: 400 })
  if (!rotator && !whatsapp_number) return NextResponse.json({ error: 'whatsapp_number é obrigatório' }, { status: 400 })
  if (rotator && (!Array.isArray(vendors) || vendors.length < 2))
    return NextResponse.json({ error: 'O rotator exige pelo menos 2 vendedores' }, { status: 400 })
  if (rotator) {
    const total = (vendors as { weight: number }[]).reduce((s, v) => s + Number(v.weight || 0), 0)
    if (total !== 100) return NextResponse.json({ error: `A soma dos percentuais deve ser 100% (atual: ${total}%)` }, { status: 400 })
  }

  const { error } = await supabase.from('wa_links').insert({
    lid,
    description: description?.trim() || '',
    initial_message,
    rotator: !!rotator,
    whatsapp_number: rotator ? null : whatsapp_number,
    vendors: rotator ? vendors : null,
    redirect_url: null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lid }, { status: 201 })
}
