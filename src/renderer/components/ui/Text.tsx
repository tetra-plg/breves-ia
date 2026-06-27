import type { CSSProperties, ReactNode } from 'react';
import s from './Text.module.css';

interface TextProps {
  tone: 'muted' | 'faint';
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
  className?: string;
  style?: CSSProperties;
}

export function Text({ tone, children, as: Tag = 'span', className, style }: TextProps) {
  const cls = [s[tone], className].filter(Boolean).join(' ');
  return <Tag className={cls} data-tone={tone} style={style}>{children}</Tag>;
}
