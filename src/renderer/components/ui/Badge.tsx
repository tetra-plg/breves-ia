import type { ReactNode } from 'react';
import s from './Badge.module.css';

type Tone = 'good' | 'warn' | 'nuance' | 'accent';
interface BadgeProps { tone?: Tone; children: ReactNode; }

export function Badge({ tone = 'good', children }: BadgeProps) {
  return <span className={`${s.root} ${s[tone]}`} data-tone={tone}>{children}</span>;
}
