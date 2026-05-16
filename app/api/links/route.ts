import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('links')
    .select('*, link_sellers(*, sellers(*))')
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, mensagem } = body

  if (!slug) {
    return NextResponse.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  const slugLimpo = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const { data, error } = await supabase
    .from('links')
    .insert({ slug: slugLimpo, mensagem: mensagem || 'Olá! Vim pelo link.' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
