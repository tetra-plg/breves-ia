// src/renderer/components/ui/Eyebrow.tsx
import type { CSSProperties, ReactNode } from 'react';
import s from './Eyebrow.module.css';

interface EyebrowProps {
  children: ReactNode;
  as?: 'div' | 'span' | 'p';
  className?: string;
  style?: CSSProperties;
}

export function Eyebrow({ children, as: Tag = 'div', className, style }: EyebrowProps) {
  return <Tag className={className ? `${s.root} ${className}` : s.root} style={style}>{children}</Tag>;
}
