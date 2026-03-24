'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Brand, Creative, SyncLog } from '@/lib/supabase'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'meta',    label: 'Meta',    icon: '◈', color: '#e1306c', canSync: true,  syncNote: 'Requires Meta Ad Library API token' },
  { id: 'google',  label: 'Google',  icon: '◉', color: '#4285f4', canSync: false, syncNote: 'No public API — use guided search' },
  { id: 'tiktok',  label: 'TikTok',  icon: '♪', color: '#ff0050', canSync: false, syncNote: 'No public API — use guided search' },
  { id: 'tv',      label: 'TV',      icon: '◻', color: '#a3c4f3', canSync: false, syncNote: 'Manual logging' },
  { id: 'ooh',     label: 'OOH',     icon: '◰', color: '#00d2ff', canSync: false, syncNote: 'Manual logging' },
  { id: 'print',   label: 'Print',   icon: '◫', color: '#8b5cf6', canSync: false, syncNote: 'Manual logging' },
  { id: 'podcast', label: 'Podcast', icon: '◎', color: '#a855f7', canSync: false, syncNote: 'Manual logging' },
  { id: 'email',   label: 'Email',   icon: '✉', color: '#10b981', canSync: false, syncNote: 'Manual logging' },
]

const BRAND_COLORS = ['#e8c97e','#a3c4f3','#f87171','#4ade80','#c084fc','#fb923c','#22d3ee','#f472b6']

const GUIDED_SEARCH: Record<string, (brand: string) => { label: string; url: string }[]> = {
  google: (brand) => [
    { label: 'Google Ads Transparency Center', url: `https://adstransparency.google.com/?region=anywhere&query=${encodeURIComponent(brand)}` },
    { label: 'YouTube — search brand ads', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(brand + ' ad')}` },
    { label: 'YouTube channel search', url: `https://www.youtube.com/@${brand.toLowerCase().replace(/\s/g,'')}` },
  ],
  tiktok: (brand) => [
    { label: 'TikTok Creative Center — Top Ads', url: `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?keyword=${encodeURIComponent(brand)}` },
    { label: `@${brand.toLowerCase().replace(/\s/g,'')} on TikTok`, url: `https://www.tiktok.com/@${brand.toLowerCase().replace(/\s/g,'')}` },
    { label: 'TikTok search results', url: `https://www.tiktok.com/search?q=${encodeURIComponent(brand)}` },
  ],
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

const s = {
  label: { fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--muted2)', marginBottom: 6, display: 'block' },
  input: { width: '100%', background: '#0d0d0d', border: '1px solid var(--border2)', color: 'var(--text)', padding: '9px 12px', fontSize: 12, borderRadius: 4, outline: 'none' },
  btn: (color = '#fff', bg = 'transparent') => ({ padding: '8px 18px', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, background: bg, border: `1px solid ${color}`, color, cursor: 'pointer', borderRadius: 4, transition: 'all 0.15s' }),
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 },
}

const Badge = ({ label, color }: { label: string; color: string }) => (
  <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' as const, border: `1px solid ${color}44`, color, borderRadius: 2 }}>{label}</span>
)

