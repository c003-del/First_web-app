"use client";

import { useRef, useState, useTransition } from "react";
import { saveTextBlock } from "@/app/admin/texts/actions";
import { MAX_TEXT_BYTES } from "@/lib/text-blocks";

type Props = {
  /** text_blocks key, e.g. "home.hero.headline". */
  tKey: string;
  /** Current value (already resolved server-side, with fallback applied). */
  value: string;
  /** Only true for owner|admin at AAL2. When false, renders plain text only. */
  editable: boolean;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  multiline?: boolean;
  /** Character cap for the editor (bytes are re-validated on the server). */
  maxLength?: number;
};

/**
 * Inline plain-text editor for admins (guidelines §4, §11):
 *   - Non-editors get a plain element — no editor markup in the DOM.
 *   - Editors get a hover "편집" affordance; editing opens an input/textarea
 *     with explicit 저장/취소, a live character count, and Escape-to-cancel.
 *   - Values are plain text (no HTML). Server re-checks auth + byte length.
 *   - Optimistic update with rollback + error message on failure.
 */
export function EditableText({
  tKey,
  value,
  editable,
  as = "p",
  className,
  multiline = false,
  maxLength = 400,
}: Props) {
  const Tag = as;
  const [current, setCurrent] = useState(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const committed = useRef(value);

  if (!editable) {
    return <Tag className={className}>{current}</Tag>;
  }

  function open() {
    setDraft(current);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(current);
    setError(null);
    setEditing(false);
  }

  function save() {
    const next = draft.trim();
    setError(null);
    // Optimistic: show the new value immediately, roll back on failure.
    const previous = committed.current;
    setCurrent(next);
    setEditing(false);
    startTransition(async () => {
      const res = await saveTextBlock(tKey, next);
      if (res.ok) {
        committed.current = next;
      } else {
        setCurrent(previous);
        setError(res.error ?? "저장에 실패했습니다.");
        setEditing(true);
      }
    });
  }

  if (!editing) {
    return (
      <Tag className={className}>
        {current}
        <button
          type="button"
          onClick={open}
          className="ml-2 align-middle rounded border border-soft px-1.5 py-0.5 text-[11px] font-normal text-ink-muted hover:bg-surface-1"
          aria-label={`${tKey} 편집`}
        >
          편집
        </button>
        {error ? (
          <span role="alert" className="ml-2 text-[12px] text-danger">
            {error}
          </span>
        ) : null}
      </Tag>
    );
  }

  const bytes = new TextEncoder().encode(draft).byteLength;
  const overBytes = bytes > MAX_TEXT_BYTES;

  return (
    <span className="block">
      {multiline ? (
        <textarea
          autoFocus
          value={draft}
          maxLength={maxLength}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          className="w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[15px] outline-none focus:border-accent-primary"
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="w-full rounded-md border border-strong bg-surface-solid px-3 py-2 text-[15px] outline-none focus:border-accent-primary"
        />
      )}
      <span className="mt-2 flex items-center gap-2 text-[13px]">
        <button
          type="button"
          onClick={save}
          disabled={pending || overBytes || draft.trim().length === 0}
          className="rounded-md bg-accent-primary px-3 py-1.5 text-surface-solid disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-md border border-strong px-3 py-1.5 text-ink-secondary"
        >
          취소
        </button>
        <span className={`ml-auto ${overBytes ? "text-danger" : "text-ink-muted"}`}>
          {draft.length}/{maxLength}
        </span>
      </span>
      {error ? (
        <span role="alert" className="mt-1 block text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
