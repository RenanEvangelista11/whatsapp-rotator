'use client'

import { useState, useEffect, useCallback } from 'react'

type Vendor = { name: string; number: string; weight: number }
type WaLink = {
  id: string
  lid: string
  description: string
  initial_message: string | null
  rotator: boolean
  whatsapp_number: string | null
  vendors: Vendor[] | null
  redirect_url: string | null
  created_at: string
}

type Mode = 'single' | 'rotator' | 'redirect'

type FormState = {
  description: string
  initial_message: string
  whatsapp_number: string
  rotator: boolean
  mode: Mode
  redirect_url: string
  vendors: Vendor[]
}

const EMPTY_FORM: FormState = {
  description: '',
  initial_message: '',
  whatsapp_number: '',
  rotator: false,
  mode: 'single',
  redirect_url: '',
  vendors: [
    { name: '', number: '', weight: 50 },
    { name: '', number: '', weight: 50 },
  ],
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (!digits) return ''
  let out = '+' + digits.slice(0, 2)
  if (digits.length > 2) out += ' (' + digits.slice(2, 4)
  if (digits.length > 4) out += ') ' + digits.slice(4, 9)
  if (digits.length > 9) out += '-' + digits.slice(9, 13)
  return out
}

function cleanPhone(masked: string) { return masked.replace(/\D/g, '') }

function isValidPhone(masked: string) {
  const digits = cleanPhone(masked)
  return digits.length >= 12 && digits.length <= 13
}

function linkToForm(link: WaLink): FormState {
  if (link.redirect_url) {
    return { ...EMPTY_FORM, description: link.description ?? '', mode: 'redirect', redirect_url: link.redirect_url }
  }
  return {
    description:     link.description ?? '',
    initial_message: link.initial_message ?? '',
    whatsapp_number: link.whatsapp_number ? maskPhone(link.whatsapp_number) : '',
    rotator:         link.rotator,
    mode:            link.rotator ? 'rotator' : 'single',
    redirect_url:    '',
    vendors:         link.vendors?.length
      ? link.vendors.map((v) => ({ ...v, number: maskPhone(v.number) }))
      : [{ name: '', number: '', weight: 50 }, { name: '', number: '', weight: 50 }],
  }
}

