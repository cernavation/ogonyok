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
  blue: { base: 220, spread: 180 },
  purple: { base: 280, spread: 260 },
  green: { base: 145, spread: 160 },
  red: { base: 0, spread: 200 },
  orange: { base: 28, spread: 160 }
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
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(16, 18, 24, 0.75);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    background-image: radial-gradient(
      var(--spotlight-size, 260px) circle at var(--x) var(--y),
      hsl(var(--hue, 220) 90% 60% / calc(0.12 * var(--glow-opacity))),
      transparent 70%
    );
    transition: border-color 0.25s ease;
  }

  /* Sharp border spotlight */
  .priday-glow-card::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    border: 1.5px solid transparent;
    pointer-events: none;
    opacity: var(--glow-opacity);
    transition: opacity 0.25s ease;
    z-index: 2;
    background: radial-gradient(
      var(--spotlight-size, 260px) circle at var(--x) var(--y),
      hsl(var(--hue, 220) 100% 62%),
      transparent 70%
    );
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }

  /* White bright focus core on the border directly under cursor */
  .priday-glow-card::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    border: 1.5px solid transparent;
    pointer-events: none;
    opacity: var(--glow-opacity);
    transition: opacity 0.25s ease;
    z-index: 3;
    background: radial-gradient(
      calc(var(--spotlight-size, 260px) * 0.45) circle at var(--x) var(--y),
      rgba(255, 255, 255, 0.95),
      transparent 75%
    );
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
  }

  /* Ambient bloom glow behind the border */
  .priday-glow-card .glow-ambient-bloom {
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    pointer-events: none;
    opacity: var(--glow-opacity);
    transition: opacity 0.25s ease;
    filter: blur(14px);
    z-index: 0;
    background: radial-gradient(
      calc(var(--spotlight-size, 260px) * 0.75) circle at var(--x) var(--y),
      hsl(var(--hue, 220) 100% 55% / 0.45),
      transparent 70%
    );
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
  spotlightSize = 260,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { base, spread } = glowColorMap[glowColor] || glowColorMap.blue;

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
