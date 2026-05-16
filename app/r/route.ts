import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const lid = request.nextUrl.searchParams.get('lid')
  if (!lid) return new Response('Link inválido', { status: 400 })

  const { data, error } = await supabase
    .from('wa_links')
    .select('lid')
    .eq('lid', lid)
    .single()

  if (error || !data) return new Response('Link não encontrado', { status: 404 })

  const origin = request.nextUrl.origin

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Redirecionando...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
.ring{width:40px;height:40px;border:3px solid #222;border-top-color:#25D366;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
p{color:#6b7280;font-size:14px}
</style>
</head>
<body>
<div class="ring"></div>
<p>Conectando você a um especialista...</p>
<p style="font-size:12px;margin-top:-8px;max-width:280px;text-align:center">Em instantes, alguém da nossa equipe vai te atender com atenção prioritária.</p>
<script>
(async function() {
  var lid = new URLSearchParams(location.search).get('lid');
  try {
    var r = await fetch('${origin}/api/wa-links/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lid: lid }),
    });
    if (!r.ok) throw new Error();
    var data = await r.json();
    var waUrl = 'https://wa.me/' + data.vendor_number + '?text=' + encodeURIComponent(data.initial_message);
    setTimeout(function() { location.href = waUrl; }, 300);
  } catch(e) {
    document.querySelector('p').textContent = 'Erro ao redirecionar. Tente novamente.';
  }
})();
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