const Spinner = () => <div className="spin" style={{ width: 14, height: 14, border: '2px solid #333', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />

const EmptyState = ({ icon, text, sub }: { icon: string; text: string; sub?: string }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    <div style={{ fontSize: 36, opacity: 0.08, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 4 }}>{text}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
  </div>
)

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function AppClient() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [view, setView] = useState<'brands' | 'creatives' | 'settings'>('brands')
  const [loading, setLoading] = useState(true)
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [metaToken, setMetaToken] = useState('')
  const [tokenSaved, setTokenSaved] = useState(false)

  useEffect(() => {
    fetchBrands()
    const saved = localStorage.getItem('meta_token')
    if (saved) { setMetaToken(saved); setTokenSaved(true) }
  }, [])

  const fetchBrands = async () => {
    setLoading(true)
    const { data } = await supabase.from('brands').select('*').order('created_at', { ascending: false })
    if (data) setBrands(data as Brand[])
    setLoading(false)
  }

  const handleBrandAdded = (brand: Brand) => {
    setBrands(prev => [brand, ...prev])
    setShowAddBrand(false)
    setSelectedBrand(brand)
    setView('creatives')
  }

  const handleBrandDeleted = (id: string) => {
    setBrands(prev => prev.filter(b => b.id !== id))
    if (selectedBrand?.id === id) { setSelectedBrand(null); setView('brands') }
  }

  const saveToken = () => {
    localStorage.setItem('meta_token', metaToken)
    setTokenSaved(true)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Sidebar ── */}
      <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>Ad Intelligence</div>
          <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 18, color: '#fff', fontWeight: 400 }}>Creative Tracker</div>
        </div>

        {/* Nav */}
        <div style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'brands', label: 'Brands', icon: '◈' },
            { id: 'settings', label: 'API Settings', icon: '⚙' },
          ].map(item => (
            <button key={item.id} onClick={() => { setView(item.id as any); setSelectedBrand(null) }} style={{ width: '100%', padding: '8px 12px', background: view === item.id && !selectedBrand ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 12, color: 'var(--muted2)' }}>{item.icon}</span>
              <span style={{ fontSize: 11, color: view === item.id && !selectedBrand ? '#fff' : 'var(--muted2)', letterSpacing: '0.06em' }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Brand list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 8px', marginBottom: 8 }}>Tracked Brands</div>
          {loading ? (
            <div style={{ padding: '8px 12px' }}><Spinner /></div>
          ) : brands.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 12px' }}>No brands yet</div>
          ) : brands.map(brand => (
            <button key={brand.id} onClick={() => { setSelectedBrand(brand); setView('creatives') }} style={{ width: '100%', padding: '9px 12px', background: selectedBrand?.id === brand.id ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', borderLeft: `2px solid ${selectedBrand?.id === brand.id ? brand.color : 'transparent'}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textAlign: 'left', marginBottom: 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: selectedBrand?.id === brand.id ? '#fff' : '#aaa', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>{brand.website.replace(/https?:\/\/(www\.)?/, '')}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Add brand */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setShowAddBrand(true)} style={{ ...s.btn('var(--accent)'), width: '100%', textAlign: 'center' }}>+ Add Brand</button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedBrand && view === 'creatives' ? (
          <CreativesView brand={selectedBrand} metaToken={metaToken} onBrandDeleted={handleBrandDeleted} onBrandUpdated={b => { setBrands(prev => prev.map(x => x.id === b.id ? b : x)); setSelectedBrand(b) }} />
        ) : view === 'settings' ? (
          <SettingsView metaToken={metaToken} setMetaToken={setMetaToken} tokenSaved={tokenSaved} onSave={saveToken} />
        ) : (
          <BrandsOverview brands={brands} loading={loading} onSelect={b => { setSelectedBrand(b); setView('creatives') }} onAdd={() => setShowAddBrand(true)} />
        )}
      </div>

      {/* ── Add Brand Modal ── */}
      {showAddBrand && <AddBrandModal onClose={() => setShowAddBrand(false)} onAdded={handleBrandAdded} existingCount={brands.length} />}
    </div>
  )
}

// ─── BRANDS OVERVIEW ─────────────────────────────────────────────────────────

function BrandsOverview({ brands, loading, onSelect, onAdd }: { brands: Brand[]; loading: boolean; onSelect: (b: Brand) => void; onAdd: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>Dashboard</div>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 400, color: '#fff' }}>Tracked Brands</h1>
        </div>
        <button onClick={onAdd} style={{ ...s.btn('var(--accent)') }}>+ Add Brand</button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 8 }} />)}
        </div>
      ) : brands.length === 0 ? (
        <EmptyState icon="◈" text="No brands tracked yet" sub="Add your first brand to start pulling ad creatives" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {brands.map(brand => (
            <BrandCard key={brand.id} brand={brand} onClick={() => onSelect(brand)} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrandCard({ brand, onClick }: { brand: Brand; onClick: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.from('creatives').select('platform').eq('brand_id', brand.id).then(({ data }) => {
      if (!data) return
      const c: Record<string, number> = {}
      data.forEach(r => { c[r.platform] = (c[r.platform] || 0) + 1 })
      setCounts(c)
    })
  }, [brand.id])

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div onClick={onClick} style={{ ...s.card, padding: 22, cursor: 'pointer', transition: 'border-color 0.2s', borderColor: 'var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = brand.color + '66')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: brand.color }} />
            <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 18, color: '#fff', fontWeight: 400 }}>{brand.name}</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted2)' }}>{brand.website.replace(/https?:\/\/(www\.)?/, '')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, color: brand.color, fontFamily: 'Playfair Display, Georgia, serif' }}>{total}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>creatives</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PLATFORMS.filter(p => counts[p.id] > 0).map(p => (
          <Badge key={p.id} label={`${p.icon} ${p.label} ${counts[p.id]}`} color={p.color} />
        ))}
        {total === 0 && <span style={{ fontSize: 10, color: 'var(--muted)' }}>No creatives yet — click to sync</span>}
      </div>
    </div>
  )
}

