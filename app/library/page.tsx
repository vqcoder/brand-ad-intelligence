'use client'

import { useState, useEffect, useCallback } from 'react'
import Nav from '../components/Nav'
import { supabase } from '@/lib/supabase'
import { QualityScores, computeOverall } from '@/lib/types'
import { SCORING_CONFIG, DEFAULT_SCORING } from '@/lib/constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Creative = Record<string, any>

function extractYouTubeId(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.searchParams.get('v') ??
      u.pathname.replace('/embed/', '').replace('/', '') ??
      null
  } catch { return null }
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return '\u2014' }
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toString()
}

export default function LibraryPage() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [scores, setScores] = useState<QualityScores>({
    hook: 0,
    brand_fit: 0,
    audience: 0,
    message: 0,
    format_fit: 0,
    production: 0,
  })
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [textFilter, setTextFilter] = useState('')

  const fetchCreatives = useCallback(async () => {
    const { data } = await supabase
      .from('creatives')
      .select('*, brands(name, color)')
      .order('created_at', { ascending: false })
    if (data) {
      // Flatten brand name onto each row for easy access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = data.map((d: any) => ({ ...d, brand_name: d.brands?.name ?? null }))
      setCreatives(rows)
    }
  }, [])

  const fetchBrands = useCallback(async () => {
    const { data } = await supabase
      .from('brands')
      .select('name')
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unique = [...new Set(data.map((d: any) => d.name).filter(Boolean))] as string[]
      setBrands(unique.sort())
    }
  }, [])

  useEffect(() => {
    fetchCreatives()
    fetchBrands()
  }, [fetchCreatives, fetchBrands])

  useEffect(() => {
    if (selectedCreative) {
      setScores({
        hook: selectedCreative.score_hook ?? 0,
        brand_fit: selectedCreative.score_brand ?? 0,
        audience: selectedCreative.score_audience ?? 0,
        message: selectedCreative.score_message ?? 0,
        format_fit: selectedCreative.score_format ?? 0,
        production: selectedCreative.score_production ?? 0,
      })
      setNotes(selectedCreative.notes ?? '')
      setSaveStatus('idle')
    }
  }, [selectedCreative])

  const filtered = creatives.filter((c) => {
    if (platformFilter !== 'all' && c.platform !== platformFilter) return false
    if (brandFilter !== 'all' && c.brand_name !== brandFilter) return false
    if (textFilter) {
      const q = textFilter.toLowerCase()
      const hay = [c.body_text, c.headline, c.page_name, c.brand_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const handleSaveNotes = async () => {
    if (!selectedCreative) return
    await supabase
      .from('creatives')
      .update({ notes })
      .eq('id', selectedCreative.id)
    setSelectedCreative({ ...selectedCreative, notes })
  }

  const handleSaveScores = async () => {
    if (!selectedCreative) return
    const overall = computeOverall(scores, selectedCreative.platform ?? 'meta')
    await supabase
      .from('creatives')
      .update({
        score_hook: scores.hook,
        score_brand: scores.brand_fit,
        score_audience: scores.audience,
        score_message: scores.message,
        score_format: scores.format_fit,
        score_production: scores.production,
        score_overall: overall,
      })
      .eq('id', selectedCreative.id)
    setSelectedCreative({
      ...selectedCreative,
      score_hook: scores.hook,
      score_brand: scores.brand_fit,
      score_audience: scores.audience,
      score_message: scores.message,
      score_format: scores.format_fit,
      score_production: scores.production,
      score_overall: overall,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const platforms = ['all', 'meta', 'google', 'tiktok', 'youtube'] as const
  const platformLabels: Record<string, string> = {
    all: 'All',
    meta: 'Meta',
    google: 'Google',
    tiktok: 'TikTok',
    youtube: 'YouTube',
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: '"DM Sans", sans-serif',
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 6,
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-3)',
    border: active ? 'none' : '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  })

  const sectionHeader = (_text: string): React.CSSProperties => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    color: 'var(--text-3)',
    marginBottom: 12,
  })

  const labelStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    color: 'var(--text-3)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  }

  const valueStyle: React.CSSProperties = {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: 14,
    color: 'var(--text-1)',
    marginTop: 4,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav savedCount={creatives.length} />

      {/* Header */}
      <div
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-1)',
              margin: 0,
            }}
          >
            Library
          </h1>
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            {filtered.length}
          </span>
        </div>

        {/* Right: filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Platform tabs */}
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              style={tabStyle(platformFilter === p)}
            >
              {platformLabels[p]}
            </button>
          ))}

          {/* Brand dropdown */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              borderRadius: 6,
              padding: '6px 12px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Text filter */}
          <input
            type="text"
            placeholder="Filter..."
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 12px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13,
              color: 'var(--text-1)',
              width: 160,
            }}
          />
        </div>
      </div>

      {/* Creative grid */}
      <div style={{ padding: '0 24px 48px' }}>
        <div className="creative-grid">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCreative(c)}
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--text-3)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border)')
              }
            >
              {/* Media area */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  background: 'var(--bg)',
                  overflow: 'hidden',
                }}
              >
                {c.video_url || c.media_url ? (
                  c.media_type === 'video' && c.video_url ? (
                    <video
                      src={c.video_url}
                      poster={c.thumbnail_url ?? undefined}
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <img
                      src={c.thumbnail_url || c.media_url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-3)',
                      fontSize: 28,
                    }}
                  >
                    ◻
                  </div>
                )}

                {/* Platform badge top-left */}
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'var(--text-2)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {c.platform}
                </span>

                {/* Active dot top-right */}
                {c.is_active && (
                  <span
                    className="pulse-dot"
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                    }}
                  />
                )}

                {/* Format badge bottom-right */}
                {c.format && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'var(--text-2)',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {c.format}
                  </span>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: 14 }}>
                {/* Truncated copy */}
                <p
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 13,
                    color: 'var(--text-1)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    margin: 0,
                    minHeight: 40,
                  }}
                >
                  {c.body_text || c.headline || '—'}
                </p>

                {/* CTA pill */}
                {c.cta && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      color: 'var(--accent)',
                      background: 'var(--accent-dim)',
                      padding: '3px 10px',
                      borderRadius: 20,
                    }}
                  >
                    {c.cta}
                  </span>
                )}

                {/* Bottom row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 10,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    color: 'var(--text-3)',
                  }}
                >
                  <span>{formatDate(c.first_shown)}</span>
                  <span>
                    {c.view_count != null ? formatNumber(c.view_count) + ' views' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 64,
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 14,
              color: 'var(--text-3)',
            }}
          >
            No creatives found
          </div>
        )}
      </div>

      {/* Detail panel overlay */}
      {selectedCreative && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setSelectedCreative(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 199,
            }}
          />

          {/* Panel */}
          <div
            className="slide-in"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 420,
              height: '100vh',
              background: 'var(--bg-1)',
              borderLeft: '1px solid var(--border)',
              zIndex: 200,
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {/* 1. Close button row */}
            <div
              style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    background: 'rgba(0,0,0,0.7)',
                    color: 'var(--text-2)',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedCreative.platform}
                </span>
                {selectedCreative.is_active && (
                  <span
                    className="pulse-dot"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                      display: 'inline-block',
                    }}
                  />
                )}
                {selectedCreative.format && (
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >
                    {selectedCreative.format}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedCreative(null)}
                style={{
                  fontSize: 20,
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  lineHeight: 1,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = 'var(--text-1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'var(--text-3)')
                }
              >
                ✕
              </button>
            </div>

            {/* 2. Media */}
            {(() => {
              const isYouTube = selectedCreative.platform === 'youtube'
              const youtubeId = isYouTube
                ? extractYouTubeId(selectedCreative.destination_url ?? selectedCreative.video_url)
                : null
              return (
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'var(--bg)',
                    overflow: 'hidden',
                  }}
                >
                  {isYouTube && youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : selectedCreative.media_type === 'video' && selectedCreative.video_url ? (
                    <video
                      src={selectedCreative.video_url}
                      poster={selectedCreative.thumbnail_url ?? undefined}
                      controls
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : selectedCreative.thumbnail_url || selectedCreative.media_url ? (
                    <img
                      src={selectedCreative.thumbnail_url || selectedCreative.media_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-3)',
                        fontSize: 36,
                      }}
                    >
                      ◻
                    </div>
                  )}
                </div>
              )
            })()}

            {/* 3. Copy section */}
            <div style={{ padding: '0 20px', marginTop: 16 }}>
              <div style={labelStyle}>COPY</div>
              <p
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 14,
                  color: 'var(--text-1)',
                  marginTop: 4,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {selectedCreative.body_text || '—'}
              </p>
            </div>

            {/* 4. Info grid */}
            <div
              style={{
                padding: '0 20px',
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              <div>
                <div style={labelStyle}>CTA</div>
                <div style={valueStyle}>{selectedCreative.cta || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>ADVERTISER</div>
                <div style={valueStyle}>{selectedCreative.page_name || '—'}</div>
              </div>
              <div>
                <div style={labelStyle}>FIRST SEEN</div>
                <div style={valueStyle}>{formatDate(selectedCreative.first_shown)}</div>
              </div>
              <div>
                <div style={labelStyle}>LAST SEEN</div>
                <div style={valueStyle}>{formatDate(selectedCreative.last_shown)}</div>
              </div>
              <div>
                <div style={labelStyle}>RUNNING</div>
                <div style={valueStyle}>
                  {selectedCreative.days_running != null
                    ? `${selectedCreative.days_running} days`
                    : '—'}
                </div>
              </div>
              <div>
                <div style={labelStyle}>REGIONS</div>
                <div style={valueStyle}>
                  {selectedCreative.regions && selectedCreative.regions.length > 0
                    ? selectedCreative.regions.join('  ')
                    : '—'}
                </div>
              </div>
            </div>

            {/* 5. Destination URL */}
            <div style={{ padding: '0 20px', marginTop: 16 }}>
              <div style={labelStyle}>DESTINATION URL</div>
              {selectedCreative.destination_url ? (
                <a
                  href={selectedCreative.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 13,
                    color: 'var(--accent)',
                    display: 'block',
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedCreative.destination_url} ↗
                </a>
              ) : (
                <div style={{ ...valueStyle, fontSize: 13 }}>—</div>
              )}
            </div>

            {/* 6. Engagement */}
            <div style={{ padding: '0 20px', marginTop: 24 }}>
              <div style={sectionHeader('')}>
                ── ENGAGEMENT ─────────
              </div>
              {[
                { label: 'Views', value: selectedCreative.view_count },
                { label: 'Likes', value: selectedCreative.like_count },
                { label: 'Comments', value: selectedCreative.comment_count },
                { label: 'Shares', value: selectedCreative.share_count },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 13,
                      color: 'var(--text-2)',
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 13,
                      color: 'var(--text-1)',
                    }}
                  >
                    {formatNumber(row.value)}
                  </span>
                </div>
              ))}
            </div>

            {/* 7. Metadata */}
            <div style={{ padding: '0 20px', marginTop: 24 }}>
              <div style={sectionHeader('')}>
                ── METADATA ─────────
              </div>
              {[
                { label: 'ad_id', value: selectedCreative.platform_ad_id },
                { label: 'page_id', value: selectedCreative.creative_id },
                { label: 'advertiser_id', value: selectedCreative.advertiser_id },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 0',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 12,
                      color: 'var(--text-2)',
                    }}
                  >
                    {row.label}:{' '}
                    <span style={{ color: 'var(--text-2)' }}>
                      {row.value || '—'}
                    </span>
                  </span>
                  {row.value && (
                    <button
                      onClick={() => copyToClipboard(row.value)}
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 10,
                        color: 'var(--text-3)',
                        cursor: 'pointer',
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        padding: '2px 6px',
                      }}
                    >
                      copy
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 8. Quality Score */}
            {(() => {
              const platform = selectedCreative.platform ?? 'meta'
              const config = SCORING_CONFIG[platform] ?? DEFAULT_SCORING
              const dims = config.dimensions.filter((d) => d.weight > 0)
              const scoresMap = scores as Record<string, number>
              return (
                <div style={{ padding: '0 20px', marginTop: 24 }}>
                  <div style={sectionHeader('')}>
                    ── QUALITY SCORE ─────────
                  </div>
                  {dims.map((dim) => (
                    <div key={dim.key} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: '"DM Sans", sans-serif',
                            fontSize: 13,
                            color: 'var(--text-2)',
                            width: 80,
                            flexShrink: 0,
                          }}
                        >
                          {dim.label}
                        </span>
                        <div
                          style={{
                            width: 120,
                            height: 8,
                            borderRadius: 4,
                            background: 'var(--border)',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${((scoresMap[dim.key] || 0) / 10) * 100}%`,
                              height: '100%',
                              background: 'var(--accent)',
                              borderRadius: 4,
                              transition: 'width 0.15s ease',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: 13,
                            color: 'var(--text-1)',
                            width: 24,
                            textAlign: 'right',
                          }}
                        >
                          {scoresMap[dim.key] || 0}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginLeft: 0 }}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            onClick={() =>
                              setScores((prev) => ({ ...prev, [dim.key]: n }))
                            }
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: 11,
                              background:
                                scoresMap[dim.key] === n
                                  ? 'var(--accent)'
                                  : 'transparent',
                              color:
                                scoresMap[dim.key] === n
                                  ? 'var(--bg)'
                                  : 'var(--text-3)',
                              border:
                                scoresMap[dim.key] === n
                                  ? 'none'
                                  : '1px solid var(--border)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontFamily: '"DM Sans", sans-serif' }}>
                        {dim.guidance}
                      </div>
                    </div>
                  ))}

                  {/* Divider */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border)',
                      margin: '12px 0',
                    }}
                  />

                  {/* Overall score */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: 14,
                        color: 'var(--text-2)',
                      }}
                    >
                      Overall
                    </span>
                    <span
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 18,
                        color: 'var(--accent)',
                        fontWeight: 700,
                      }}
                    >
                      {computeOverall(scores, platform)}
                    </span>
                  </div>
                </div>
              )
            })()}

            {/* 9. Notes */}
            <div style={{ padding: '0 20px', marginTop: 24, marginBottom: 24 }}>
              <div style={labelStyle}>NOTES</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                style={{
                  width: '100%',
                  minHeight: 80,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 14,
                  color: 'var(--text-1)',
                  resize: 'vertical',
                  marginTop: 4,
                  outline: 'none',
                }}
              />
            </div>

            {/* 10. Save Scores button */}
            <div style={{ padding: '0 20px', marginBottom: 32 }}>
              <button
                onClick={handleSaveScores}
                style={{
                  width: '100%',
                  height: 44,
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {saveStatus === 'saved' ? 'Saved!' : 'Save Scores'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
