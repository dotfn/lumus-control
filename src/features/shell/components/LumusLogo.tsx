import React, { useId } from 'react';

export interface LumusLogoProps {
  /**
   * - `icon`: Renderiza el icono 3D oficial (`/app-icon.png`) con esquinas squircle transparentes.
   * - `badge`: Adaptación vectorial completa sobre squircle oscuro para tamaños pequeños (navbar, cabeceras).
   * - `glyph`: Adaptación vectorial simplificada (silueta de lámpara colgante con tirador, sin caja) donde la imagen 3D no aplica.
   */
  variant?: 'icon' | 'badge' | 'glyph';
  size?: number;
  className?: string;
}

export const LumusLogo: React.FC<LumusLogoProps> = ({
  variant = 'badge',
  size = 32,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');

  if (variant === 'icon') {
    return (
      <img
        src="/app-icon.png"
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`select-none object-contain ${className}`.trim()}
      />
    );
  }

  if (variant === 'glyph') {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
        className={className}
      >
        {/* Cable superior */}
        <rect x="11.15" y="1.5" width="1.7" height="5.5" rx="0.85" fill="currentColor" opacity="0.85" />
        {/* Casquillo superior */}
        <path
          d="M9.4 7.5C9.4 6.2 10.3 5.6 12 5.6C13.7 5.6 14.6 6.2 14.6 7.5V9.5H9.4V7.5Z"
          fill="currentColor"
          opacity="0.9"
        />
        {/* Bombilla cálida central */}
        <circle cx="12" cy="14.9" r="3.4" fill="#ffb454" />
        {/* Pantalla semiesférica */}
        <path
          d="M4.2 14C4.6 9.1 7.8 7.5 12 7.5C16.2 7.5 19.4 9.1 19.8 14C17.2 12.9 6.8 12.9 4.2 14Z"
          fill="currentColor"
        />
        {/* Cadena tirador derecha y esfera */}
        <rect x="17.55" y="13.5" width="1.3" height="5.2" rx="0.65" fill="currentColor" opacity="0.8" />
        <circle cx="18.2" cy="19.6" r="1.45" fill="#ffb454" />
      </svg>
    );
  }

  const bgId = `lumus-bg-${uid}`;
  const rimId = `lumus-rim-${uid}`;
  const glowId = `lumus-glow-${uid}`;
  const domeId = `lumus-dome-${uid}`;
  const innerId = `lumus-inner-${uid}`;
  const bulbId = `lumus-bulb-${uid}`;
  const clipId = `lumus-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
    >
      <defs>
        <linearGradient id={bgId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#2c2d33" />
          <stop offset="50%" stopColor="#151519" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id={rimId} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="62%" r="48%">
          <stop offset="0%" stopColor="#ff9f2e" stopOpacity="0.62" />
          <stop offset="65%" stopColor="#ff8811" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ff8811" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={domeId} x1="20%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#dcdbe0" />
          <stop offset="100%" stopColor="#8c8994" />
        </linearGradient>
        <linearGradient id={innerId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#d48432" />
          <stop offset="50%" stopColor="#ffe6a3" />
          <stop offset="100%" stopColor="#b86b1f" />
        </linearGradient>
        <radialGradient id={bulbId} cx="50%" cy="45%" r="52%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#fff3b8" />
          <stop offset="100%" stopColor="#ffaa2b" />
        </radialGradient>
        <clipPath id={clipId}>
          <rect width="32" height="32" rx="7.5" ry="7.5" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width="32" height="32" rx="7.5" ry="7.5" fill={`url(#${bgId})`} />
        <circle cx="16" cy="19.5" r="13" fill={`url(#${glowId})`} />
        <rect x="15.1" y="0" width="1.8" height="7.5" fill="#dcdbe0" />
        <rect x="23.1" y="17.2" width="1.3" height="6.2" rx="0.65" fill="#edd3ad" />
        <circle cx="23.75" cy="24.2" r="1.65" fill="#f5e1c0" />
        <path
          d="M 13.2,8.8 C 13.2,7.2 14.2,6.5 16,6.5 C 17.8,6.5 18.8,7.2 18.8,8.8 L 18.8,11.2 L 13.2,11.2 Z"
          fill="#d0cfd6"
        />
        <ellipse cx="16" cy="17.4" rx="9.5" ry="1.8" fill={`url(#${innerId})`} />
        <circle cx="16" cy="18.5" r="4.3" fill={`url(#${bulbId})`} />
        <path
          d="M 6.5,17.4 C 6.8,11.4 10.8,9.4 16,9.4 C 21.2,9.4 25.2,11.4 25.5,17.4 C 22.4,16.1 9.6,16.1 6.5,17.4 Z"
          fill={`url(#${domeId})`}
        />
      </g>

      <rect
        x="0.4"
        y="0.4"
        width="31.2"
        height="31.2"
        rx="7.1"
        ry="7.1"
        fill="none"
        stroke={`url(#${rimId})`}
        strokeWidth="0.8"
      />
    </svg>
  );
};
