import type { ElementType, ComponentPropsWithoutRef } from 'react';
import s from './Pill.module.css';

interface PillOwnProps {
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

type PillProps<T extends ElementType = 'span'> = PillOwnProps & Omit<ComponentPropsWithoutRef<T>, keyof PillOwnProps>;

export function Pill<T extends ElementType = 'span'>({
  as: Tag = 'span' as T,
  className,
  children,
  ...rest
}: PillProps<T>) {
  return (
    <Tag className={className ? `${s.root} ${className}` : s.root} {...rest}>
      {children}
    </Tag>
  );
}
