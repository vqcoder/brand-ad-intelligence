'use client';

import { useState, useEffect } from 'react';
import Nav from '../components/Nav';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('SC_API_KEY');
    if (savedKey) setApiKey(savedKey);
    const savedCredits = localStorage.getItem('SCRAPECREATORS_CREDITS');
    if (savedCredits && Number(savedCredits) >= 0) {
      setCredits(Number(savedCredits));
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKey(value);
    localStorage.setItem('SC_API_KEY', value);
  };

  const handleCheckCredits = async () => {
    setLoading(true);
    setCreditsError(null);
    try {
      const res = await fetch('/api/credits', {
        headers: { 'x-api-key': apiKey },
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setCreditsError(data.error || `Request failed (${res.status})`);
        setCredits(null);
        localStorage.removeItem('SCRAPECREATORS_CREDITS');
        return;
      }

      const remaining = Number(data.credits_remaining);
      setCredits(remaining);
      setCreditsError(null);
      localStorage.setItem('SCRAPECREATORS_CREDITS', String(remaining));
    } catch {
      setCreditsError('Network error — could not reach server');
      setCredits(null);
      localStorage.removeItem('SCRAPECREATORS_CREDITS');
    } finally {
      setLoading(false);
    }
  };

  const hasApiKey = apiKey.length > 0;

  const sectionLabel: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    color: 'var(--text-3)',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 16,
  };

  const card: React.CSSProperties = {
    background: 'var(--bg-1)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
  };

  return (
    <div
      style={{
        ['--bg' as string]: '#08080a',
        ['--bg-1' as string]: '#111116',
        ['--border' as string]: '#26262f',
        ['--text-1' as string]: '#e8e6e3',
        ['--text-2' as string]: '#a09ea0',
        ['--text-3' as string]: '#5a585c',
        ['--accent' as string]: '#c8f031',
        ['--accent-dim' as string]: 'rgba(200,240,49,0.15)',
        ['--danger' as string]: '#e85d24',
        ['--radius' as string]: '8px',
        ['--radius-lg' as string]: '12px',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-1)',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <Nav />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px' }}>
        {/* API Configuration */}
        <div style={sectionLabel}>API CONFIGURATION</div>
        <div style={card}>
          <label
            style={{
              display: 'block',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13,
              color: 'var(--text-2)',
              marginBottom: 8,
            }}
          >
            ScrapeCreators API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="sk-..."
            style={{
              width: '100%',
              height: 44,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0 14px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 14,
              color: 'var(--text-1)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleCheckCredits}
            disabled={loading}
            style={{
              marginTop: 16,
              width: '100%',
              height: 44,
              background: 'var(--accent)',
              color: 'var(--bg)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              borderRadius: 8,
              letterSpacing: 1,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Checking...' : 'Check Credits'}
          </button>
        </div>

        {/* Credit Balance */}
        <div style={{ marginTop: 32 }}>
          <div style={sectionLabel}>CREDIT BALANCE</div>
          <div style={card}>
            {loading ? (
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 16,
                  color: 'var(--text-3)',
                }}
              >
                Checking...
              </div>
            ) : creditsError ? (
              <>
                <div
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 16,
                    color: 'var(--danger)',
                  }}
                >
                  Could not fetch — check API key
                </div>
                <div
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 12,
                    color: 'var(--text-3)',
                    marginTop: 8,
                  }}
                >
                  {creditsError}
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 48,
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}
                >
                  {credits !== null ? credits : '\u2014'}
                </div>
                <div
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 14,
                    color: 'var(--text-2)',
                  }}
                >
                  credits remaining
                </div>
              </>
            )}
          </div>
        </div>

        {/* Platform Status */}
        <div style={{ marginTop: 32 }}>
          <div style={sectionLabel}>PLATFORMS</div>
          <div style={card}>
            {[
              { icon: '\u25C8', name: 'Meta' },
              { icon: '\u25C9', name: 'Google' },
              { icon: '\u266A', name: 'TikTok' },
            ].map((platform, i) => (
              <div
                key={platform.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom:
                    i < 2 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 14,
                    color: 'var(--text-1)',
                  }}
                >
                  {platform.icon} {platform.name}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: hasApiKey ? '#4ade80' : 'var(--text-3)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: hasApiKey ? '#4ade80' : 'var(--text-3)',
                    }}
                  />
                  {hasApiKey ? 'Available' : 'Requires API key'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div style={{ marginTop: 32 }}>
          <div style={sectionLabel}>RESOURCES</div>
          <div style={card}>
            <div>
              <a
                href="https://app.scrapecreators.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 14,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  display: 'block',
                  padding: '8px 0',
                }}
              >
                Get API Key &rarr;
              </a>
            </div>
            <div>
              <a
                href="https://docs.scrapecreators.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 14,
                  color: 'var(--text-2)',
                  textDecoration: 'none',
                  display: 'block',
                  padding: '8px 0',
                }}
              >
                API Documentation &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