// ─── CREATIVES VIEW ───────────────────────────────────────────────────────────

function CreativesView({ brand, metaToken, onBrandDeleted, onBrandUpdated }: { brand: Brand; metaToken: string; onBrandDeleted: (id: string) => void; onBrandUpdated: (b: Brand) => void }) {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState('all')
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [showAddManual, setShowAddManual] = useState(false)
  const [showGuidedSearch, setShowGuidedSearch] = useState<string | null>(null)

  const fetchCreatives = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('creatives').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false })
    if (data) setCreatives(data as Creative[])
    setLoading(false)
  }, [brand.id])

  const fetchSyncLogs = useCallback(async () => {
    const { data } = await supabase.from('sync_logs').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false }).limit(10)
    if (data) setSyncLogs(data as SyncLog[])
  }, [brand.id])

  useEffect(() => { fetchCreatives(); fetchSyncLogs() }, [fetchCreatives, fetchSyncLogs])

  const syncMeta = async () => {
    if (!metaToken) { alert('Please add your Meta Ad Library API token in Settings first.'); return }
    setSyncing(p => ({ ...p, meta: true }))
    try {
      const res = await fetch('/api/sync/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brand.id, brand_name: brand.name, meta_page_id: brand.meta_page_id, meta_token: metaToken }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Sync failed')
      await fetchCreatives()
      await fetchSyncLogs()
    } catch (err: any) {
      alert('Sync error: ' + err.message)
    }
    setSyncing(p => ({ ...p, meta: false }))
  }

  const filtered = platformFilter === 'all' ? creatives : creatives.filter(c => c.platform === platformFilter)
  const counts: Record<string, number> = {}
  creatives.forEach(c => { counts[c.platform] = (counts[c.platform] || 0) + 1 })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: brand.color }} />
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 22, fontWeight: 400, color: '#fff' }}>{brand.name}</h2>
            <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{brand.website.replace(/https?:\/\/(www\.)?/, '')}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>· {creatives.length} creatives</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAddManual(true)} style={s.btn('var(--muted2)')}>+ Manual</button>
            <button onClick={() => setShowGuidedSearch('google')} style={s.btn(PLATFORMS.find(p=>p.id==='google')!.color)}>◉ Google</button>
            <button onClick={() => setShowGuidedSearch('tiktok')} style={s.btn(PLATFORMS.find(p=>p.id==='tiktok')!.color)}>♪ TikTok</button>
            <button onClick={syncMeta} disabled={syncing.meta} style={{ ...s.btn('#e1306c'), display: 'flex', alignItems: 'center', gap: 6, opacity: syncing.meta ? 0.7 : 1 }}>
              {syncing.meta ? <><Spinner /> Syncing...</> : '◈ Sync Meta'}
            </button>
          </div>
        </div>

        {/* Platform filter tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setPlatformFilter('all')} style={{ padding: '4px 12px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', background: platformFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'none', border: `1px solid ${platformFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`, color: platformFilter === 'all' ? '#fff' : 'var(--muted2)', cursor: 'pointer', borderRadius: 3 }}>
            All ({creatives.length})
          </button>
          {PLATFORMS.filter(p => counts[p.id] > 0).map(p => (
            <button key={p.id} onClick={() => setPlatformFilter(p.id)} style={{ padding: '4px 12px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', background: platformFilter === p.id ? `${p.color}18` : 'none', border: `1px solid ${platformFilter === p.id ? p.color : 'var(--border)'}`, color: platformFilter === p.id ? p.color : 'var(--muted2)', cursor: 'pointer', borderRadius: 3 }}>
              {p.icon} {p.label} ({counts[p.id]})
            </button>
          ))}
        </div>
      </div>

      {/* Sync status bar */}
      {syncLogs.length > 0 && syncLogs[0].status !== 'error' && (
        <div style={{ padding: '8px 28px', borderBottom: '1px solid var(--border)', background: 'rgba(74,222,128,0.04)', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
          {syncLogs.slice(0, 3).map(log => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--muted2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: log.status === 'success' ? 'var(--green)' : log.status === 'running' ? 'var(--orange)' : 'var(--red)' }} />
              <span style={{ color: PLATFORMS.find(p=>p.id===log.platform)?.color }}>{PLATFORMS.find(p=>p.id===log.platform)?.label}</span>
              <span>· {log.ads_new} new · {new Date(log.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Creative grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={PLATFORMS.find(p=>p.id===platformFilter)?.icon || '◈'} text={platformFilter === 'all' ? 'No creatives yet' : `No ${PLATFORMS.find(p=>p.id===platformFilter)?.label} creatives`} sub={platformFilter === 'meta' ? 'Click "Sync Meta" to pull creatives automatically' : 'Use the guided search or log manually'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filtered.map(creative => (
              <CreativeCard key={creative.id} creative={creative} brand={brand} onClick={() => setSelectedCreative(creative)} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedCreative && <CreativeDetailModal creative={selectedCreative} brand={brand} onClose={() => setSelectedCreative(null)} onUpdated={c => { setCreatives(prev => prev.map(x => x.id === c.id ? c : x)); setSelectedCreative(c) }} onDeleted={id => { setCreatives(prev => prev.filter(x => x.id !== id)); setSelectedCreative(null) }} />}
      {showAddManual && <AddManualCreativeModal brand={brand} onClose={() => setShowAddManual(false)} onAdded={c => { setCreatives(prev => [c, ...prev]); setShowAddManual(false) }} />}
      {showGuidedSearch && <GuidedSearchModal platform={showGuidedSearch} brand={brand} onClose={() => setShowGuidedSearch(null)} />}
    </div>
  )
}

// ─── CREATIVE CARD ────────────────────────────────────────────────────────────

function CreativeCard({ creative, brand, onClick }: { creative: Creative; brand: Brand; onClick: () => void }) {
  const platform = PLATFORMS.find(p => p.id === creative.platform)!
  const hasMedia = creative.thumbnail_url || creative.media_url
  const [imgError, setImgError] = useState(false)

  return (
    <div onClick={onClick} style={{ ...s.card, cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = platform.color + '44')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      {/* Media area */}
      <div style={{ height: 140, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {hasMedia && !imgError ? (
          <img src={creative.thumbnail_url || creative.media_url || ''} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, color: platform.color + '44', marginBottom: 6 }}>{platform.icon}</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{creative.media_type || 'creative'}</div>
          </div>
        )}
        {/* Platform badge */}
        <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 7px', background: 'rgba(0,0,0,0.75)', borderRadius: 3, fontSize: 9, color: platform.color, letterSpacing: '0.1em', backdropFilter: 'blur(4px)', border: `1px solid ${platform.color}33` }}>
          {platform.icon} {platform.label}
        </div>
        {/* Active indicator */}
        {creative.is_active && (
          <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} className="pulse" />
        )}
        {/* Score */}
        {creative.score_overall > 0 && (
          <div style={{ position: 'absolute', bottom: 8, right: 8, padding: '2px 7px', background: 'rgba(0,0,0,0.8)', borderRadius: 3, fontSize: 11, color: creative.score_overall >= 8 ? 'var(--accent)' : creative.score_overall >= 6 ? 'var(--accent2)' : 'var(--orange)', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
            {creative.score_overall.toFixed(1)}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 12 }}>
        {creative.title && <div style={{ fontSize: 12, color: '#ddd', marginBottom: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{creative.title}</div>}
        {creative.body_text && <div style={{ fontSize: 10, color: 'var(--muted2)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>"{creative.body_text}"</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            {creative.first_shown ? new Date(creative.first_shown).toLocaleDateString() : creative.created_at ? new Date(creative.created_at).toLocaleDateString() : ''}
          </div>
          {creative.spend_lower != null && creative.spend_upper != null && (
            <div style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em' }}>
              ${(creative.spend_lower/1000).toFixed(0)}K–${(creative.spend_upper/1000).toFixed(0)}K
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CREATIVE DETAIL MODAL ────────────────────────────────────────────────────

function CreativeDetailModal({ creative, brand, onClose, onUpdated, onDeleted }: { creative: Creative; brand: Brand; onClose: () => void; onUpdated: (c: Creative) => void; onDeleted: (id: string) => void }) {
  const platform = PLATFORMS.find(p => p.id === creative.platform)!
  const [scores, setScores] = useState({ score_hook: creative.score_hook, score_brand: creative.score_brand, score_audience: creative.score_audience, score_message: creative.score_message, score_format: creative.score_format, score_production: creative.score_production })
  const [notes, setNotes] = useState(creative.notes || '')
  const [saving, setSaving] = useState(false)

  const DIMS = [
    { key: 'score_hook', label: 'Hook', weight: 0.20 }, { key: 'score_brand', label: 'Brand Fit', weight: 0.20 },
    { key: 'score_audience', label: 'Audience', weight: 0.20 }, { key: 'score_message', label: 'Message', weight: 0.15 },
    { key: 'score_format', label: 'Format Fit', weight: 0.15 }, { key: 'score_production', label: 'Production', weight: 0.10 },
  ]
  const overall = parseFloat(DIMS.reduce((s, d) => s + ((scores as any)[d.key] || 0) * d.weight, 0).toFixed(1))

  const handleSave = async () => {
    setSaving(true)
    const { data } = await supabase.from('creatives').update({ ...scores, score_overall: overall, notes }).eq('id', creative.id).select().single()
    if (data) onUpdated(data as Creative)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this creative?')) return
    await supabase.from('creatives').delete().eq('id', creative.id)
    onDeleted(creative.id)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid var(--border2)', borderRadius: 10, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <Badge label={`${platform.icon} ${platform.label}`} color={platform.color} />
              {creative.format && <Badge label={creative.format} color="var(--muted2)" />}
              {creative.is_active && <Badge label="● Active" color="var(--green)" />}
              {creative.auto_synced && <Badge label="Auto-synced" color="var(--accent2)" />}
            </div>
            <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 18, color: '#fff', fontWeight: 400, marginBottom: 2 }}>{creative.title || 'Untitled Creative'}</h3>
            {creative.page_name && <div style={{ fontSize: 11, color: 'var(--muted2)' }}>via {creative.page_name}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>
          {/* Left: creative info */}
          <div style={{ padding: 24, borderRight: '1px solid var(--border)' }}>
            {/* Media */}
            {(creative.thumbnail_url || creative.media_url) && (
              <div style={{ marginBottom: 16, borderRadius: 6, overflow: 'hidden', maxHeight: 240, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={creative.thumbnail_url || creative.media_url || ''} alt="" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}

            {[
              { label: 'Ad Copy', value: creative.body_text, italic: true },
              { label: 'Call to Action', value: creative.cta },
              { label: 'Destination URL', value: creative.destination_url, link: true },
            ].map(item => item.value && (
              <div key={item.label} style={{ marginBottom: 14 }}>
                <div style={s.label}>{item.label}</div>
                {item.link ? (
                  <a href={item.value} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent2)', wordBreak: 'break-all' }}>{item.value}</a>
                ) : (
                  <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.6, fontStyle: item.italic ? 'italic' : 'normal' }}>{item.value}</div>
                )}
              </div>
            ))}

            {/* Spend & impressions */}
            {creative.spend_lower != null && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                  <div style={s.label}>Est. Spend</div>
                  <div style={{ fontSize: 16, color: 'var(--accent)' }}>${(creative.spend_lower/1000).toFixed(0)}K–${(creative.spend_upper!/1000).toFixed(0)}K</div>
                </div>
                {creative.impressions_lower != null && (
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                    <div style={s.label}>Est. Impressions</div>
                    <div style={{ fontSize: 16, color: 'var(--accent2)' }}>{(creative.impressions_lower!/1000).toFixed(0)}K–{(creative.impressions_upper!/1000).toFixed(0)}K</div>
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            {creative.first_shown && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div><div style={s.label}>First Seen</div><div style={{ fontSize: 12, color: '#aaa' }}>{new Date(creative.first_shown).toLocaleDateString()}</div></div>
                {creative.last_shown && <div><div style={s.label}>Last Seen</div><div style={{ fontSize: 12, color: '#aaa' }}>{new Date(creative.last_shown).toLocaleDateString()}</div></div>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={s.label}>Analysis Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...s.input, resize: 'vertical', minHeight: 72 }} placeholder="Add strategic notes, observations, what works/doesn't..." />
            </div>
          </div>

          {/* Right: scoring */}
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 42, fontFamily: 'Playfair Display, Georgia, serif', color: overall >= 8 ? 'var(--accent)' : overall >= 6 ? 'var(--accent2)' : overall > 0 ? 'var(--orange)' : 'var(--muted)' }}>{overall > 0 ? overall.toFixed(1) : '—'}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted2)' }}>Overall Score</div>
            </div>
            {DIMS.map(dim => (
              <div key={dim.key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#aaa' }}>{dim.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{Math.round(dim.weight * 100)}%</span>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const cur = (scores as any)[dim.key]
                    const active = cur === n
                    const col = n >= 8 ? 'var(--accent)' : n >= 6 ? 'var(--accent2)' : 'var(--orange)'
                    return <button key={n} onClick={() => setScores(p => ({ ...p, [dim.key]: n }))} style={{ flex: 1, height: 26, fontSize: 10, background: active ? col : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'transparent' : 'var(--border)'}`, color: active ? '#000' : 'var(--muted2)', cursor: 'pointer', borderRadius: 2 }}>{n}</button>
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
              <button onClick={handleDelete} style={{ ...s.btn('var(--red)'), padding: '7px 12px' }}>Delete</button>
              <button onClick={handleSave} disabled={saving} style={{ ...s.btn('#000', '#fff'), flex: 1, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ADD BRAND MODAL ──────────────────────────────────────────────────────────

function AddBrandModal({ onClose, onAdded, existingCount }: { onClose: () => void; onAdded: (b: Brand) => void; existingCount: number }) {
  const [form, setForm] = useState({ name: '', website: '', meta_page_id: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const color = BRAND_COLORS[existingCount % BRAND_COLORS.length]

  const handleSave = async () => {
    if (!form.name || !form.website) return
    setSaving(true)
    const website = form.website.startsWith('http') ? form.website : `https://${form.website}`
    const { data } = await supabase.from('brands').insert([{ ...form, website, color }]).select().single()
    if (data) onAdded(data as Brand)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid var(--border2)', borderRadius: 10, width: 460, padding: 28 }}>
        <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, color: '#fff', fontWeight: 400, marginBottom: 22 }}>Add Brand</h3>
        <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Brand Name *', key: 'name', placeholder: 'e.g. Equinox' },
            { label: 'Website URL *', key: 'website', placeholder: 'https://www.equinox.com/' },
            { label: 'Meta Page ID', key: 'meta_page_id', placeholder: 'e.g. 103875938 (for Meta sync)' },
            { label: 'Notes', key: 'notes', placeholder: 'Positioning, target audience...' },
          ].map(f => (
            <div key={f.key}>
              <label style={s.label}>{f.label}</label>
              {f.key === 'notes' ? (
                <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ ...s.input, resize: 'vertical', minHeight: 60 }} />
              ) : (
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={s.input} />
              )}
            </div>
          ))}
        </div>
        <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: 6, padding: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>Finding your Meta Page ID</div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.7 }}>
            1. Go to the brand&apos;s Facebook page<br />
            2. Click &quot;About&quot; → scroll to bottom<br />
            3. Copy the Page ID number — OR —<br />
            4. Leave blank to search by brand name
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={s.btn('var(--muted2)')}>Cancel</button>
          <button onClick={handleSave} disabled={!form.name || !form.website || saving} style={{ ...s.btn('#000', '#fff'), opacity: form.name && form.website && !saving ? 1 : 0.5 }}>{saving ? 'Adding...' : 'Add Brand'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── ADD MANUAL CREATIVE ──────────────────────────────────────────────────────

function AddManualCreativeModal({ brand, onClose, onAdded }: { brand: Brand; onClose: () => void; onAdded: (c: Creative) => void }) {
  const [form, setForm] = useState({ platform: 'meta', format: '', title: '', body_text: '', cta: '', destination_url: '', media_url: '', notes: '', first_shown: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.platform) return
    setSaving(true)
    const { data } = await supabase.from('creatives').insert([{ ...form, brand_id: brand.id, is_active: true, auto_synced: false, score_hook: 0, score_brand: 0, score_audience: 0, score_message: 0, score_format: 0, score_production: 0, score_overall: 0 }]).select().single()
    if (data) onAdded(data as Creative)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid var(--border2)', borderRadius: 10, width: 520, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 20, color: '#fff', fontWeight: 400, marginBottom: 22 }}>Log Manual Creative</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={s.label}>Platform *</label>
            <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} style={s.input}>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Format</label>
            <input value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))} placeholder="Reel, 30s Spot, Billboard..." style={s.input} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={s.label}>Title / Description</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Short description of the ad" style={s.input} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={s.label}>Ad Copy / Body Text</label>
            <textarea value={form.body_text} onChange={e => setForm(p => ({ ...p, body_text: e.target.value }))} placeholder="Main copy or hook..." style={{ ...s.input, resize: 'vertical', minHeight: 64 }} />
          </div>
          <div>
            <label style={s.label}>Call to Action</label>
            <input value={form.cta} onChange={e => setForm(p => ({ ...p, cta: e.target.value }))} placeholder="Shop Now, Learn More..." style={s.input} />
          </div>
          <div>
            <label style={s.label}>Date First Seen</label>
            <input type="date" value={form.first_shown} onChange={e => setForm(p => ({ ...p, first_shown: e.target.value }))} style={s.input} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={s.label}>Media URL (image/video link)</label>
            <input value={form.media_url} onChange={e => setForm(p => ({ ...p, media_url: e.target.value }))} placeholder="https://..." style={s.input} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={s.label}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Strategic observations..." style={{ ...s.input, resize: 'vertical', minHeight: 56 }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={s.btn('var(--muted2)')}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...s.btn('#000', '#fff'), opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Creative'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── GUIDED SEARCH MODAL ──────────────────────────────────────────────────────

function GuidedSearchModal({ platform, brand, onClose }: { platform: string; brand: Brand; onClose: () => void }) {
  const p = PLATFORMS.find(x => x.id === platform)!
  const links = GUIDED_SEARCH[platform]?.(brand.name) || []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: '#0d0d0d', border: '1px solid var(--border2)', borderRadius: 10, width: 480, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.color, marginBottom: 5 }}>{p.icon} {p.label} — No Public API</div>
            <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 18, color: '#fff', fontWeight: 400 }}>Guided Research for {brand.name}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ background: '#0a0a0a', border: `1px solid ${p.color}22`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.7 }}>
            {p.id === 'google' ? 'Google\'s Ads Transparency Center has no public API. Open these links to manually research creatives, then use "+ Manual" to log what you find.' : 'TikTok\'s Creative Center has no API for competitor ads. Open these links to find creatives, then use "+ Manual" to log them.'}
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
          {links.map(link => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: `1px solid var(--border)`, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = p.color + '44')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <span style={{ fontSize: 12, color: '#ddd' }}>{link.label}</span>
              <span style={{ fontSize: 10, color: p.color }}>Open ↗</span>
            </a>
          ))}
        </div>
        <button onClick={onClose} style={{ ...s.btn('#fff', 'transparent'), width: '100%', textAlign: 'center' }}>Close</button>
      </div>
    </div>
  )
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────

function SettingsView({ metaToken, setMetaToken, tokenSaved, onSave }: { metaToken: string; setMetaToken: (t: string) => void; tokenSaved: boolean; onSave: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32, maxWidth: 600 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 6 }}>Configuration</div>
      <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 28, fontWeight: 400, color: '#fff', marginBottom: 28 }}>API Settings</h1>

      {/* Meta */}
      <div style={{ ...s.card, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: '#e1306c', fontSize: 16 }}>◈</span>
          <span style={{ fontSize: 14, color: '#fff' }}>Meta Ad Library API</span>
          <Badge label={tokenSaved ? '● Connected' : '○ Not set'} color={tokenSaved ? 'var(--green)' : 'var(--muted2)'} />
        </div>
        <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: 6, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.8 }}>
            <strong style={{ color: '#aaa' }}>How to get your token:</strong><br />
            1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" style={{ color: '#e1306c' }}>developers.facebook.com</a> → Create App<br />
            2. Visit <a href="https://www.facebook.com/ads/library/api/" target="_blank" rel="noreferrer" style={{ color: '#e1306c' }}>facebook.com/ads/library/api</a> and apply for access<br />
            3. Once approved, generate a User Access Token with <code style={{ color: 'var(--accent)', background: '#111', padding: '1px 5px', borderRadius: 2 }}>ads_read</code> permission<br />
            4. Paste it below — it&apos;s stored locally in your browser only, never sent to our servers
          </div>
        </div>
        <label style={s.label}>Access Token</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={metaToken} onChange={e => setMetaToken(e.target.value)} placeholder="EAAxxxxxxxx..." style={{ ...s.input, flex: 1, fontFamily: 'monospace' }} />
          <button onClick={onSave} disabled={!metaToken} style={{ ...s.btn('#000', 'var(--accent)'), padding: '9px 20px', opacity: metaToken ? 1 : 0.5 }}>Save</button>
        </div>
        {tokenSaved && <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 6 }}>✓ Token saved — ready to sync Meta ads</div>}
      </div>

      {/* Google */}
      <div style={{ ...s.card, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color: '#4285f4', fontSize: 16 }}>◉</span>
          <span style={{ fontSize: 14, color: '#fff' }}>Google Ads Transparency Center</span>
          <Badge label="No API Available" color="var(--orange)" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.7 }}>Google does not provide a public API for competitor ad data. Use the Guided Search feature on each brand to open the Transparency Center with pre-filled searches. Log creatives manually.</div>
      </div>

      {/* TikTok */}
      <div style={{ ...s.card, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color: '#ff0050', fontSize: 16 }}>♪</span>
          <span style={{ fontSize: 14, color: '#fff' }}>TikTok Creative Center</span>
          <Badge label="No API Available" color="var(--orange)" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.7 }}>TikTok&apos;s Commercial Content API only covers your own ads. Competitor creative data is not available via any official API. Use the Guided Search feature and log creatives manually.</div>
      </div>
    </div>
  )
}
