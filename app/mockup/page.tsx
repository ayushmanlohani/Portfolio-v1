"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { UnitwiseLanding } from "@/components/win7/clouds/UnitwiseLanding";
import { mono, sans, serif } from "@/components/win7/clouds/fonts";

/**
 * A layout editor for the Unitwise page.
 *
 * Click anything to select it, drag to move, drag a handle to resize, double
 * click to rewrite the words. Export hands back only what you changed, which
 * is what gets baked into the real component.
 *
 * It doesn't carry a copy of the page's numbers. It renders the real
 * `UnitwiseLanding` once, measures it, throws it away and edits the
 * measurements — so it can never drift out of step with the real thing, and
 * "no edits" always means "exactly what's on screen now".
 *
 * Positions come off the `offsetParent` chain rather than
 * `getBoundingClientRect`, because the page animates in on scroll and tilts
 * the chat card under the cursor. Offsets ignore transforms; rects don't, and
 * would bake a half-finished reveal into every number.
 */

const CANVAS_W = 1180;

type Kind = "text" | "box" | "icon" | "html";

type Item = {
  id: string;
  kind: Kind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
  /** Innermost box that contains it. Moving a parent moves its children. */
  parent?: string;
  text?: string;
  html?: string;
  fs?: number;
  fw?: string;
  color?: string;
  lh?: string;
  ff?: string;
  tt?: string;
  ls?: string;
  ta?: string;
  bg?: string;
  br?: string;
  bw?: number;
  bc?: string;
  bs?: string;
  pad?: string;
};

/** next/font hides the real family name, so map back to the CSS variable. */
function fontVar(ff: string) {
  // Order matters: the sans stack ends in `sans-serif`, which matches /serif/
  // and quietly turned the whole page serif on the first pass.
  if (/mono/i.test(ff)) return "var(--font-uw-mono)";
  if (/sans/i.test(ff)) return "var(--font-uw-sans)";
  return "var(--font-uw-serif)";
}

function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root && n !== document.body) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const ownText = (el: Element) =>
  [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());

/** Text with its line breaks kept — `textContent` drops `<br>` silently. */
function readText(el: Element) {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  return clone.textContent!.trim().replace(/[ \t]+/g, " ");
}

/** Width an icon sitting before the text takes up, gap included. */
function leadIcon(el: Element, cs: CSSStyleDeclaration) {
  const first = el.firstElementChild;
  if (!first || first.tagName.toLowerCase() !== "svg") return 0;
  const gap = parseFloat(cs.columnGap) || 0;
  return first.getBoundingClientRect().width + gap;
}

/**
 * Things that are one thing even though they're many elements: the syntax
 * highlighted code block, and the row of grey placeholder bars. Splitting
 * those into a dozen overlapping handles would make them unusable.
 */
function isAtomic(el: Element) {
  if (/mono|jetbrains/i.test(getComputedStyle(el).fontFamily)) return true;
  const kids = [...el.children];
  return (
    kids.length > 1 &&
    kids.every(
      (k) =>
        !k.textContent!.trim() &&
        getComputedStyle(k).backgroundColor !== "rgba(0, 0, 0, 0)",
    )
  );
}

