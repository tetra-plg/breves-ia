import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClose?: () => void;
  durationMs?: number;
}

export function Toast({ message, onClose, durationMs = 3500 }: ToastProps) {
  // Auto-fermeture : sans ça, le toast restait affiché indéfiniment.
  // Le timer se ré-arme à chaque nouveau message et se nettoie au démontage.
  useEffect(() => {
    if (!message || !onClose) return;
    const id = setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [message, onClose, durationMs]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
