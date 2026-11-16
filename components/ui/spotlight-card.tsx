"use client";

import React, { useEffect, useRef, ReactNode } from 'react';

export interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean; // When true, ignores size prop and uses width/height or className
  spotlightSize?: number;
}

const glowColorMap = {
  blue: { base: 215, spread: 180 },
  purple: { base: 280, spread: 300 },
  green: { base: 150, spread: 160 },
  red: { base: 0, spread: 200 },
  orange: { base: 28, spread: 160 },
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96',
};

const beforeAfterStyles = `
  [data-glow]::before,
  [data-glow]::after {
    pointer-events: none;
    content: "";
    position: absolute;
    inset: calc(var(--border-size) * -1);
    border: var(--border-size) solid transparent;
    border-radius: calc(var(--radius) * 1px);
    background-attachment: fixed;
    background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
    background-repeat: no-repeat;
    background-position: 50% 50%;
    -webkit-mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    -webkit-mask-clip: padding-box, border-box;
    -webkit-mask-composite: source-in, xor;
    mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
    mask-clip: padding-box, border-box;
    mask-composite: intersect;
  }
  
  [data-glow]::before {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 55) * 1%) / var(--border-spot-opacity, 0.9)), transparent 100%
    );
    filter: brightness(1.8);
  }
  
  [data-glow]::after {
    background-image: radial-gradient(
      calc(var(--spotlight-size) * 0.45) calc(var(--spotlight-size) * 0.45) at
      calc(var(--x, 0) * 1px)
      calc(var(--y, 0) * 1px),
      hsl(0 100% 100% / var(--border-light-opacity, 0.95)), transparent 100%
    );
  }
  
  [data-glow] [data-glow] {
    position: absolute;
    inset: 0;
    will-change: filter;
    opacity: var(--outer, 1);
    border-radius: calc(var(--radius) * 1px);
    border-width: calc(var(--border-size) * 20);
    filter: blur(calc(var(--border-size) * 10));
    background: none;
    pointer-events: none;
    border: none;
  }
  
  [data-glow] > [data-glow]::before {
    inset: -10px;
    border-width: 10px;
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
  spotlightSize = 320,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      
      if (cardRef.current) {
        cardRef.current.style.setProperty('--x', x.toFixed(2));
        cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty('--y', y.toFixed(2));
        cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
      }
    };

    window.addEventListener('pointermove', syncPointer, { passive: true });
    return () => window.removeEventListener('pointermove', syncPointer);
  }, []);

  const { base, spread } = glowColorMap[glowColor] || glowColorMap.blue;

  // Determine sizing
  const getSizeClasses = () => {
    if (customSize) {
      return ''; // Let className handle sizing
    }
    return sizeMap[size];
  };

  const getInlineStyles = (): React.CSSProperties => {
    const baseStyles: Record<string, string | number> = {
      '--base': base,
      '--spread': spread,
      '--radius': '24',
      '--border': '2',
      '--backdrop': 'rgba(18, 18, 20, 0.85)',
      '--backup-border': 'rgba(255, 255, 255, 0.08)',
      '--size': spotlightSize,
      '--outer': '1',
      '--border-size': 'calc(var(--border, 2) * 1px)',
      '--spotlight-size': 'calc(var(--size, 300) * 1px)',
      '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, -1000) * 1px)
        calc(var(--y, -1000) * 1px),
        hsl(var(--hue, 210) 90% 60% / 0.12), transparent
      )`,
      backgroundColor: 'var(--backdrop, #121214)',
      backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
      backgroundPosition: '50% 50%',
      backgroundAttachment: 'fixed',
      border: 'var(--border-size) solid var(--backup-border)',
      position: 'relative',
      touchAction: 'pan-y', // Keep mobile scrolling smooth
    };

    if (width !== undefined) {
      baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return baseStyles as unknown as React.CSSProperties;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: beforeAfterStyles }} />
      <div
        ref={cardRef}
        data-glow
        style={getInlineStyles()}
        className={`
          ${getSizeClasses()}
          ${!customSize ? 'aspect-[3/4] p-4 gap-4 grid grid-rows-[1fr_auto]' : ''}
          rounded-[24px] 
          relative 
          shadow-[0_1rem_2.5rem_-1rem_rgba(0,0,0,0.8)]
          backdrop-blur-[12px]
          transition-all duration-300
          ${className}
        `}
      >
        <div ref={innerRef} data-glow />
        {children}
      </div>
    </>
  );
};

export default GlowCard;
