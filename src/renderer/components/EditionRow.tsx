import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

interface EditionRowProps {
  edition: EditionSummary;
  onOpen: (edition: EditionSummary) => void;
}

export function EditionRow({ edition, onOpen }: EditionRowProps) {
  return (
    <button className="edition" onClick={() => onOpen(edition)}>
      <span className="r">{dateLong(edition.date)}</span>
      <span className="m">
        {edition.count} brèves · {edition.corr} corr.
      </span>
    </button>
  );
}
