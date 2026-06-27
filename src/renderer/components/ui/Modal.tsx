import type { CSSProperties, ReactNode } from 'react';
import s from './Modal.module.css';

export function Overlay({
  children,
  onClose,
  style,
}: {
  children: ReactNode;
  onClose?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      className={s.overlay}
      style={style}
      onClick={
        onClose
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function Modal({ children }: { children: ReactNode }) {
  return <div className={s.modal}>{children}</div>;
}

export function Sheet({ children }: { children: ReactNode }) {
  return <div className={s.sheet}>{children}</div>;
}
