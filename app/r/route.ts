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

  // Redirect simples — 302 direto, sem WhatsApp
  if (link.redirect_url) {
    return NextResponse.redirect(link.redirect_url, { status: 302 })
  }

  // WhatsApp: escolhe o número aqui no servidor mas entrega via JS
  // O bot do Meta vê HTML normal, nunca vê wa.me na URL
  let number: string = link.whatsapp_number ?? ''
  if (link.rotator && Array.isArray(link.vendors) && link.vendors.length) {
    number = pickVendor(link.vendors as Vendor[]).number
  }

  const msg = encodeURIComponent(link.initial_message ?? '')

  // Divide a URL em partes para dificultar detecção por bots que leem o HTML estático
  const part1 = 'https://api.'
  const part2 = 'whatsapp'
  const part3 = `.com/send?phone=${number}&text=${msg}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Aguarde...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
.ring{width:40px;height:40px;border:3px solid #222;border-top-color:#25D366;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
p{color:#6b7280;font-size:14px;text-align:center;max-width:280px}
</style>
</head>
<body>
<div class="ring"></div>
<p>Conectando você a um especialista...</p>
<p style="font-size:12px">Em instantes alguém da nossa equipe vai te atender.</p>
<script>
setTimeout(function(){
  var u = '${part1}' + '${part2}' + '${part3}';
  window.location.href = u;
}, 300);
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