function measure(root: HTMLElement): Item[] {
  const items: Item[] = [];
  let n = 0;

  const walk = (el: HTMLElement) => {
    // The sky is not part of what's being edited.
    if (el.tagName === "CANVAS" || el.querySelector("canvas")) {
      [...el.children].forEach((c) => walk(c as HTMLElement));
      return;
    }

    const cs = getComputedStyle(el);
    const { x, y } = offsetIn(el, root);
    const isSvg = el.tagName.toLowerCase() === "svg";
    const w = isSvg ? el.getBoundingClientRect().width : el.offsetWidth;
    const h = isSvg ? el.getBoundingClientRect().height : el.offsetHeight;
    const R = (v: number) => Math.round(v * 10) / 10;
    const base = { x: R(x), y: R(y), w: R(w), h: R(h) };
    const tag = el.tagName.toLowerCase();

    if (w > 0 && h > 0) {
      const fill = cs.backgroundColor !== "rgba(0, 0, 0, 0)";
      const bord = parseFloat(cs.borderTopWidth) > 0;
      if ((fill || bord) && w > 6 && h > 4) {
        let br = cs.borderRadius;
        if (parseFloat(br) > 500) br = "9999px";
        items.push({
          id: `b${n++}`,
          kind: "box",
          label: el.textContent!.trim().replace(/\s+/g, " ").slice(0, 30) || "box",
          ...base,
          bg: fill ? cs.backgroundColor : "transparent",
          br,
          bw: bord ? Math.round(parseFloat(cs.borderTopWidth) * 10) / 10 : 0,
          bc: cs.borderTopColor,
          bs: cs.borderTopStyle,
        });
      }

      if (tag === "svg") {
        const r = el.getBoundingClientRect();
        const pr = (el.parentElement as HTMLElement).getBoundingClientRect();
        const po = offsetIn(el.parentElement as HTMLElement, root);
        items.push({
          id: `i${n++}`,
          kind: "icon",
          label: "icon",
          x: R(po.x + (r.x - pr.x)),
          y: R(po.y + (r.y - pr.y)),
          w: R(r.width),
          h: R(r.height),
          color: cs.color,
          html: el.outerHTML,
        });
        return;
      }

      // An <img> (the logo) has real offsetWidth/Height, so `base` above is
      // already correct for it — unlike svg, no rect-relative math needed.
      if (tag === "img") {
        items.push({
          id: `i${n++}`,
          kind: "icon",
          label: (el as HTMLImageElement).alt || "logo",
          ...base,
          html: el.outerHTML,
        });
        return;
      }

      if (isAtomic(el)) {
        items.push({
          id: `h${n++}`,
          kind: "html",
          label: el.textContent!.trim().replace(/\s+/g, " ").slice(0, 30) || "block",
          ...base,
          html: el.outerHTML,
        });
        return;
      }

      if (ownText(el)) {
        const text = readText(el);
        items.push({
          id: `t${n++}`,
          kind: "text",
          label: text.slice(0, 30),
          ...base,
          text,
          fs: parseFloat(cs.fontSize),
          fw: cs.fontWeight,
          color: cs.color,
          lh: cs.lineHeight,
          ff: fontVar(cs.fontFamily),
          tt: cs.textTransform,
          ls: cs.letterSpacing,
          ta: cs.textAlign,
          // A row like "[icon] Sessions" is one flex box: the icon is a child,
          // the label is a bare text node, and the space between them is the
          // flex gap. Absolute positioning has no flex, so without folding the
          // icon's width and that gap into the padding, every label lands on
          // top of its own icon.
          pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${
            parseFloat(cs.paddingLeft) + leadIcon(el, cs)
          }px`,
        });
      }
    }

    [...el.children].forEach((c) => walk(c as HTMLElement));
  };

  walk(root);

  // Parent = the smallest box that fully contains it. Cheap O(n²) over ~110
  // items, once, at load.
  const boxes = items.filter((i) => i.kind === "box");
  for (const it of items) {
    let best: Item | undefined;
    for (const b of boxes) {
      if (b.id === it.id) continue;
      const inside =
        it.x >= b.x - 0.5 &&
        it.y >= b.y - 0.5 &&
        it.x + it.w <= b.x + b.w + 0.5 &&
        it.y + it.h <= b.y + b.h + 0.5;
      if (!inside) continue;
      if (!best || b.w * b.h < best.w * best.h) best = b;
    }
    if (best) it.parent = best.id;
  }

  return items;
}

const KEY = "unitwise-mockup-v1";
const num = (v: string, fallback: number) => (v === "" ? fallback : Number(v));

export default function MockupPage() {
  const sourceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState<Item[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [sky, setSky] = useState(false);
  const [grid, setGrid] = useState(true);
  const [exported, setExported] = useState<string | null>(null);

  // ── Measure the real page, then drop it.
  useLayoutEffect(() => {
    const root = sourceRef.current;
    if (!root) return;
    // Two frames plus a beat: motion's scroll reveals have to settle, or the
    // first few elements measure 22px low.
    const t = window.setTimeout(() => {
      const col = root.querySelector<HTMLElement>("[data-uw-col]") ?? root;
      const measured = measure(col);
      setSeed(measured);
      const saved = localStorage.getItem(KEY);
      if (saved) {
        try {
          const overrides: Record<string, Partial<Item>> = JSON.parse(saved);
          setItems(measured.map((i) => (overrides[i.id] ? { ...i, ...overrides[i.id] } : i)));
        } catch {
          setItems(measured);
        }
      } else {
        setItems(measured);
      }
    }, 1400);
    return () => window.clearTimeout(t);
  }, []);

  // ── Persist only what differs from the measured page.
  useEffect(() => {
    if (!items || !seed) return;
    const diff: Record<string, Partial<Item>> = {};
    const byId = new Map(seed.map((i) => [i.id, i]));
    for (const it of items) {
      const s = byId.get(it.id);
      if (!s) continue;
      const d: Record<string, unknown> = {};
      for (const k of Object.keys(it) as (keyof Item)[]) {
        if (k === "id" || k === "parent" || k === "html") continue;
        if (it[k] !== s[k]) d[k] = it[k];
      }
      if (Object.keys(d).length) diff[it.id] = d as Partial<Item>;
    }
    localStorage.setItem(KEY, JSON.stringify(diff));
  }, [items, seed]);

  const patch = useCallback((id: string, d: Partial<Item>) => {
    setItems((prev) => prev && prev.map((i) => (i.id === id ? { ...i, ...d } : i)));
  }, []);

  /** Moving a box takes everything inside it along. */
  const nudge = useCallback((id: string, dx: number, dy: number) => {
    setItems((prev) => {
      if (!prev) return prev;
      const family = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const i of prev) {
          if (i.parent && family.has(i.parent) && !family.has(i.id)) {
            family.add(i.id);
            grew = true;
          }
        }
      }
      return prev.map((i) =>
        family.has(i.id)
          ? { ...i, x: Math.round((i.x + dx) * 10) / 10, y: Math.round((i.y + dy) * 10) / 10 }
          : i,
      );
    });
  }, []);

  // ── Keyboard: nudge, hide, deselect.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === "Escape") (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (!sel) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") nudge(sel, -step, 0);
      else if (e.key === "ArrowRight") nudge(sel, step, 0);
      else if (e.key === "ArrowUp") nudge(sel, 0, -step);
      else if (e.key === "ArrowDown") nudge(sel, 0, step);
      else if (e.key === "Delete" || e.key === "Backspace") {
        setItems((p) => p && p.map((i) => (i.id === sel ? { ...i, hidden: !i.hidden } : i)));
      } else if (e.key === "Escape") setSel(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, editing, nudge]);

  const selected = items?.find((i) => i.id === sel) ?? null;

  // ── Drag to move.
  function startMove(e: React.PointerEvent, it: Item) {
    if (editing === it.id) return;
    e.stopPropagation();
    setSel(it.id);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    let px = e.clientX;
    let py = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - px) / zoom;
      const dy = (ev.clientY - py) / zoom;
      px = ev.clientX;
      py = ev.clientY;
      nudge(it.id, dx, dy);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  // ── Drag a handle. Corners scale type; sides set the box.
  function startResize(e: React.PointerEvent, it: Item, dir: string) {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const s = { x: it.x, y: it.y, w: it.w, h: it.h, fs: it.fs ?? 16 };
    const x0 = e.clientX;
    const y0 = e.clientY;
    const corner = dir.length === 2;

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / zoom;
      const dy = (ev.clientY - y0) / zoom;

      if (corner && it.kind === "text") {
        // Scale the type. Ratio comes off whichever axis moved further, so a
        // rough diagonal drag still feels predictable.
        const sx = dir.includes("w") ? -1 : 1;
        const k = Math.max(0.15, (s.w + dx * sx) / Math.max(s.w, 1));
        patch(it.id, {
          fs: Math.round(Math.min(240, Math.max(5, s.fs * k)) * 10) / 10,
          w: Math.round(s.w * k * 10) / 10,
          x: dir.includes("w") ? Math.round((s.x - dx * -1) * 10) / 10 : s.x,
        });
        return;
      }

      const d: Partial<Item> = {};
      if (dir.includes("e")) d.w = Math.max(8, Math.round((s.w + dx) * 10) / 10);
      if (dir.includes("w")) {
        d.w = Math.max(8, Math.round((s.w - dx) * 10) / 10);
        d.x = Math.round((s.x + dx) * 10) / 10;
      }
      if (dir.includes("s")) d.h = Math.max(6, Math.round((s.h + dy) * 10) / 10);
      if (dir.includes("n")) {
        d.h = Math.max(6, Math.round((s.h - dy) * 10) / 10);
        d.y = Math.round((s.y + dy) * 10) / 10;
      }
      patch(it.id, d);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  function exportJson() {
    if (!items || !seed) return;
    const byId = new Map(seed.map((i) => [i.id, i]));
    const changes: Record<string, Record<string, unknown>> = {};
    for (const it of items) {
      const s = byId.get(it.id)!;
      const d: Record<string, unknown> = {};
      for (const k of Object.keys(it) as (keyof Item)[]) {
        if (k === "id" || k === "parent" || k === "html" || k === "label") continue;
        if (it[k] !== s[k]) d[k] = it[k];
      }
      if (Object.keys(d).length) {
        changes[it.id] = { was: it.kind === "text" ? s.text : s.label, ...d };
      }
    }
    setExported(
      Object.keys(changes).length
        ? JSON.stringify(changes, null, 2)
        : "// nothing changed yet",
    );
  }

  function resetAll() {
    if (!seed) return;
    localStorage.removeItem(KEY);
    setItems(seed.map((i) => ({ ...i })));
    setSel(null);
    setExported(null);
  }

  const shell = `${serif.variable} ${sans.variable} ${mono.variable}`;
  const height = items ? Math.max(...items.map((i) => i.y + i.h)) + 60 : 1400;

  return (
    <div className={`${shell} flex h-screen w-screen bg-[#20242b] text-[13px] text-[#dfe3e8]`}>
      {/* The real page, rendered once so it can be measured, then dropped. */}
      {!items && (
        <div
          ref={sourceRef}
          style={{ position: "absolute", top: 0, left: 0, width: CANVAS_W, visibility: "hidden" }}
        >
          <div data-uw-col style={{ position: "relative", width: CANVAS_W }}>
            <UnitwiseLanding />
          </div>
        </div>
      )}

      {/* ── Canvas ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-8" onPointerDown={() => setSel(null)}>
        {!items ? (
          <div className="p-10 font-[family-name:var(--font-uw-sans)] text-[#8d97a5]">
            Measuring the real page…
          </div>
        ) : (
          <div style={{ width: CANVAS_W * zoom, height: height * zoom }}>
            <div
              ref={canvasRef}
              className="relative origin-top-left bg-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              style={{
                width: CANVAS_W,
                height,
                transform: `scale(${zoom})`,
                backgroundImage: grid
                  ? "linear-gradient(#00000010 1px,transparent 1px),linear-gradient(90deg,#00000010 1px,transparent 1px)"
                  : undefined,
                backgroundSize: "20px 20px",
              }}
            >
              {sky && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
                  style={{
                    background: "linear-gradient(#E2864A,#F6E0C0)",
                    maskImage: "linear-gradient(to bottom,black 72%,transparent 100%)",
                  }}
                />
              )}

              {items.map((it) => {
                const on = it.id === sel;
                const isEditing = editing === it.id;
                const common: React.CSSProperties = {
                  position: "absolute",
                  left: it.x,
                  top: it.y,
                  width: it.w,
                  opacity: it.hidden ? 0.18 : 1,
                  outline: on ? "2px solid #4c9ffe" : undefined,
                  outlineOffset: 1,
                  cursor: isEditing ? "text" : "move",
                };

                const handles = on && !isEditing && (
                  <>
                    {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((d) => (
                      <span
                        key={d}
                        onPointerDown={(e) => startResize(e, it, d)}
                        style={{
                          position: "absolute",
                          width: 9,
                          height: 9,
                          background: d.length === 2 ? "#4c9ffe" : "#fff",
                          border: "1.5px solid #4c9ffe",
                          borderRadius: 2,
                          zIndex: 50,
                          cursor: `${d}-resize`,
                          left: d.includes("w") ? -5 : d.includes("e") ? "calc(100% - 4px)" : "calc(50% - 4px)",
                          top: d.includes("n") ? -5 : d.includes("s") ? "calc(100% - 4px)" : "calc(50% - 4px)",
                        }}
                      />
                    ))}
                  </>
                );

                if (it.kind === "box") {
                  return (
                    <div
                      key={it.id}
                      onPointerDown={(e) => startMove(e, it)}
                      style={{
                        ...common,
                        height: it.h,
                        background: it.bg,
                        borderRadius: it.br,
                        border: it.bw ? `${it.bw}px ${it.bs} ${it.bc}` : undefined,
                      }}
                    >
                      {handles}
                    </div>
                  );
                }

                if (it.kind === "icon" || it.kind === "html") {
                  return (
                    <div
                      key={it.id}
                      onPointerDown={(e) => startMove(e, it)}
                      style={{ ...common, height: it.kind === "icon" ? it.h : undefined, color: it.color }}
                    >
                      {/* Markup lifted straight off the real page, so an icon
                          or the code block looks like itself rather than a
                          grey placeholder. Same document, not user input. */}
                      <span
                        className="pointer-events-none block [&>svg]:h-full [&>svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: it.html ?? "" }}
                      />
                      {handles}
                    </div>
                  );
                }

                return (
                  <div
                    key={it.id}
                    onPointerDown={(e) => startMove(e, it)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditing(it.id);
                      const el = e.currentTarget;
                      requestAnimationFrame(() => {
                        el.focus();
                        const r = document.createRange();
                        r.selectNodeContents(el);
                        const s = getSelection();
                        s?.removeAllRanges();
                        s?.addRange(r);
                      });
                    }}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      patch(it.id, { text: e.currentTarget.textContent ?? "" });
                      setEditing(null);
                    }}
                    style={{
                      ...common,
                      minHeight: it.h,
                      fontSize: it.fs,
                      fontWeight: it.fw as React.CSSProperties["fontWeight"],
                      color: it.color,
                      lineHeight: it.lh,
                      fontFamily: it.ff,
                      textTransform: it.tt as React.CSSProperties["textTransform"],
                      letterSpacing: it.ls,
                      textAlign: it.ta as React.CSSProperties["textAlign"],
                      padding: it.pad,
                      // Line breaks measured out of the real page survive.
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {it.text}
                    {handles}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Inspector ──────────────────────────────────────── */}
      <aside className="flex w-[310px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-[#333a44] bg-[#191d23] p-4 font-[family-name:var(--font-uw-sans)]">
        <div className="flex items-center gap-2">
          <strong className="text-[14px]">Unitwise layout</strong>
          <span className="ml-auto text-[11px] text-[#7c8797]">{items?.length ?? 0} parts</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <label className="flex items-center gap-1">
            zoom
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="rounded bg-[#262c35] px-1 py-0.5"
            >
              {[0.5, 0.6, 0.75, 0.9, 1].map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> grid
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={sky} onChange={(e) => setSky(e.target.checked)} /> sky
          </label>
        </div>

        <p className="text-[11px] leading-relaxed text-[#7c8797]">
          Click to select · drag to move · corner handle scales type, side handle sets width ·
          double-click to rewrite · arrows nudge (shift = 10) · Delete hides.
        </p>

        {selected ? (
          <div className="flex flex-col gap-2 border-t border-[#333a44] pt-3">
            <div className="truncate text-[12px] font-semibold">{selected.label || selected.kind}</div>
            <div className="text-[10px] text-[#7c8797]">
              {selected.id} · {selected.kind}
              {selected.parent ? ` · inside ${selected.parent}` : ""}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k} className="flex flex-col text-[10px] text-[#7c8797]">
                  {k}
                  <input
                    type="number"
                    value={selected[k]}
                    onChange={(e) => patch(selected.id, { [k]: num(e.target.value, selected[k]) })}
                    className="w-full rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                  />
                </label>
              ))}
            </div>

            {selected.kind === "text" && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="flex flex-col text-[10px] text-[#7c8797]">
                    font size
                    <input
                      type="number"
                      step="0.5"
                      value={selected.fs ?? 16}
                      onChange={(e) => patch(selected.id, { fs: num(e.target.value, selected.fs ?? 16) })}
                      className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                    />
                  </label>
                  <label className="flex flex-col text-[10px] text-[#7c8797]">
                    weight
                    <select
                      value={selected.fw}
                      onChange={(e) => patch(selected.id, { fw: e.target.value })}
                      className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                    >
                      {["300", "400", "500", "600", "700", "800", "900"].map((w) => (
                        <option key={w}>{w}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col text-[10px] text-[#7c8797]">
                    line height
                    <input
                      value={selected.lh ?? ""}
                      onChange={(e) => patch(selected.id, { lh: e.target.value })}
                      className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                    />
                  </label>
                  <label className="flex flex-col text-[10px] text-[#7c8797]">
                    align
                    <select
                      value={selected.ta}
                      onChange={(e) => patch(selected.id, { ta: e.target.value })}
                      className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                    >
                      {["start", "center", "end", "justify"].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex flex-col text-[10px] text-[#7c8797]">
                  colour
                  <input
                    value={selected.color ?? ""}
                    onChange={(e) => patch(selected.id, { color: e.target.value })}
                    className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                  />
                </label>

                <label className="flex flex-col text-[10px] text-[#7c8797]">
                  text
                  <textarea
                    rows={3}
                    value={selected.text ?? ""}
                    onChange={(e) => patch(selected.id, { text: e.target.value })}
                    className="rounded bg-[#262c35] px-1 py-1 text-[11px] text-[#dfe3e8]"
                  />
                </label>
              </>
            )}

            {selected.kind === "box" && (
              <div className="grid grid-cols-2 gap-1.5">
                <label className="col-span-2 flex flex-col text-[10px] text-[#7c8797]">
                  fill
                  <input
                    value={selected.bg ?? ""}
                    onChange={(e) => patch(selected.id, { bg: e.target.value })}
                    className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                  />
                </label>
                <label className="flex flex-col text-[10px] text-[#7c8797]">
                  radius
                  <input
                    value={selected.br ?? ""}
                    onChange={(e) => patch(selected.id, { br: e.target.value })}
                    className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                  />
                </label>
                <label className="flex flex-col text-[10px] text-[#7c8797]">
                  border w
                  <input
                    type="number"
                    step="0.5"
                    value={selected.bw ?? 0}
                    onChange={(e) => patch(selected.id, { bw: num(e.target.value, selected.bw ?? 0) })}
                    className="rounded bg-[#262c35] px-1 py-0.5 text-[11px] text-[#dfe3e8]"
                  />
                </label>
              </div>
            )}

            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={!selected.hidden}
                onChange={(e) => patch(selected.id, { hidden: !e.target.checked })}
              />
              visible
            </label>

            <button
              type="button"
              onClick={() => {
                const s = seed?.find((i) => i.id === selected.id);
                if (s) setItems((p) => p && p.map((i) => (i.id === s.id ? { ...s } : i)));
              }}
              className="rounded bg-[#2b323c] px-2 py-1 text-[11px] hover:bg-[#39424f]"
            >
              Reset this part
            </button>
          </div>
        ) : (
          <div className="border-t border-[#333a44] pt-3 text-[11px] text-[#7c8797]">
            Nothing selected.
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 border-t border-[#333a44] pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="flex-1 rounded bg-[#4c9ffe] px-2 py-1.5 text-[12px] font-semibold text-[#0d1620] hover:bg-[#69b0ff]"
            >
              Export changes
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded bg-[#2b323c] px-2 py-1.5 text-[11px] hover:bg-[#39424f]"
            >
              Reset all
            </button>
          </div>

          {exported !== null && (
            <>
              <textarea
                readOnly
                value={exported}
                rows={10}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded bg-[#0f1318] p-2 font-[family-name:var(--font-uw-mono)] text-[10px] text-[#b9c6d4]"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(exported)}
                className="rounded bg-[#2b323c] px-2 py-1 text-[11px] hover:bg-[#39424f]"
              >
                Copy to clipboard
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
