import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './Button.module.css';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'icon' | 'cta';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: Variant;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant, loading = false, disabled, className, children, ...rest }: ButtonProps) {
  const cls = [s.root, s[variant], className].filter(Boolean).join(' ');
  return (
    <button className={cls} data-variant={variant} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
