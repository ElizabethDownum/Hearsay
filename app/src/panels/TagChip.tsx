import { useState } from 'react';
import type { TagNote } from '../../../src/intel/types';

/**
 * Margin notes (amendment #5b), the verdigris "your things" surface. Renders wherever an
 * NPC / entry / cluster shows. Props-only: the composition root owns the tag verbs (add/remove
 * submit through the session log), this just displays the chips pinned to one `target` and offers
 * a one-line composer. Tags are UI-only and sim-blind by law — read by no model function.
 */
export function TagChip({
  tags, target, onAdd, onRemove,
}: { tags: TagNote[]; target: string; onAdd(text: string): void; onRemove(id: string): void }) {
  const [draft, setDraft] = useState('');
  const mine = tags.filter((t) => t.target === target);
  const commit = () => {
    const text = draft.trim();
    if (text.length === 0) return;
    onAdd(text);
    setDraft('');
  };
  return (
    <div className="tag-row">
      {mine.map((t) => (
        <span key={t.id} className="tag-chip">
          {t.text}
          <button type="button" aria-label={`remove note ${t.text}`} onClick={() => onRemove(t.id)}>×</button>
        </span>
      ))}
      <input
        value={draft}
        placeholder="+ note"
        aria-label={`add a margin note to ${target}`}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        onBlur={commit}
      />
    </div>
  );
}
