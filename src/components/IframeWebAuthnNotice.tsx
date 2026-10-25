import React, { useState } from 'react';
import { ExternalLink, Copy, Check, ShieldAlert, Info } from 'lucide-react';

export interface IframeWebAuthnNoticeProps {
  onDismiss?: () => void;
  className?: string;
}

export function IframeWebAuthnNotice({ onDismiss, className = '' }: IframeWebAuthnNoticeProps) {
  const [copied, setCopied] = useState(false);

  // Extract clean direct URL (removing iframe wrappers or internal query tags if needed)
  const getDirectUrl = () => {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      // Strip embedding sandbox parameters if present
      url.searchParams.delete('embed');
      url.searchParams.delete('preview');
      return url.toString();
    } catch {
      return window.location.href;
    }
  };

  const handleCopyLink = async () => {
    const directUrl = getDirectUrl();
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = directUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenDirect = () => {
    const directUrl = getDirectUrl();
    // Prefer opening in a top-level tab or window.top if permissible
    if (typeof window !== 'undefined') {
      try {
        if (window.top && window.top !== window.self) {
          window.open(directUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.open(directUrl, '_blank', 'noopener,noreferrer');
        }
      } catch {
        window.open(directUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div
      className={`
        relative rounded-2xl p-5 border shadow-xl backdrop-blur-md select-none transition-all
        bg-gradient-to-r from-amber-950/40 via-neutral-900/90 to-neutral-900 border-amber-500/35 text-white
        ${className}
      `}
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2">
              Passkey / WebAuthn Restricted in Embedded Preview
            </h4>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-neutral-400 hover:text-white text-xs px-2 py-0.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            By default, W3C WebAuthn security specifications restrict biometric sensors (<code className="text-amber-300/90 font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded">navigator.credentials.create()</code>) inside cross-origin iframes.
          </p>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Even with server <code className="text-neutral-300 font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded">Permissions-Policy: publickey-credentials-create=*</code> headers enabled, the host page embedding this iframe must also specify <code className="text-neutral-300 font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded">allow="publickey-credentials-create"</code> on its <code className="text-neutral-300 font-mono text-[10px]">&lt;iframe&gt;</code> tag.
          </p>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={handleOpenDirect}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-bold text-xs transition-all duration-150 shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Direct Browser Tab</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 active:scale-[0.98] text-neutral-200 border border-neutral-700 text-xs font-semibold transition-all duration-150"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy Direct Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