export default function AdminPage() {
  const [links, setLinks]           = useState<WaLink[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editingLid, setEditingLid] = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState('')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const loadLinks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/wa-links').then((r) => r.json())
      setLinks(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLinks() }, [loadLinks])

  async function copyLink(lid: string) {
    await navigator.clipboard.writeText(`${baseUrl}/r?lid=${lid}`)
    setCopied(lid)
    setTimeout(() => setCopied(''), 2000)
  }

  async function handleDelete(lid: string) {
    if (!confirm('Excluir este link?')) return
    await fetch(`/api/wa-links/${lid}`, { method: 'DELETE' })
    setLinks((prev) => prev.filter((l) => l.lid !== lid))
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setMode(mode: Mode) {
    setForm((prev) => ({ ...prev, mode, rotator: mode === 'rotator' }))
  }

  function setVendor(index: number, key: string, value: unknown) {
    setForm((prev) => {
      const vendors = [...prev.vendors]
      vendors[index] = { ...vendors[index], [key]: value }
      return { ...prev, vendors }
    })
  }

  function addVendor() {
    setForm((prev) => ({ ...prev, vendors: [...prev.vendors, { name: '', number: '', weight: 0 }] }))
  }

  function removeVendor(index: number) {
    setForm((prev) => ({ ...prev, vendors: prev.vendors.filter((_, i) => i !== index) }))
  }

  const vendorSum = form.vendors.reduce((s, v) => s + Number(v.weight || 0), 0)

  function validate(): string {
    if (form.mode === 'redirect') {
      if (!form.redirect_url.trim()) return 'Informe a URL de destino'
      try { new URL(form.redirect_url.trim()) } catch { return 'URL inválida. Inclua http:// ou https://' }
      return ''
    }
    if (!form.initial_message.trim()) return 'Informe a mensagem inicial'
    if (form.mode === 'single') {
      if (!isValidPhone(form.whatsapp_number)) return 'Número de WhatsApp inválido. Use +55 (11) 99999-9999'
    } else {
      if (form.vendors.length < 2) return 'Adicione pelo menos 2 vendedores'
      for (const v of form.vendors) {
        if (!v.name.trim()) return 'Informe o nome de todos os vendedores'
        if (!isValidPhone(v.number)) return `Número inválido para "${v.name}"`
      }
      if (vendorSum !== 100) return `A soma dos percentuais deve ser 100% (atual: ${vendorSum}%)`
    }
    return ''
  }

  function buildBody() {
    if (form.mode === 'redirect') {
      return { description: form.description.trim(), redirect_url: form.redirect_url.trim() }
    }
    return {
      description:     form.description.trim(),
      initial_message: form.initial_message.trim(),
      rotator:         form.mode === 'rotator',
      whatsapp_number: form.mode === 'single' ? cleanPhone(form.whatsapp_number) : null,
      vendors: form.mode === 'rotator'
        ? form.vendors.map((v) => ({ name: v.name.trim(), number: cleanPhone(v.number), weight: Number(v.weight) }))
        : null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setSaving(true)
    setError('')
    try {
      const isEdit = !!editingLid
      const res = await fetch(
        isEdit ? `/api/wa-links/${editingLid}` : '/api/wa-links',
        { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildBody()) }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false)
      await loadLinks()
      if (!isEdit) setTimeout(() => copyLink(data.lid), 200)
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function openCreate() { setEditingLid(null); setForm(EMPTY_FORM); setError(''); setShowModal(true) }
  function openEdit(link: WaLink) { setEditingLid(link.lid); setForm(linkToForm(link)); setError(''); setShowModal(true) }

  const isEditing = !!editingLid

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
            <div className="text-center">
              <p className="text-zinc-400 font-medium">Nenhum link criado ainda</p>
              <p className="text-zinc-600 text-sm mt-1">Crie um link para distribuir leads entre seus vendedores</p>
            </div>
            <button onClick={openCreate} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-md transition-colors">+ Criar primeiro link</button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {links.map((link) => (
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
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Seletor de modo */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg">
                {([
                  { key: 'single',   label: 'WhatsApp' },
                  { key: 'rotator',  label: 'Rotator %' },
                  { key: 'redirect', label: 'Redirect' },
                ] as { key: Mode; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      form.mode === key
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Ex: Anúncio Instagram — Produto X"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors"
                />
                <p className="text-xs text-zinc-600">Onde este link está sendo usado (só você vê)</p>
              </div>

              {/* Modo redirect */}
              {form.mode === 'redirect' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">URL de destino</label>
                  <input
                    type="url"
                    value={form.redirect_url}
                    onChange={(e) => setField('redirect_url', e.target.value)}
                    placeholder="https://seusite.com/pagina"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors"
                  />
                  <p className="text-xs text-zinc-600">Qualquer URL — o lead passará pelo link do Vercel antes</p>
                </div>
              )}

              {/* Modos WhatsApp */}
              {form.mode !== 'redirect' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Mensagem inicial</label>
                    <textarea
                      value={form.initial_message}
                      onChange={(e) => setField('initial_message', e.target.value)}
                      placeholder="Olá, vim pelo anúncio e gostaria de saber mais!"
                      rows={3}
                      maxLength={200}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors resize-none"
                    />
                    <p className="text-xs text-zinc-600 text-right">{form.initial_message.length}/200</p>
                  </div>

                  {form.mode === 'single' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Número WhatsApp</label>
                      <input
                        type="tel"
                        value={form.whatsapp_number}
                        onChange={(e) => setField('whatsapp_number', maskPhone(e.target.value))}
                        placeholder="+55 (11) 99999-9999"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors"
                      />
                    </div>
                  )}

                  {form.mode === 'rotator' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Vendedores</label>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${vendorSum === 100 ? 'bg-green-950 text-green-400' : 'bg-amber-950 text-amber-400'}`}>
                          {vendorSum}% / 100%
                        </span>
                      </div>
                      {form.vendors.map((v, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Vendedor {i + 1}</span>
                            {form.vendors.length > 2 && (
                              <button type="button" onClick={() => removeVendor(i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => setVendor(i, 'name', e.target.value)}
                              placeholder="Nome"
                              className="bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors"
                            />
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={v.weight}
                                onChange={(e) => setVendor(i, 'weight', e.target.value)}
                                min={1} max={100} placeholder="%"
                                className="w-16 bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors text-center"
                              />
                              <span className="text-zinc-500 text-sm">%</span>
                            </div>
                          </div>
                          <input
                            type="tel"
                            value={v.number}
                            onChange={(e) => setVendor(i, 'number', maskPhone(e.target.value))}
                            placeholder="+55 (11) 99999-9999"
                            className="w-full bg-black border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500 transition-colors"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addVendor}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-green-600 text-sm transition-colors"
                      >
                        + Adicionar vendedor
                      </button>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="bg-red-950 border border-red-800 rounded-md px-3 py-2 text-sm text-red-400">{error}</div>
              )}

              <div className="flex gap-2 pt-1 border-t border-zinc-800">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-md transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors font-medium">
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
  onCopy: (lid: string) => void; onEdit: (link: WaLink) => void; onDelete: (lid: string) => void
}) {
  const url = `${baseUrl}/r?lid=${link.lid}`
  const isCopied = copied === link.lid
  const date = new Date(link.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const badge = link.redirect_url
    ? { label: 'Redirect', color: 'bg-blue-950 text-blue-400 border-blue-900' }
    : link.rotator
    ? { label: 'Rotator', color: 'bg-green-950 text-green-400 border-green-900' }
    : { label: 'WhatsApp', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {link.description && <p className="text-xs text-zinc-400 font-medium">{link.description}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
            {link.redirect_url ? (
              <span className="text-xs text-zinc-500 truncate max-w-xs">{link.redirect_url}</span>
            ) : link.rotator ? (
              (link.vendors ?? []).map((v, i) => (
                <span key={i} className="text-xs text-zinc-500">{v.name} ({v.weight}%)</span>
              ))
            ) : (
              <span className="text-xs text-zinc-500 font-mono">+{link.whatsapp_number}</span>
            )}
            <span className="text-xs text-zinc-700">· {date}</span>
          </div>

          {!link.redirect_url && link.initial_message && (
            <p className="text-sm text-zinc-300 truncate">{link.initial_message}</p>
          )}

          <div className="flex items-center gap-2 bg-black rounded-md px-2.5 py-1.5 border border-zinc-800">
            <span className="text-xs text-zinc-500 font-mono truncate flex-1">{url}</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-green-400 transition-colors shrink-0 text-xs">↗</a>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCopy(link.lid)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
              isCopied ? 'bg-green-950 text-green-400 border-green-800' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
            }`}
          >
            {isCopied ? '✓ Copiado!' : '⎘ Copiar'}
          </button>
          <button onClick={() => onEdit(link)} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-xs" title="Editar">✎</button>
          <button onClick={() => onDelete(link.lid)} className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-950 transition-colors" title="Excluir">🗑</button>
        </div>
      </div>
    </div>
  )
}
