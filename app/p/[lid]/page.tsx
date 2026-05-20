import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default async function LandingPage({ params }: { params: Promise<{ lid: string }> }) {
  const { lid } = await params

  const { data: link, error } = await supabase
    .from('wa_links')
    .select('lid, landing, landing_config')
    .eq('lid', lid)
    .single()

  if (error || !link || !link.landing) return notFound()

  const cfg = (link.landing_config ?? {}) as {
    title?: string
    subtitle?: string
    button_text?: string
    button_color?: string
    bg?: string
  }

  const title       = cfg.title       || 'Fale com a nossa equipe'
  const subtitle    = cfg.subtitle    || 'Clique no botão abaixo para iniciar uma conversa com um especialista.'
  const buttonText  = cfg.button_text || 'Falar agora no WhatsApp'
  const buttonColor = cfg.button_color || '#25D366'
  const bg          = cfg.bg          || '#0a0a0a'
  const isDark      = isDarkColor(bg)
  const textColor   = isDark ? '#ffffff' : '#111111'
  const subColor    = isDark ? '#9ca3af' : '#4b5563'

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: ${bg};
            color: ${textColor};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .card {
            max-width: 480px;
            width: 100%;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          h1 {
            font-size: clamp(1.5rem, 5vw, 2.25rem);
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: -0.02em;
          }
          p {
            font-size: 1rem;
            color: ${subColor};
            line-height: 1.6;
            max-width: 380px;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 16px 32px;
            background: ${buttonColor};
            color: #fff;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 9999px;
            text-decoration: none;
            margin-top: 8px;
            transition: opacity 0.15s;
            box-shadow: 0 4px 24px ${buttonColor}55;
          }
          .btn:hover { opacity: 0.88; }
          .btn svg { flex-shrink: 0; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <a href={`/r?lid=${lid}`} className="btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.103 1.508 5.832L.057 23.428a.5.5 0 0 0 .609.61l5.73-1.498A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.826 9.826 0 0 1-5.034-1.383l-.36-.214-3.733.976.999-3.642-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
            </svg>
            {buttonText}
          </a>
        </div>
      </body>
    </html>
  )
}

function isDarkColor(hex: string): boolean {
  const color = hex.replace('#', '')
  if (color.length !== 6) return true
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}
