import type { TextareaHTMLAttributes } from 'react';
import s from './Textarea.module.css';

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={className ? `${s.root} ${className}` : s.root} {...rest} />;
}
