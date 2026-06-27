import type { HTMLAttributes, ReactNode } from 'react';
import s from './Alert.module.css';

type Tone = 'accent' | 'good' | 'warn' | 'nuance';
interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  children: ReactNode;
}

export function Alert({ tone = 'accent', children, className, ...rest }: AlertProps) {
  const cls = [s.root, s[tone], className].filter(Boolean).join(' ');
  return <div className={cls} data-tone={tone} {...rest}>{children}</div>;
}
