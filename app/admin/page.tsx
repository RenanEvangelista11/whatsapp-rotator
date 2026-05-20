'use client'

import { useState, useEffect, useCallback } from 'react'

type Vendor = { name: string; number: string; weight: number }
type LandingConfig = { title: string; subtitle: string; button_text: string; button_color: string; bg: string }
type WaLink = {
  id: string; lid: string; description: string; initial_message: string | null
  rotator: boolean; whatsapp_number: string | null; vendors: Vendor[] | null
  redirect_url: string | null; landing: boolean; landing_config: LandingConfig | null
  created_at: string
}

type Mode = 'single' | 'rotator' | 'redirect' | 'landing'

type FormState = {
  description: string; initial_message: string; whatsapp_number: string
  rotator: boolean; mode: Mode; redirect_url: string; vendors: Vendor[]
  landing_rotator: boolean
  lp: LandingConfig
}

const DEFAULT_LP: LandingConfig = {
  title: 'Fale com a nossa equipe',
  subtitle: 'Clique no botão abaixo para iniciar uma conversa com um especialista.',
  button_text: 'Falar agora no WhatsApp',
  button_color: '#25D366',
  bg: '#0a0a0a',
}

const EMPTY_FORM: FormState = {
  description: '', initial_message: '', whatsapp_number: '',
  rotator: false, mode: 'single', redirect_url: '',
  landing_rotator: false,
  vendors: [{ name: '', number: '', weight: 50 }, { name: '', number: '', weight: 50 }],
  lp: { ...DEFAULT_LP },
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 13)
  if (!d) return ''
  let o = '+' + d.slice(0, 2)
  if (d.length > 2) o += ' (' + d.slice(2, 4)
  if (d.length > 4) o += ') ' + d.slice(4, 9)
  if (d.length > 9) o += '-' + d.slice(9, 13)
  return o
}
function cleanPhone(v: string) { return v.replace(/\D/g, '') }
function isValidPhone(v: string) { const d = cleanPhone(v); return d.length >= 12 && d.length <= 13 }

function linkToForm(link: WaLink): FormState {
  if (link.redirect_url) return { ...EMPTY_FORM, description: link.description ?? '', mode: 'redirect', redirect_url: link.redirect_url }
  if (link.landing) {
    const cfg = link.landing_config ?? DEFAULT_LP
    return {
      ...EMPTY_FORM,
      description: link.description ?? '',
      mode: 'landing',
      initial_message: link.initial_message ?? '',
      landing_rotator: link.rotator,
      whatsapp_number: link.whatsapp_number ? maskPhone(link.whatsapp_number) : '',
      vendors: link.vendors?.length
        ? link.vendors.map(v => ({ ...v, number: maskPhone(v.number) }))
        : [{ name: '', number: '', weight: 50 }, { name: '', number: '', weight: 50 }],
      lp: { title: cfg.title ?? DEFAULT_LP.title, subtitle: cfg.subtitle ?? DEFAULT_LP.subtitle, button_text: cfg.button_text ?? DEFAULT_LP.button_text, button_color: cfg.button_color ?? DEFAULT_LP.button_color, bg: cfg.bg ?? DEFAULT_LP.bg },
    }
  }
  return {
    ...EMPTY_FORM,
    description: link.description ?? '',
    initial_message: link.initial_message ?? '',
    whatsapp_number: link.whatsapp_number ? maskPhone(link.whatsapp_number) : '',
    rotator: link.rotator,
    mode: link.rotator ? 'rotator' : 'single',
    vendors: link.vendors?.length
      ? link.vendors.map(v => ({ ...v, number: maskPhone(v.number) }))
      : [{ name: '', number: '', weight: 50 }, { name: '', number: '', weight: 50 }],
  }
}

