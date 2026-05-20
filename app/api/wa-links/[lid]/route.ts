import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ lid: string }> }
) {
  const { lid } = await params
  const body = await req.json()
  const { description, initial_message, rotator, whatsapp_number, vendors, redirect_url } = body ?? {}

  // Modo redirect simples
  if (redirect_url) {
    const { data, error } = await supabase
      .from('wa_links')
      .update({
        description: description?.trim() || '',
        redirect_url: redirect_url.trim(),
        initial_message: '',
        rotator: false,
        whatsapp_number: null,
        vendors: null,
      })
      .eq('lid', lid)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
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

  const { data, error } = await supabase
    .from('wa_links')
    .update({
      description: description?.trim() || '',
      initial_message,
      rotator: !!rotator,
      whatsapp_number: rotator ? null : whatsapp_number,
      vendors: rotator ? vendors : null,
      redirect_url: null,
    })
    .eq('lid', lid)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ lid: string }> }
) {
  const { lid } = await params
  const { error } = await supabase.from('wa_links').delete().eq('lid', lid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
