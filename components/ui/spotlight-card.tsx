"use client";

import React, { useRef, ReactNode } from 'react';

export interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
  spotlightSize?: number;
}

const glowColorMap = {
  blue: { base: 0, spread: 0, sat: 0 },
  purple: { base: 0, spread: 0, sat: 0 },
  green: { base: 0, spread: 0, sat: 0 },
  red: { base: 18, spread: 12, sat: 85 },
  orange: { base: 18, spread: 16, sat: 88 }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const spotlightStyles = `
  .priday-glow-card {
    --glow-opacity: 0;
    --x: -1000px;
    --y: -1000px;
    --hue: 18;
    --sat: 88%;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: #060608;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    background-image: radial-gradient(
      var(--spotlight-size, 420px) circle at var(--x) var(--y),
      rgba(255, 255, 255, calc(0.025 * var(--glow-opacity))),
      rgba(255, 255, 255, calc(0.008 * var(--glow-opacity))) 45%,
      transparent 75%
    );
    background-origin: border-box;
    background-clip: border-box;
    background-repeat: no-repeat;
    transition: border-color 0.25s ease;
  }

  /* Smooth primary border spotlight anchored strictly to border-box (prevents edge/corner tiling) */
  .priday-glow-card::before {
    content: "";
    position: absolute;
    inset: -1px;
    padding: 1.5px;
    border-radius: inherit;
    pointer-events: none;
    opacity: var(--glow-opacity);
    transition: opacity 0.25s ease;
    z-index: 2;
    background-color: transparent;
    background-image: radial-gradient(
      var(--spotlight-size, 420px) circle at var(--x) var(--y),
      hsl(var(--hue, 18) var(--sat, 88%) 62% / 0.48) 0%,
      hsl(var(--hue, 18) var(--sat, 88%) 58% / 0.22) 38%,
      transparent 74%
    );
    background-origin: border-box;
    background-clip: border-box;
    background-repeat: no-repeat;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }

  /* Soft highlight sheen on border closest to cursor, wide enough to flow smoothly past corners */
  .priday-glow-card::after {
    content: "";
    position: absolute;
    inset: -1px;
    padding: 1.5px;
    border-radius: inherit;
    pointer-events: none;
    opacity: var(--glow-opacity);
    transition: opacity 0.25s ease;
    z-index: 3;
    background-color: transparent;
    background-image: radial-gradient(
      calc(var(--spotlight-size, 420px) * 0.68) circle at var(--x) var(--y),
      rgba(255, 255, 255, 0.30) 0%,
      rgba(255, 255, 255, 0.11) 42%,
      transparent 75%
    );
    background-origin: border-box;
    background-clip: border-box;
    background-repeat: no-repeat;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }

  /* Subtle ambient bloom glow along the border */
  .priday-glow-card .glow-ambient-bloom {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    opacity: var(--glow-opacity);
    transition: opacity 0.25s ease;
    filter: blur(16px);
    z-index: 0;
    background-image: radial-gradient(
      calc(var(--spotlight-size, 420px) * 0.8) circle at var(--x) var(--y),
      hsl(var(--hue, 18) var(--sat, 88%) 55% / 0.18) 0%,
      hsl(var(--hue, 18) var(--sat, 88%) 55% / 0.06) 45%,
      transparent 72%
    );
    background-origin: border-box;
    background-clip: border-box;
    background-repeat: no-repeat;
  }
`;

export const GlowCard: React.FC<GlowCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false,
  spotlightSize = 420,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { base, spread, sat } = glowColorMap[glowColor] || glowColorMap.blue;

  const updateCoordinates = (clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const xp = Math.max(0, Math.min(1, x / rect.width));
    const hue = base + xp * (spread * 0.3); // calibrated subtle shift

    card.style.setProperty('--x', `${x.toFixed(1)}px`);
    card.style.setProperty('--y', `${y.toFixed(1)}px`);
    card.style.setProperty('--hue', hue.toFixed(1));
    card.style.setProperty('--sat', `${sat}%`);
    card.style.setProperty('--glow-opacity', '1');
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--glow-opacity', '0');
  };

  const getSizeClasses = () => {
    if (customSize) return '';
    return sizeMap[size];
  };

  const inlineStyles: React.CSSProperties = {
    '--hue': base,
    '--sat': `${sat}%`,
    '--spotlight-size': `${spotlightSize}px`,
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  } as React.CSSProperties;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: spotlightStyles }} />
      <div
        ref={cardRef}
        data-spotlight-card="true"
        style={inlineStyles}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`
          priday-glow-card
          ${getSizeClasses()}
          ${!customSize ? 'aspect-[3/4] p-4 gap-4 grid grid-rows-[1fr_auto]' : ''}
          rounded-[24px] 
          shadow-[0_1rem_2.5rem_-1rem_rgba(0,0,0,0.8)]
          backdrop-blur-[12px]
          ${className}
        `}
      >
        <div className="glow-ambient-bloom" aria-hidden="true" />
        <div className="relative z-10 size-full flex flex-col justify-between">
          {children}
        </div>
      </div>
    </>
  );
};

export default GlowCard;