export default function AdminPage() {
  const [links, setLinks] = useState<WaLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLid, setEditingLid] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const loadLinks = useCallback(async () => {
    setLoading(true)
    try { const d = await fetch('/api/wa-links').then(r => r.json()); setLinks(Array.isArray(d) ? d : []) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadLinks() }, [loadLinks])

  async function copyLink(lid: string, page = false) {
    const url = page ? `${baseUrl}/p/${lid}` : `${baseUrl}/r?lid=${lid}`
    await navigator.clipboard.writeText(url)
    setCopied(page ? `p-${lid}` : lid)
    setTimeout(() => setCopied(''), 2000)
  }

  async function handleDelete(lid: string) {
    if (!confirm('Excluir este link?')) return
    await fetch(`/api/wa-links/${lid}`, { method: 'DELETE' })
    setLinks(prev => prev.filter(l => l.lid !== lid))
  }

  function sf<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  function setLp(key: keyof LandingConfig, value: string) {
    setForm(prev => ({ ...prev, lp: { ...prev.lp, [key]: value } }))
  }
  function setMode(mode: Mode) {
    setForm(prev => ({ ...prev, mode, rotator: mode === 'rotator' }))
  }
  function setVendor(i: number, key: string, value: unknown) {
    setForm(prev => { const v = [...prev.vendors]; v[i] = { ...v[i], [key]: value }; return { ...prev, vendors: v } })
  }
  function addVendor() { setForm(prev => ({ ...prev, vendors: [...prev.vendors, { name: '', number: '', weight: 0 }] })) }
  function removeVendor(i: number) { setForm(prev => ({ ...prev, vendors: prev.vendors.filter((_, j) => j !== i) })) }

  const vendorSum = form.vendors.reduce((s, v) => s + Number(v.weight || 0), 0)

  function validateWa(useRotator: boolean): string {
    if (!form.initial_message.trim()) return 'Informe a mensagem inicial'
    if (!useRotator) {
      if (!isValidPhone(form.whatsapp_number)) return 'Número de WhatsApp inválido. Use +55 (11) 99999-9999'
    } else {
      if (form.vendors.length < 2) return 'Adicione pelo menos 2 vendedores'
      for (const v of form.vendors) {
        if (!v.name.trim()) return `Informe o nome de todos os vendedores`
        if (!isValidPhone(v.number)) return `Número inválido para "${v.name}"`
      }
      if (vendorSum !== 100) return `A soma dos percentuais deve ser 100% (atual: ${vendorSum}%)`
    }
    return ''
  }

  function validate(): string {
    if (form.mode === 'redirect') {
      if (!form.redirect_url.trim()) return 'Informe a URL de destino'
      try { new URL(form.redirect_url.trim()) } catch { return 'URL inválida. Inclua http:// ou https://' }
      return ''
    }
    if (form.mode === 'landing') {
      if (!form.lp.title.trim()) return 'Informe o título da landing page'
      return validateWa(form.landing_rotator)
    }
    return validateWa(form.mode === 'rotator')
  }

  function buildBody() {
    const desc = form.description.trim()
    if (form.mode === 'redirect') return { description: desc, redirect_url: form.redirect_url.trim() }

    const waPayload = {
      initial_message: form.initial_message.trim(),
      rotator: form.mode === 'rotator' || (form.mode === 'landing' && form.landing_rotator),
      whatsapp_number: (form.mode === 'single' || (form.mode === 'landing' && !form.landing_rotator))
        ? cleanPhone(form.whatsapp_number) : null,
      vendors: (form.mode === 'rotator' || (form.mode === 'landing' && form.landing_rotator))
        ? form.vendors.map(v => ({ name: v.name.trim(), number: cleanPhone(v.number), weight: Number(v.weight) }))
        : null,
    }

    if (form.mode === 'landing') {
      return { description: desc, ...waPayload, landing: true, landing_config: form.lp }
    }
    return { description: desc, ...waPayload, landing: false }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ve = validate(); if (ve) { setError(ve); return }
    setSaving(true); setError('')
    try {
      const isEdit = !!editingLid
      const res = await fetch(isEdit ? `/api/wa-links/${editingLid}` : '/api/wa-links', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false); await loadLinks()
      if (!isEdit) {
        const isLanding = form.mode === 'landing'
        setTimeout(() => copyLink(data.lid, isLanding), 200)
      }
    } catch { setError('Erro ao salvar. Tente novamente.') }
    finally { setSaving(false) }
  }

  function openCreate() { setEditingLid(null); setForm(EMPTY_FORM); setError(''); setShowModal(true) }
  function openEdit(link: WaLink) { setEditingLid(link.lid); setForm(linkToForm(link)); setError(''); setShowModal(true) }

  const isEditing = !!editingLid
  const showWaFields = form.mode === 'single' || form.mode === 'rotator' || form.mode === 'landing'
  const useRotator = form.mode === 'rotator' || (form.mode === 'landing' && form.landing_rotator)

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-green-400 text-lg">⧉</span>
          <h1 className="text-zinc-100 font-semibold text-lg">Links WhatsApp</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadLinks} className="p-2 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors" title="Atualizar">↻</button>
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-md transition-colors">+ Novo Link</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Carregando...</div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <p className="text-zinc-400 font-medium">Nenhum link criado ainda</p>
            <button onClick={openCreate} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-md transition-colors">+ Criar primeiro link</button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {links.map(link => (
              <LinkCard key={link.lid} link={link} copied={copied} baseUrl={baseUrl} onCopy={copyLink} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
              <h2 className="text-zinc-100 font-semibold text-sm">{isEditing ? 'Editar Link' : 'Novo Link'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Modo */}
              <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-1 rounded-lg">
                {([
                  { key: 'single',   label: 'WhatsApp' },
                  { key: 'rotator',  label: 'Rotator' },
                  { key: 'redirect', label: 'Redirect' },
                  { key: 'landing',  label: 'Landing' },
                ] as { key: Mode; label: string }[]).map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setMode(key)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${form.mode === key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Descrição</label>
                <input type="text" value={form.description} onChange={e => sf('description', e.target.value)}
                  placeholder="Ex: Anúncio Instagram — Produto X"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors" />
                <p className="text-xs text-zinc-600">Onde este link está sendo usado (só você vê)</p>
              </div>

              {/* Redirect */}
              {form.mode === 'redirect' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">URL de destino</label>
                  <input type="url" value={form.redirect_url} onChange={e => sf('redirect_url', e.target.value)}
                    placeholder="https://seusite.com/pagina"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors" />
                </div>
              )}

              {/* Landing Page config */}
              {form.mode === 'landing' && (
                <div className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Aparência da landing page</p>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500">Título</label>
                    <input type="text" value={form.lp.title} onChange={e => setLp('title', e.target.value)}
                      placeholder="Fale com a nossa equipe"
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500">Subtítulo</label>
                    <textarea value={form.lp.subtitle} onChange={e => setLp('subtitle', e.target.value)}
                      placeholder="Clique no botão para falar com um especialista."
                      rows={2}
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500">Texto do botão</label>
                    <input type="text" value={form.lp.button_text} onChange={e => setLp('button_text', e.target.value)}
                      placeholder="Falar agora no WhatsApp"
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">Cor do botão</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.lp.button_color} onChange={e => setLp('button_color', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-zinc-700 bg-transparent" />
                        <span className="text-xs text-zinc-400 font-mono">{form.lp.button_color}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">Cor de fundo</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.lp.bg} onChange={e => setLp('bg', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-zinc-700 bg-transparent" />
                        <span className="text-xs text-zinc-400 font-mono">{form.lp.bg}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rotator dentro da landing */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <div>
                      <p className="text-sm text-zinc-200 font-medium">Rotator de vendedores</p>
                      <p className="text-xs text-zinc-500">Distribui o botão entre múltiplos números</p>
                    </div>
                    <button type="button" onClick={() => sf('landing_rotator', !form.landing_rotator)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${form.landing_rotator ? 'bg-green-600' : 'bg-zinc-700'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.landing_rotator ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Campos WhatsApp */}
              {showWaFields && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Mensagem inicial</label>
                    <textarea value={form.initial_message} onChange={e => sf('initial_message', e.target.value)}
                      placeholder="Olá, vim pelo anúncio e gostaria de saber mais!"
                      rows={3} maxLength={200}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors resize-none" />
                    <p className="text-xs text-zinc-600 text-right">{form.initial_message.length}/200</p>
                  </div>

                  {!useRotator && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Número WhatsApp</label>
                      <input type="tel" value={form.whatsapp_number} onChange={e => sf('whatsapp_number', maskPhone(e.target.value))}
                        placeholder="+55 (11) 99999-9999"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors" />
                    </div>
                  )}

                  {useRotator && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Vendedores</label>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vendorSum === 100 ? 'bg-green-950 text-green-400' : 'bg-amber-950 text-amber-400'}`}>{vendorSum}% / 100%</span>
                      </div>
                      {form.vendors.map((v, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Vendedor {i + 1}</span>
                            {form.vendors.length > 2 && <button type="button" onClick={() => removeVendor(i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={v.name} onChange={e => setVendor(i, 'name', e.target.value)} placeholder="Nome"
                              className="bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500" />
                            <div className="flex gap-2 items-center">
                              <input type="number" value={v.weight} onChange={e => setVendor(i, 'weight', e.target.value)} min={1} max={100} placeholder="%"
                                className="w-16 bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 text-center" />
                              <span className="text-zinc-500 text-sm">%</span>
                            </div>
                          </div>
                          <input type="tel" value={v.number} onChange={e => setVendor(i, 'number', maskPhone(e.target.value))} placeholder="+55 (11) 99999-9999"
                            className="w-full bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500" />
                        </div>
                      ))}
                      <button type="button" onClick={addVendor}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-green-600 text-sm transition-colors">
                        + Adicionar vendedor
                      </button>
                    </div>
                  )}
                </>
              )}

              {error && <div className="bg-red-950 border border-red-800 rounded-md px-3 py-2 text-sm text-red-400">{error}</div>}

              <div className="flex gap-2 pt-1 border-t border-zinc-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-md font-medium transition-colors">
                  {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Gerar Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function LinkCard({ link, copied, baseUrl, onCopy, onEdit, onDelete }: {
  link: WaLink; copied: string; baseUrl: string
  onCopy: (lid: string, page?: boolean) => void
  onEdit: (link: WaLink) => void
  onDelete: (lid: string) => void
}) {
  const redirectUrl = `${baseUrl}/r?lid=${link.lid}`
  const landingUrl  = `${baseUrl}/p/${link.lid}`

  const badge = link.landing
    ? { label: 'Landing', color: 'bg-purple-950 text-purple-400 border-purple-900' }
    : link.redirect_url
    ? { label: 'Redirect', color: 'bg-blue-950 text-blue-400 border-blue-900' }
    : link.rotator
    ? { label: 'Rotator', color: 'bg-green-950 text-green-400 border-green-900' }
    : { label: 'WhatsApp', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' }

  const date = new Date(link.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {link.description && <p className="text-xs text-zinc-400 font-medium">{link.description}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
            {link.landing && link.landing_config?.title && (
              <span className="text-xs text-zinc-500">"{link.landing_config.title}"</span>
            )}
            {link.redirect_url && <span className="text-xs text-zinc-500 truncate max-w-xs">{link.redirect_url}</span>}
            {!link.landing && !link.redirect_url && link.rotator && (link.vendors ?? []).map((v, i) => (
              <span key={i} className="text-xs text-zinc-500">{v.name} ({v.weight}%)</span>
            ))}
            {!link.landing && !link.redirect_url && !link.rotator && (
              <span className="text-xs text-zinc-500 font-mono">+{link.whatsapp_number}</span>
            )}
            <span className="text-xs text-zinc-700">· {date}</span>
          </div>

          {/* Landing: mostra a URL da landing (para Meta Ads) */}
          {link.landing && (
            <div className="space-y-1">
              <p className="text-xs text-purple-400 font-medium">URL para Meta Ads:</p>
              <div className="flex items-center gap-2 bg-black rounded-md px-2.5 py-1.5 border border-purple-900/40">
                <span className="text-xs text-zinc-400 font-mono truncate flex-1">{landingUrl}</span>
                <a href={landingUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-purple-400 transition-colors text-xs">↗</a>
              </div>
            </div>
          )}

          {/* URL do redirect (sempre visível) */}
          {!link.landing && (
            <div className="flex items-center gap-2 bg-black rounded-md px-2.5 py-1.5 border border-zinc-800">
              <span className="text-xs text-zinc-500 font-mono truncate flex-1">{redirectUrl}</span>
              <a href={redirectUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-green-400 transition-colors text-xs">↗</a>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {link.landing ? (
            <button
              onClick={() => onCopy(link.lid, true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                copied === `p-${link.lid}` ? 'bg-purple-950 text-purple-400 border-purple-800' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
            >
              {copied === `p-${link.lid}` ? '✓ Copiado!' : '⎘ Copiar'}
            </button>
          ) : (
            <button
              onClick={() => onCopy(link.lid)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                copied === link.lid ? 'bg-green-950 text-green-400 border-green-800' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
            >
              {copied === link.lid ? '✓ Copiado!' : '⎘ Copiar'}
            </button>
          )}
          <button onClick={() => onEdit(link)} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-xs" title="Editar">✎</button>
          <button onClick={() => onDelete(link.lid)} className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-950 transition-colors" title="Excluir">🗑</button>
        </div>
      </div>
    </div>
  )
}
