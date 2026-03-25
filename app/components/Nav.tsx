'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  savedCount?: number;
}

export default function Nav({ savedCount }: NavProps) {
  const pathname = usePathname();
  const [credits, setCredits] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    setCredits(localStorage.getItem('SCRAPECREATORS_CREDITS'));
  }, []);

  if (pathname === '/search') return null;

  const linkStyle = (key: string): React.CSSProperties => ({
    fontFamily: '"DM Sans", sans-serif',
    fontSize: 13,
    color: hoveredLink === key ? 'var(--text-1)' : 'var(--text-2)',
    textDecoration: 'none',
    transition: 'color 0.15s ease',
  });

  return (
    <nav
      style={{
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-1)',
        borderBottom: '1px solid var(--border)',
        height: 52,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'var(--text-3)',
        }}
      >
        AD INTELLIGENCE
      </span>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 20,
          alignItems: 'center',
        }}
      >
        <Link
          href="/library"
          style={linkStyle('library')}
          onMouseEnter={() => setHoveredLink('library')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Library
          {savedCount != null && savedCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                fontSize: 10,
                fontFamily: '"JetBrains Mono", monospace',
                padding: '2px 6px',
                borderRadius: 10,
              }}
            >
              {savedCount}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          style={linkStyle('settings')}
          onMouseEnter={() => setHoveredLink('settings')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Settings
        </Link>

        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 12,
            color: 'var(--text-3)',
          }}
        >
          {credits !== null ? `${credits} cr` : ''}
        </span>
      </div>
    </nav>
  );
}
