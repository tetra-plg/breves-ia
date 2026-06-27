import type { InputHTMLAttributes } from 'react';
import s from './Input.module.css';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className ? `${s.root} ${className}` : s.root} {...rest} />;
}
