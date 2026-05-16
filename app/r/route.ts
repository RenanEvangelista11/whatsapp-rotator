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

export async function GET(request: NextRequest) {
  const lid = request.nextUrl.searchParams.get('lid')
  if (!lid) return new Response('Link inválido', { status: 400 })

  const { data: link, error } = await supabase
    .from('wa_links')
    .select('*')
    .eq('lid', lid)
    .single()

  if (error || !link) return new Response('Link não encontrado', { status: 404 })

  let number: string = link.whatsapp_number ?? ''

  if (link.rotator && Array.isArray(link.vendors) && link.vendors.length) {
    number = pickVendor(link.vendors as Vendor[]).number
  }

  const waUrl = `https://wa.me/${number}?text=${encodeURIComponent(link.initial_message)}`

  return NextResponse.redirect(waUrl, { status: 302 })
}
