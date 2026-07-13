'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface PanelShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

// eslint-disable-next-line max-lines-per-function -- Accessibility lifecycle and compact dialog shell remain one reusable component.
export function PanelShell({
  eyebrow,
  title,
  description,
  children,
  actions,
  onClose,
  wide = false,
}: PanelShellProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="panel-layer"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && onClose()}
    >
      <section
        className={wide ? 'game-panel wide' : 'game-panel'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        <header className="panel-header">
          <div>
            <span className="section-kicker">{eyebrow}</span>
            <h2 id="panel-title">{title}</h2>
            <p>{description}</p>
          </div>
          <div className="panel-header-actions">
            {actions}
            <button
              className="icon-button"
              type="button"
              onClick={onClose}
              title="关闭"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="panel-content">{children}</div>
      </section>
    </div>
  );
}
