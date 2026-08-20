"use client";

import { useEffect, useRef } from "react";

/**
 * A desktop icon's or Explorer tile's label, turned into a text box in
 * place — real Windows renames this way, not through a separate dialog.
 * Selects the name up to the last dot on mount, same as Explorer does, so
 * fixing a typo never means retyping the extension too.
 *
 * Sits inside a button that has its own drag/open handlers, so every pointer
 * and key event here stops propagating before it can reach them.
 */
export function RenameField({
  id,
  label,
  onCommit,
  onCancel,
}: {
  id: string;
  label: string;
  onCommit: (id: string, value: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = label.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : label.length);
  }, [label]);

  return (
    <input
      ref={ref}
      className="win7-inline-rename"
      defaultValue={label}
      aria-label="New name"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit(id, e.currentTarget.value);
        if (e.key === "Escape") onCancel();
      }}
      // Clicking away commits, same as real Explorer — Escape is the only
      // way out that doesn't try to save what's been typed.
      onBlur={(e) => onCommit(id, e.currentTarget.value)}
    />
  );
}
