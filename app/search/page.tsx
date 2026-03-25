'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { CreativeRecord, PlatformStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'

/* ─── Design tokens ─── */
const V = {
  bg: '#08080a',
  bg1: '#111116',
  border: '#26262f',
  text1: '#e8e6e3',
  text2: '#a09ea0',
  text3: '#5a585c',
  accent: '#c8f031',
  accentDim: 'rgba(200,240,49,0.15)',
  danger: '#e85d24',
  radius: '8px',
  radiusLg: '12px',
} as const

const FONT_BODY = '"DM Sans", sans-serif'
const FONT_MONO = '"JetBrains Mono", monospace'

/* ─── Helpers ─── */
function formatNumber(n: number | null): string {
  if (n == null) return '\u2014'
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

function formatDate(s: string | null): string {
  if (!s) return '\u2014'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ─── Platform badge config ─── */
const PLATFORM_CFG: Record<string, { icon: string; label: string; bg: string }> = {
  meta: { icon: '\u25C8', label: 'Meta', bg: 'rgba(59,89,152,0.8)' },
  google: { icon: '\u25C9', label: 'Google', bg: 'rgba(66,133,244,0.8)' },
  tiktok: { icon: '\u266A', label: 'TikTok', bg: 'rgba(238,29,82,0.8)' },
}

const FALLBACK_ICONS: Record<string, string> = { meta: '\u25C8', google: '\u25C9', tiktok: '\u266A' }

/* ─── CreativeCard ─── */
function CreativeCard({
  creative,
  selected,
  onToggle,
}: {
  creative: CreativeRecord
  selected: boolean
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const cfg = PLATFORM_CFG[creative.platform] || PLATFORM_CFG.meta
  const copyText = creative.body_text || creative.headline || creative.title || ''
  const mediaUrl = creative.thumbnail_url || creative.media_url
  const formatLabel = creative.format || creative.media_type || null

  return (
    <div
      style={{
        background: V.bg1,
        border: `1px solid ${V.border}`,
        borderRadius: V.radiusLg,
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Media */}
      <div style={{ aspectRatio: '16/9', background: V.bg, position: 'relative', overflow: 'hidden' }}>
        {creative.video_url ? (
          <video
            src={creative.video_url}
            muted
            loop
            poster={creative.thumbnail_url || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
          />
        ) : mediaUrl ? (
          <img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: V.text3 }}>
            {FALLBACK_ICONS[creative.platform] || '\u25C8'}
          </div>
        )}

        {/* Top-left: platform badge or hover checkbox */}
        {hovered || selected ? (
          <div
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `2px solid ${V.accent}`,
              background: selected ? V.accent : V.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 12,
              color: selected ? V.bg : 'transparent',
              fontWeight: 700,
              zIndex: 2,
            }}
          >
            {selected ? '\u2713' : ''}
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '3px 8px',
              borderRadius: 10,
              fontSize: 10,
              fontFamily: FONT_MONO,
              background: cfg.bg,
              color: 'white',
              zIndex: 2,
            }}
          >
            {cfg.icon} {cfg.label}
          </div>
        )}

        {/* Top-right: active dot */}
        {creative.is_active && (
          <div
            className="pulse-dot"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4ade80',
            }}
          />
        )}

        {/* Bottom-right: format badge */}
        {formatLabel && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,0.7)',
              color: V.text2,
              padding: '2px 8px',
              borderRadius: 4,
              fontFamily: FONT_MONO,
              fontSize: 10,
              textTransform: 'uppercase',
            }}
          >
            {formatLabel}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: V.text1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 36,
          }}
        >
          {copyText}
        </div>

        {creative.cta && (
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              background: V.accentDim,
              color: V.accent,
              padding: '2px 8px',
              borderRadius: 10,
              fontFamily: FONT_BODY,
              fontSize: 11,
            }}
          >
            {creative.cta}
          </span>
        )}

        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: V.text3,
          }}
        >
          <span>{formatDate(creative.first_shown)}</span>
          <span>
            {creative.view_count != null
              ? `${formatNumber(creative.view_count)} views`
              : creative.is_active && creative.days_running != null
                ? `Active ${creative.days_running}d`
                : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Status dot ─── */
function StatusDot({ status }: { status: PlatformStatus['status'] }) {
  const color = status === 'success' ? V.accent : status === 'error' ? V.danger : V.text3
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

/* ─── Main search content ─── */
function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const q = searchParams.get('q') || ''
  const domain = searchParams.get('domain') || ''
  const context = searchParams.get('context') || ''

  const [metaStatus, setMetaStatus] = useState<PlatformStatus>({ status: 'idle', results: [], count: 0 })
  const [googleStatus, setGoogleStatus] = useState<PlatformStatus>({ status: 'idle', results: [], count: 0 })
  const [tiktokStatus, setTiktokStatus] = useState<PlatformStatus>({ status: 'idle', results: [], count: 0 })

  const [platformFilter, setPlatformFilter] = useState<'all' | 'meta' | 'google' | 'tiktok'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'active' | 'views'>('recent')
  const [textFilter, setTextFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [credits, setCredits] = useState<string>('--')
  const [saving, setSaving] = useState(false)

  // Read credits from localStorage
  useEffect(() => {
    try {
      const c = localStorage.getItem('SCRAPECREATORS_CREDITS')
      if (c) setCredits(c)
    } catch { /* noop */ }
  }, [])

  // Fetch data
  useEffect(() => {
    if (!q) return

    const fetchPlatform = async (
      platform: 'meta' | 'google' | 'tiktok',
      setter: React.Dispatch<React.SetStateAction<PlatformStatus>>,
    ) => {
      setter({ status: 'loading', results: [], count: 0 })
      try {
        const res = await fetch(`/api/search/${platform}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, domain: domain || undefined, context: context || undefined }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const results: CreativeRecord[] = data.results || data.data || []
        setter({ status: 'success', results, count: results.length })
      } catch (err: unknown) {
        setter({ status: 'error', results: [], count: 0, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    fetchPlatform('meta', setMetaStatus)
    fetchPlatform('google', setGoogleStatus)
    fetchPlatform('tiktok', setTiktokStatus)
  }, [q, domain, context])

  // Merged + filtered + sorted creatives
  const allCreatives: CreativeRecord[] = [...metaStatus.results, ...googleStatus.results, ...tiktokStatus.results]

  let filtered = platformFilter === 'all' ? allCreatives : allCreatives.filter((c) => c.platform === platformFilter)

  if (textFilter.trim()) {
    const lower = textFilter.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        (c.body_text && c.body_text.toLowerCase().includes(lower)) ||
        (c.headline && c.headline.toLowerCase().includes(lower)) ||
        (c.title && c.title.toLowerCase().includes(lower)),
    )
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'recent') {
      const da = a.first_shown ? new Date(a.first_shown).getTime() : 0
      const db = b.first_shown ? new Date(b.first_shown).getTime() : 0
      return db - da
    }
    if (sortBy === 'active') return (b.days_running ?? 0) - (a.days_running ?? 0)
    return (b.view_count ?? 0) - (a.view_count ?? 0)
  })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const selected = sorted.filter((c, i) => selectedIds.has(c.platform_ad_id || `idx-${i}`))
    for (const creative of selected) {
      await supabase.from('creatives').upsert(
        {
          ...creative,
          brand_name: q,
          auto_synced: true,
        },
        { onConflict: 'platform_ad_id' },
      )
    }
    setTimeout(() => {
      setSaving(false)
      setSelectedIds(new Set())
    }, 2000)
  }

  const statusLabel = (ps: PlatformStatus) => {
    if (ps.status === 'loading') return 'fetching...'
    if (ps.status === 'success') return `\u2713 ${ps.count} ads`
    if (ps.status === 'error') return '\u2717 error'
    return ''
  }

  const platformTabs: { key: 'all' | 'meta' | 'google' | 'tiktok'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'meta', label: 'Meta' },
    { key: 'google', label: 'Google' },
    { key: 'tiktok', label: 'TikTok' },
  ]

  const platformStatuses: { name: string; ps: PlatformStatus }[] = [
    { name: 'Meta', ps: metaStatus },
    { name: 'Google', ps: googleStatus },
    { name: 'TikTok', ps: tiktokStatus },
  ]

  return (
    <div style={{ background: V.bg, minHeight: '100vh', fontFamily: FONT_BODY }}>
      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: V.bg,
          borderBottom: `1px solid ${V.border}`,
          padding: '16px 24px',
        }}
      >
        {/* Row 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              onClick={() => router.push('/')}
              style={{ cursor: 'pointer', fontSize: 18, color: V.text1 }}
            >
              &larr;
            </span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 18, fontWeight: 600, color: V.text1 }}>{q}</span>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: V.text3 }}>{credits} credits</span>
        </div>

        {/* Row 2: platform statuses */}
        <div style={{ display: 'flex', gap: 24, marginTop: 12, alignItems: 'center' }}>
          {platformStatuses.map(({ name, ps }) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status={ps.status} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: V.text2 }}>{name}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: V.text2 }}>{statusLabel(ps)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter/sort bar */}
      <div
        style={{
          position: 'sticky',
          top: 76,
          zIndex: 49,
          background: V.bg,
          padding: '12px 24px',
          borderBottom: `1px solid ${V.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {platformTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPlatformFilter(tab.key)}
              style={{
                background: platformFilter === tab.key ? V.accentDim : V.bg1,
                color: platformFilter === tab.key ? V.accent : V.text2,
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontFamily: FONT_BODY,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'active' | 'views')}
          style={{
            background: V.bg1,
            border: `1px solid ${V.border}`,
            color: V.text2,
            borderRadius: 6,
            padding: '6px 12px',
            fontFamily: FONT_MONO,
            fontSize: 12,
            marginLeft: 'auto',
          }}
        >
          <option value="recent">Most Recent</option>
          <option value="active">Most Active</option>
          <option value="views">Most Views</option>
        </select>

        {/* Text filter */}
        <input
          type="text"
          placeholder="Filter copy..."
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          style={{
            background: V.bg1,
            border: `1px solid ${V.border}`,
            borderRadius: 6,
            padding: '6px 12px',
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: V.text1,
            width: 180,
            outline: 'none',
          }}
        />
      </div>

      {/* Creative grid */}
      <div className="creative-grid" style={{ padding: 24 }}>
        {sorted.map((creative, i) => {
          const id = creative.platform_ad_id || `idx-${i}`
          return (
            <CreativeCard
              key={id}
              creative={creative}
              selected={selectedIds.has(id)}
              onToggle={() => toggleSelect(id)}
            />
          )
        })}
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: V.bg1,
            borderTop: `1px solid ${V.border}`,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '0 24px',
          }}
        >
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: V.text2 }}>
            {selectedIds.size} selected
          </span>

          {saving ? (
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: V.accent, fontWeight: 700 }}>Saved!</span>
          ) : (
            <button
              onClick={handleSave}
              style={{
                background: V.accent,
                color: V.bg,
                fontFamily: FONT_MONO,
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              SAVE TO LIBRARY
            </button>
          )}

          <span
            onClick={() => setSelectedIds(new Set())}
            style={{ fontFamily: FONT_BODY, fontSize: 13, color: V.text3, cursor: 'pointer' }}
          >
            Clear
          </span>
        </div>
      )}
    </div>
  )
}

/* ─── Default export with Suspense boundary ─── */
export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ background: '#08080a', color: '#a09ea0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Sans", sans-serif' }}>Loading...</div>}>
      <SearchContent />
    </Suspense>
  )
}
