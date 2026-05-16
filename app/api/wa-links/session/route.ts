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
  const body = await req.json()
  const {
    lid,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id,
    sck, src, fbclid, gclid, fbp, fbc, external_id,
  } = body ?? {}

  if (!lid) return NextResponse.json({ error: 'lid é obrigatório' }, { status: 400 })

  const { data: link, error: linkErr } = await supabase
    .from('wa_links')
    .select('*')
    .eq('lid', lid)
    .single()

  if (linkErr || !link) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })

  const ip_address = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || ''
  const user_agent = req.headers.get('user-agent') || ''

  let vendor_name: string | null = null
  let vendor_number: string | null = null

  if (link.rotator && Array.isArray(link.vendors) && link.vendors.length) {
    const picked = pickVendor(link.vendors as Vendor[])
    vendor_name = picked.name
    vendor_number = picked.number
  } else {
    vendor_number = link.whatsapp_number
  }

  const event_id = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  await supabase.from('wa_tracking_sessions').insert({
    event_id,
    link_id: link.id,
    vendor_name,
    vendor_number,
    utm_source:   utm_source   || null,
    utm_medium:   utm_medium   || null,
    utm_campaign: utm_campaign || null,
    utm_content:  utm_content  || null,
    utm_term:     utm_term     || null,
    utm_id:       utm_id       || null,
    sck:          sck          || null,
    src:          src          || null,
    fbclid:       fbclid       || null,
    gclid:        gclid        || null,
    fbp:          fbp          || null,
    fbc:          fbc          || null,
    external_id:  external_id  || null,
    ip_address,
    user_agent,
  })

  return NextResponse.json({
    event_id,
    vendor_number,
    vendor_name,
    pixel_id:        link.pixel_id,
    initial_message: link.initial_message,
  })
}
