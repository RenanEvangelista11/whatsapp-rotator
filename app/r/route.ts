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
<p id="msg">Conectando você a um especialista...</p>
<p id="msg2" style="font-size:12px;margin-top:-8px;max-width:280px;text-align:center">Em instantes, alguém da nossa equipe vai te atender com atenção prioritária.</p>

<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
</script>

<script>
(async function() {
  var lid = new URLSearchParams(location.search).get('lid');

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  function resolveUtmSource(p) {
    if (p.get('utm_source')) return p.get('utm_source');
    if (document.referrer) {
      try { return new URL(document.referrer).hostname; } catch(e) {}
    }
    return 'direto';
  }

  var p       = new URLSearchParams(location.search);
  var fbclid  = p.get('fbclid') || '';
  var gclid   = p.get('gclid')  || '';
  var fbp     = getCookie('_fbp') || '';
  var fbc     = getCookie('_fbc') || (fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : '');

  var fingerprint = (navigator.userAgent + screen.width + screen.height + navigator.language + Intl.DateTimeFormat().resolvedOptions().timeZone);
  var external_id = '';
  try {
    var enc = new TextEncoder().encode(fingerprint);
    var hashBuf = await crypto.subtle.digest('SHA-256', enc);
    external_id = Array.from(new Uint8Array(hashBuf)).map(function(b){return b.toString(16).padStart(2,'0')}).join('');
  } catch(e) {}

  var payload = {
    lid:          lid,
    utm_source:   p.get('utm_source')   || getCookie('cookieUtmSource')   || resolveUtmSource(p),
    utm_medium:   p.get('utm_medium')   || getCookie('cookieUtmMedium')   || '',
    utm_campaign: p.get('utm_campaign') || getCookie('cookieUtmCampaign') || '',
    utm_content:  p.get('utm_content')  || getCookie('cookieUtmContent')  || '',
    utm_term:     p.get('utm_term')     || getCookie('cookieUtmTerm')     || '',
    utm_id:       p.get('utm_id')       || '',
    sck:    p.get('sck')    || '',
    src:    p.get('src')    || '',
    fbclid: fbclid,
    gclid:  gclid,
    fbp:    fbp,
    fbc:    fbc,
    external_id: external_id,
  };

  try {
    var r = await fetch('${origin}/api/wa-links/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) throw new Error('session_error');
    var data = await r.json();

    if (data.pixel_id) {
      fbq('init', data.pixel_id);
      fbq('track', 'PageView');
    }

    var waUrl = 'https://wa.me/' + data.vendor_number + '?text=' + encodeURIComponent(data.initial_message);
    setTimeout(function() { location.href = waUrl; }, 300);
  } catch(e) {
    console.error('[WA Redirect]', e);
    document.getElementById('msg').textContent = 'Erro ao redirecionar. Tente novamente.';
    document.getElementById('msg2').style.display = 'none';
  }
})();
</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
