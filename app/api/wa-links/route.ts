import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function GET() {
  const { data, error } = await supabase
    .from('wa_links')
    .select('id, lid, description, initial_message, rotator, whatsapp_number, vendors, redirect_url, landing, landing_config, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { description, initial_message, rotator, whatsapp_number, vendors, redirect_url, landing, landing_config } = body ?? {}
  const lid = randomUUID().replace(/-/g, '').slice(0, 12)

  if (redirect_url) {
    const { error } = await supabase.from('wa_links').insert({ lid, description: description?.trim() || '', redirect_url: redirect_url.trim(), initial_message: '', rotator: false, landing: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lid }, { status: 201 })
  }

  const err = validateWa({ initial_message, rotator, whatsapp_number, vendors })
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const { error } = await supabase.from('wa_links').insert({
    lid,
    description: description?.trim() || '',
    initial_message,
    rotator: !!rotator,
    whatsapp_number: rotator ? null : whatsapp_number,
    vendors: rotator ? vendors : null,
    redirect_url: null,
    landing: !!landing,
    landing_config: landing ? (landing_config ?? null) : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lid }, { status: 201 })
}

function validateWa({ initial_message, rotator, whatsapp_number, vendors }: Record<string, unknown>) {
  if (!initial_message) return 'Informe a mensagem inicial'
  if (!rotator && !whatsapp_number) return 'whatsapp_number é obrigatório'
  if (rotator && (!Array.isArray(vendors) || (vendors as unknown[]).length < 2)) return 'O rotator exige pelo menos 2 vendedores'
  if (rotator) {
    const total = (vendors as { weight: number }[]).reduce((s, v) => s + Number(v.weight || 0), 0)
    if (total !== 100) return `A soma dos percentuais deve ser 100% (atual: ${total}%)`
  }
  return null
}
