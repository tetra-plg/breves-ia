import type { ElementType, ComponentPropsWithoutRef, ReactNode } from 'react';
import s from './Card.module.css';

interface CardOwnProps {
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

type CardProps<T extends ElementType = 'div'> = CardOwnProps & Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps>;

export function Card<T extends ElementType = 'div'>({
  as: Tag = 'div' as T,
  className,
  children,
  ...rest
}: CardProps<T>) {
  return (
    <Tag className={className ? `${s.root} ${className}` : s.root} {...rest}>
      {children}
    </Tag>
  );
}
