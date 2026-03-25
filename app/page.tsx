'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from './components/Nav'
import { supabase } from '@/lib/supabase'

interface SearchHistoryItem {
  id: string
  query: string
  created_at: string
}

export default function Home() {
  const router = useRouter()
  const [inputValue, setInputValue] = useState('')
  const [metaUrl, setMetaUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [domain, setDomain] = useState('')
  const [context, setContext] = useState('')
  const [platforms, setPlatforms] = useState({ meta: true, google: true, tiktok: true, youtube: true })
  const [showRefine, setShowRefine] = useState(false)
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([])

  useEffect(() => {
    async function loadRecentSearches() {
      const { data } = await supabase
        .from('search_history')
        .select('id, query, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) {
        setRecentSearches(data)
      }
    }
    loadRecentSearches()
  }, [])

  const handleSubmit = async () => {
    if (!inputValue.trim()) return
    await supabase.from('search_history').insert({ query: inputValue.trim() })
    const params = new URLSearchParams({ q: inputValue.trim() })
    const selectedPlatforms = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k).join(',')
    params.set('platforms', selectedPlatforms)
    if (metaUrl.trim()) params.set('meta_url', metaUrl.trim())
    if (youtubeUrl.trim()) params.set('youtube_url', youtubeUrl.trim())
    if (tiktokUrl.trim()) params.set('tiktok_url', tiktokUrl.trim())
    if (domain.trim()) params.set('domain', domain.trim())
    if (context.trim()) params.set('context', context.trim())
    router.push(`/search?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 52px)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Label */}
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              marginBottom: 12,
            }}
          >
            AD INTELLIGENCE
          </span>

          {/* Heading */}
          <h1
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: 48,
              fontWeight: 700,
              color: 'var(--text-1)',
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Find Ads
          </h1>

          {/* Subtext */}
          <p
            style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 15,
              color: 'var(--text-2)',
              marginTop: 0,
              marginBottom: 32,
            }}
          >
            Search any brand across Meta, Google, TikTok &amp; YouTube
          </p>

          {/* Search input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Brand name, e.g. Nike, Equinox..."
            style={{
              width: '100%',
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 16,
              height: 48,
              borderRadius: 'var(--radius)',
              padding: '0 16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          />

          {/* Refine toggle */}
          <button
            onClick={() => setShowRefine(!showRefine)}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13,
              color: 'var(--text-3)',
              cursor: 'pointer',
              marginTop: 8,
              padding: 0,
            }}
          >
            {showRefine ? '− Less options' : '+ Refine search'}
          </button>

          {/* Refinement fields */}
          <div
            style={{
              width: '100%',
              maxHeight: showRefine ? 600 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease',
              opacity: showRefine ? 1 : 0,
            }}
          >
            {/* Per-platform URL fields */}
            {([
              { key: 'meta' as const, icon: '\u25C8', label: 'Meta / Instagram URL', placeholder: 'https://www.instagram.com/equinox/', value: metaUrl, setter: setMetaUrl },
              { key: 'youtube' as const, icon: '\u25B6', label: 'YouTube Channel URL', placeholder: 'https://www.youtube.com/@Equinox', value: youtubeUrl, setter: setYoutubeUrl },
              { key: 'tiktok' as const, icon: '\u266A', label: 'TikTok Profile URL', placeholder: 'https://www.tiktok.com/@equinox', value: tiktokUrl, setter: setTiktokUrl },
              { key: 'google' as const, icon: '\u25C9', label: 'Google / Website Domain', placeholder: 'https://www.equinox.com', value: domain, setter: setDomain },
            ]).map(({ key, icon, label, placeholder, value, setter }) => (
              platforms[key] && (
                <div key={key} style={{ marginTop: 8 }}>
                  <span
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 11,
                      color: 'var(--text-3)',
                      display: 'block',
                      marginBottom: 2,
                      paddingLeft: 2,
                    }}
                  >
                    {icon} {label}
                  </span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    aria-label={label}
                    style={{
                      width: '100%',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-1)',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 14,
                      borderRadius: 'var(--radius)',
                      padding: 12,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )
            ))}

            {/* Brand context */}
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Equinox is a luxury gym and fitness club..."
              rows={2}
              aria-label="What does this brand do? (optional)"
              style={{
                width: '100%',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 14,
                borderRadius: 'var(--radius)',
                padding: 12,
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
                marginTop: 8,
              }}
            />
            <span
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 11,
                color: 'var(--text-3)',
                display: 'block',
                marginTop: 2,
                paddingLeft: 2,
              }}
            >
              What does this brand do? (optional)
            </span>
          </div>

          {/* Platform checkboxes */}
          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 24px',
              justifyContent: 'center',
            }}
          >
            {([
              { key: 'meta' as const, icon: '\u25C8', label: 'Meta' },
              { key: 'google' as const, icon: '\u25C9', label: 'Google' },
              { key: 'tiktok' as const, icon: '\u266A', label: 'TikTok' },
              { key: 'youtube' as const, icon: '\u25B6', label: 'YouTube' },
            ]).map(({ key, icon, label }) => {
              const checked = platforms[key]
              return (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    const otherChecked = Object.entries(platforms).some(([k, v]) => k !== key && v)
                    if (!checked || otherChecked) {
                      setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      background: checked ? 'var(--accent)' : 'var(--bg-1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'var(--bg)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {checked ? '\u2713' : ''}
                  </span>
                  <span
                    style={{
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 12,
                      color: 'var(--text-2)',
                    }}
                  >
                    {icon} {label}
                  </span>
                </label>
              )
            })}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              marginTop: 24,
              background: 'var(--accent)',
              color: 'var(--bg)',
              textTransform: 'uppercase',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: 14,
              height: 48,
              borderRadius: 'var(--radius)',
              letterSpacing: 1,
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            SEARCH ADS
          </button>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div style={{ marginTop: 32, width: '100%' }}>
              <span
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                Recent searches
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {recentSearches.map((item) => (
                  <span
                    key={item.id}
                    onClick={() =>
                      router.push(
                        `/search?q=${encodeURIComponent(item.query)}`
                      )
                    }
                    style={{
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      padding: '6px 14px',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: 13,
                      color: 'var(--text-2)',
                      cursor: 'pointer',
                    }}
                  >
                    {item.query}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
