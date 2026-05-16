import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { link_id, seller_id, percentual } = body

  if (!link_id || !seller_id || percentual === undefined) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Verifica se a soma dos percentuais não ultrapassa 100
  const { data: existentes } = await supabase
    .from('link_sellers')
    .select('percentual')
    .eq('link_id', link_id)
    .neq('seller_id', seller_id)

  const somaAtual = (existentes ?? []).reduce((acc, ls) => acc + ls.percentual, 0)
  if (somaAtual + percentual > 100) {
    return NextResponse.json(
      { error: `Percentual total seria ${somaAtual + percentual}%. Máximo é 100%.` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('link_sellers')
    .upsert({ link_id, seller_id, percentual }, { onConflict: 'link_id,seller_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { link_id, seller_id } = await req.json()

  const { error } = await supabase
    .from('link_sellers')
    .delete()
    .eq('link_id', link_id)
    .eq('seller_id', seller_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
