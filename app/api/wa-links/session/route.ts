import { NextRequest, NextResponse } from 'next/server'
import { supabase, Vendor } from '@/lib/supabase'

function pickVendor(vendors: Vendor[]): Vendor {
  const rand = Math.random() * 100
  let cumulative = 0
  for (const v of vendors) {
    cumulative += v.weight
    if (rand < cumulative) return v
  }
  return vendors[vendors.length - 1]
}

export async function POST(req: NextRequest) {
  const { lid } = await req.json()

  if (!lid) return NextResponse.json({ error: 'lid é obrigatório' }, { status: 400 })

  const { data: link, error } = await supabase
    .from('wa_links')
    .select('*')
    .eq('lid', lid)
    .single()

  if (error || !link) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })

  let vendor_number: string | null = null

  if (link.rotator && Array.isArray(link.vendors) && link.vendors.length) {
    vendor_number = pickVendor(link.vendors as Vendor[]).number
  } else {
    vendor_number = link.whatsapp_number
  }

  return NextResponse.json({
    vendor_number,
    initial_message: link.initial_message,
  })
}
