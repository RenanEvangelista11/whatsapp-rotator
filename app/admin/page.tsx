'use client'

import { useEffect, useState } from 'react'

type Seller = { id: string; nome: string; whatsapp: string; ativo: boolean }
type LinkSeller = { seller_id: string; percentual: number; total_cliques: number; sellers: Seller }
type Link = { id: string; slug: string; mensagem: string; total_cliques: number; link_sellers: LinkSeller[] }

export default function AdminPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [tab, setTab] = useState<'links' | 'sellers'>('links')

  // Form vendedor
  const [sellerNome, setSellerNome] = useState('')
  const [sellerWA, setSellerWA] = useState('')

  // Form link
  const [linkSlug, setLinkSlug] = useState('')
  const [linkMsg, setLinkMsg] = useState('Olá! Vim pelo link.')

  // Form adicionar vendedor ao link
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [addSellerId, setAddSellerId] = useState('')
  const [addPercentual, setAddPercentual] = useState('')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function fetchAll() {
    const [s, l] = await Promise.all([
      fetch('/api/sellers').then((r) => r.json()),
      fetch('/api/links').then((r) => r.json()),
    ])
    setSellers(Array.isArray(s) ? s : [])
    setLinks(Array.isArray(l) ? l : [])
  }

  useEffect(() => { fetchAll() }, [])

  async function criarSeller(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: sellerNome, whatsapp: sellerWA }),
    })
    setSellerNome(''); setSellerWA('')
    fetchAll()
  }

  async function toggleSeller(s: Seller) {
    await fetch(`/api/sellers/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !s.ativo }),
    })
    fetchAll()
  }

  async function deleteSeller(id: string) {
    if (!confirm('Remover vendedor?')) return
    await fetch(`/api/sellers/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  async function criarLink(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: linkSlug, mensagem: linkMsg }),
    })
    setLinkSlug(''); setLinkMsg('Olá! Vim pelo link.')
    fetchAll()
  }

  async function deleteLink(id: string) {
    if (!confirm('Remover link e todos os dados?')) return
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    setSelectedLink(null)
    fetchAll()
  }

  async function adicionarVendedorNoLink(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLink) return
    const res = await fetch('/api/link-sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link_id: selectedLink.id,
        seller_id: addSellerId,
        percentual: Number(addPercentual),
      }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    setAddSellerId(''); setAddPercentual('')
    fetchAll()
    // Atualiza o link selecionado com dados frescos
    const links2 = await fetch('/api/links').then((r) => r.json())
    setLinks(links2)
    setSelectedLink(links2.find((l: Link) => l.id === selectedLink.id) ?? null)
  }

  async function removerVendedorDoLink(link_id: string, seller_id: string) {
    await fetch('/api/link-sellers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link_id, seller_id }),
    })
    fetchAll()
    const links2 = await fetch('/api/links').then((r) => r.json())
    setLinks(links2)
    setSelectedLink(links2.find((l: Link) => l.id === selectedLink?.id) ?? null)
  }

  const somaPercent = (link: Link) =>
    (link.link_sellers ?? []).reduce((a, ls) => a + ls.percentual, 0)

  const sellersNaoNoLink = (link: Link) =>
    sellers.filter((s) => !link.link_sellers?.some((ls) => ls.seller_id === s.id))

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">📲</span>
        <h1 className="text-xl font-bold">WhatsApp Rotator</h1>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['links', 'sellers'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg font-medium transition-colors ${
                tab === t
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {t === 'links' ? '🔗 Links' : '👥 Vendedores'}
            </button>
          ))}
        </div>

        {/* TAB VENDEDORES */}
        {tab === 'sellers' && (
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="font-semibold mb-4 text-lg">Novo Vendedor</h2>
              <form onSubmit={criarSeller} className="flex gap-3 flex-wrap">
                <input
                  className="bg-gray-800 rounded-lg px-4 py-2 flex-1 min-w-40 border border-gray-700 focus:outline-none focus:border-green-500"
                  placeholder="Nome"
                  value={sellerNome}
                  onChange={(e) => setSellerNome(e.target.value)}
                  required
                />
                <input
                  className="bg-gray-800 rounded-lg px-4 py-2 flex-1 min-w-40 border border-gray-700 focus:outline-none focus:border-green-500"
                  placeholder="WhatsApp (ex: 5511999999999)"
                  value={sellerWA}
                  onChange={(e) => setSellerWA(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  Adicionar
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {sellers.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{s.nome}</p>
                    <p className="text-gray-400 text-sm">+{s.whatsapp}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSeller(s)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        s.ativo
                          ? 'bg-green-900 text-green-300 hover:bg-green-800'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {s.ativo ? '● Ativo' : '○ Inativo'}
                    </button>
                    <button
                      onClick={() => deleteSeller(s.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-2"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
              {sellers.length === 0 && (
                <p className="text-gray-500 text-center py-8">Nenhum vendedor cadastrado</p>
              )}
            </div>
          </div>
        )}

        {/* TAB LINKS */}
        {tab === 'links' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna esquerda: formulário + lista de links */}
            <div className="space-y-5">
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h2 className="font-semibold mb-4 text-lg">Novo Link</h2>
                <form onSubmit={criarLink} className="space-y-3">
                  <input
                    className="bg-gray-800 w-full rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-green-500"
                    placeholder="Slug (ex: vendas)"
                    value={linkSlug}
                    onChange={(e) => setLinkSlug(e.target.value)}
                    required
                  />
                  <input
                    className="bg-gray-800 w-full rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-green-500"
                    placeholder="Mensagem padrão do WhatsApp"
                    value={linkMsg}
                    onChange={(e) => setLinkMsg(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-500 py-2 rounded-lg font-medium transition-colors"
                  >
                    Criar Link
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                {links.map((link) => {
                  const soma = somaPercent(link)
                  const isSelected = selectedLink?.id === link.id
                  return (
                    <div
                      key={link.id}
                      onClick={() => setSelectedLink(isSelected ? null : link)}
                      className={`bg-gray-900 border rounded-xl px-5 py-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-green-500 bg-gray-800'
                          : 'border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono font-semibold text-green-400">/{link.slug}</p>
                          <p className="text-gray-500 text-xs mt-0.5 break-all">{baseUrl}/{link.slug}</p>
                          <p className="text-gray-400 text-sm mt-1">
                            {link.total_cliques} clique{link.total_cliques !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              soma === 100
                                ? 'bg-green-900 text-green-300'
                                : 'bg-yellow-900 text-yellow-300'
                            }`}
                          >
                            {soma}%
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteLink(link.id) }}
                            className="block mt-2 text-red-400 hover:text-red-300 text-xs"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {links.length === 0 && (
                  <p className="text-gray-500 text-center py-8">Nenhum link criado</p>
                )}
              </div>
            </div>

            {/* Coluna direita: detalhe do link selecionado */}
            {selectedLink ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5 h-fit">
                <div>
                  <h2 className="font-semibold text-lg">
                    /{selectedLink.slug}
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${baseUrl}/${selectedLink.slug}`)
                    }}
                    className="text-xs text-green-400 hover:text-green-300 mt-1"
                  >
                    📋 Copiar link
                  </button>
                </div>

                {/* Barra de progresso dos % */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Distribuição</span>
                    <span>{somaPercent(selectedLink)}% / 100%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden flex">
                    {(selectedLink.link_sellers ?? []).map((ls, i) => (
                      <div
                        key={ls.seller_id}
                        style={{ width: `${ls.percentual}%` }}
                        className={`h-2 ${
                          ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'][i % 5]
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Vendedores no link */}
                <div className="space-y-2">
                  {(selectedLink.link_sellers ?? []).map((ls) => (
                    <div
                      key={ls.seller_id}
                      className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-sm">{ls.sellers?.nome}</p>
                        <p className="text-gray-400 text-xs">{ls.total_cliques} cliques recebidos</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold">{ls.percentual}%</span>
                        <button
                          onClick={() => removerVendedorDoLink(selectedLink.id, ls.seller_id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {(selectedLink.link_sellers ?? []).length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-3">
                      Nenhum vendedor neste link
                    </p>
                  )}
                </div>

                {/* Adicionar vendedor */}
                {sellersNaoNoLink(selectedLink).length > 0 && somaPercent(selectedLink) < 100 && (
                  <form onSubmit={adicionarVendedorNoLink} className="space-y-2 border-t border-gray-700 pt-4">
                    <p className="text-sm text-gray-400 font-medium">Adicionar vendedor</p>
                    <select
                      className="bg-gray-800 w-full rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-green-500"
                      value={addSellerId}
                      onChange={(e) => setAddSellerId(e.target.value)}
                      required
                    >
                      <option value="">Selecione o vendedor</option>
                      {sellersNaoNoLink(selectedLink).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100 - somaPercent(selectedLink)}
                        className="bg-gray-800 flex-1 rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-green-500"
                        placeholder={`% (disponível: ${100 - somaPercent(selectedLink)}%)`}
                        value={addPercentual}
                        onChange={(e) => setAddPercentual(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        Adicionar
                      </button>
                    </div>
                  </form>
                )}

                {somaPercent(selectedLink) === 100 && (
                  <p className="text-green-400 text-sm text-center">
                    ✓ Link pronto — distribuição em 100%
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-center text-gray-500">
                <p>Clique em um link para configurar os vendedores</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
