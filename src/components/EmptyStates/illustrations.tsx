/**
 * Inline SVG illustrations for empty states. Single-color, theme-aware via currentColor.
 */
import type { SVGProps } from 'react';

export function EmptyLibraryArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 220 130" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="22" y="20" width="64" height="80" rx="6" strokeWidth="1.4" />
      <rect x="32" y="32" width="44" height="3" rx="1.5" strokeWidth="1.4" />
      <rect x="32" y="42" width="34" height="3" rx="1.5" strokeWidth="1.4" />
      <rect x="32" y="52" width="38" height="3" rx="1.5" strokeWidth="1.4" />
      <rect x="92" y="34" width="64" height="80" rx="6" strokeWidth="1.4" opacity="0.55" />
      <rect x="102" y="46" width="44" height="3" rx="1.5" strokeWidth="1.4" opacity="0.55" />
      <rect x="102" y="56" width="30" height="3" rx="1.5" strokeWidth="1.4" opacity="0.55" />
      <rect x="162" y="48" width="36" height="80" rx="6" strokeWidth="1.4" opacity="0.3" />
    </svg>
  );
}

export function EmptyEditorArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 220 130" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="22" y="22" width="176" height="86" rx="8" strokeWidth="1.4" strokeDasharray="4 4" />
      <path d="M86 65l14 14 34-34" strokeWidth="1.6" />
      <circle cx="50" cy="42" r="3" />
      <circle cx="64" cy="42" r="3" />
      <circle cx="78" cy="42" r="3" />
    </svg>
  );
}

export function EmptyDeployArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 220 130" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M110 18l30 30-12 12-12-12v60h-12v-60l-12 12-12-12z" strokeWidth="1.4" />
      <path d="M76 100h68" strokeWidth="1.4" opacity="0.5" />
      <path d="M88 110h44" strokeWidth="1.4" opacity="0.3" />
    </svg>
  );
}
