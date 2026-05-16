import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Busca o link pelo slug
  const { data: link, error: linkError } = await supabase
    .from('links')
    .select('*')
    .eq('slug', slug)
    .single()

  if (linkError || !link) {
    return new NextResponse('Link não encontrado', { status: 404 })
  }

  // Busca os vendedores ativos deste link com seus percentuais
  const { data: linkSellers, error: sellersError } = await supabase
    .from('link_sellers')
    .select('*, sellers(*)')
    .eq('link_id', link.id)
    .eq('sellers.ativo', true)

  const ativos = (linkSellers ?? []).filter((ls) => ls.sellers?.ativo === true)

  if (sellersError || ativos.length === 0) {
    return new NextResponse('Nenhum vendedor disponível', { status: 503 })
  }

  // Algoritmo de rotação por % precisa:
  // Escolhe o vendedor com maior déficit (cliques esperados - cliques recebidos)
  const totalCliquesLink = link.total_cliques || 0
  let escolhido = ativos[0]
  let maiorDeficit = -Infinity

  for (const ls of ativos) {
    const esperado = totalCliquesLink * (ls.percentual / 100)
    const deficit = esperado - ls.total_cliques
    if (deficit > maiorDeficit) {
      maiorDeficit = deficit
      escolhido = ls
    }
  }

  // Se todos zerados (primeiro clique), escolhe o de maior %
  if (totalCliquesLink === 0) {
    escolhido = ativos.reduce((prev, cur) =>
      cur.percentual > prev.percentual ? cur : prev
    )
  }

  const seller = escolhido.sellers

  // Atualiza contadores em paralelo
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? ''

  await Promise.all([
    supabase
      .from('link_sellers')
      .update({ total_cliques: escolhido.total_cliques + 1 })
      .eq('id', escolhido.id),
    supabase
      .from('links')
      .update({ total_cliques: totalCliquesLink + 1 })
      .eq('id', link.id),
    supabase.from('clicks').insert({
      link_id: link.id,
      seller_id: seller.id,
      ip,
    }),
  ])

  // Monta URL do WhatsApp
  const numero = seller.whatsapp.replace(/\D/g, '')
  const mensagem = encodeURIComponent(link.mensagem || 'Olá!')
  const waUrl = `https://wa.me/${numero}?text=${mensagem}`

  return NextResponse.redirect(waUrl, { status: 302 })
}
