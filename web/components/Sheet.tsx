"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Answer, Line } from "@/lib/types";
import { StatusMark } from "./Marks";
import s from "./Sheet.module.css";

export interface Mark {
  key: string;
  n: number;
  label: string;
  lineId: string;
  status: Answer["status"];
}

type Dim = { width: number; height: number };
type Crop = { x: number; y: number; w: number; h: number };

interface Props {
  /** One image per page (data URL or object URL). */
  pages: string[];
  /** Page sizes from the engine (line geometry is in these units). */
  dimensions?: Dim[];
  lines: Line[];
  marks: Mark[];
  activeKey: string | null;
  picking: boolean;
  reading: boolean;
  /** Phone strip: frame only the marked lines, small enough to leave room for the notes. */
  compact?: boolean;
  onPickLine?: (line: Line) => void;
  onHover?: (key: string | null) => void;
  children?: ReactNode;
}

const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };
// Each line's mark and reference number sit just past the end of its
// highlight when that is blank paper; otherwise in a right gutter at the
// line's height. These match Sheet.module.css.
const GUTTER = 52;
const MARK_W = 24;
const TAG_W = MARK_W + 26;
const TAG_H = 22;

/** Where the page's text is, with room around it. A receipt photographed on a
 *  table is a small strip of a big photo. */
function textCrop(ls: Line[]): Crop {
  if (ls.length < 2) return FULL;
  const padX = 0.05;
  const padY = 0.03;
  const x0 = Math.max(0, Math.min(...ls.map((l) => l.bbox[0])) - padX);
  const y0 = Math.max(0, Math.min(...ls.map((l) => l.bbox[1])) - padY);
  const x1 = Math.min(1, Math.max(...ls.map((l) => l.bbox[2])) + padX);
  const y1 = Math.min(1, Math.max(...ls.map((l) => l.bbox[3])) + padY);
  const crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  return crop.w * crop.h > 0.8 ? FULL : crop;
}

/** The line as printed: centre, size (page units) and angle. PDFs have no angle. */
function geometry(l: Line, dim: Dim) {
  if (l.rect) {
    const [cx, cy, w, h, deg] = l.rect;
    return { cx, cy, w, h, deg };
  }
  const [x0, y0, x1, y1] = l.bbox;
  return {
    cx: ((x0 + x1) / 2) * dim.width,
    cy: ((y0 + y1) / 2) * dim.height,
    w: (x1 - x0) * dim.width,
    h: (y1 - y0) * dim.height,
    deg: 0,
  };
}

function highlightStyle(l: Line, dim: Dim): CSSProperties {
  const g = geometry(l, dim);
  // A stroke runs a little past the ink on both ends.
  const w = g.w + g.h * 0.6;
  const h = g.h * 1.1;
  return {
    left: `${((g.cx - w / 2) / dim.width) * 100}%`,
    top: `${((g.cy - h / 2) / dim.height) * 100}%`,
    width: `${(w / dim.width) * 100}%`,
    height: `${(h / dim.height) * 100}%`,
    transform: g.deg ? `rotate(${g.deg}deg)` : undefined,
  };
}

function bboxStyle(b: Line["bbox"]): CSSProperties {
  return {
    left: `${b[0] * 100}%`,
    top: `${b[1] * 100}%`,
    width: `${(b[2] - b[0]) * 100}%`,
    height: `${(b[3] - b[1]) * 100}%`,
  };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface PageProps extends Omit<Props, "pages" | "dimensions" | "children" | "reading"> {
  src: string;
  page: number;
  dim?: Dim;
  alt: string;
}

function Page({ src, page, dim, alt, lines, marks, activeKey, picking, compact, onPickLine, onHover }: PageProps) {
  const [pageRef, pageW] = useWidth<HTMLDivElement>();
  const pageLines = lines.filter((l) => l.page === page);
  const byId = new Map(pageLines.map((l) => [l.id, l]));
  const shown = marks.filter((m) => byId.has(m.lineId));

  const crop = !dim
    ? FULL
    : compact && shown.length
      ? textCrop(shown.map((m) => byId.get(m.lineId)!))
      : textCrop(pageLines);
  const ratio = dim ? (crop.w * dim.width) / (crop.h * dim.height) : null;

  // Page units -> px inside the page box.
  const scale = dim && pageW ? pageW / (crop.w * dim.width) : 0;
  const toPx = (x: number, y: number) =>
    dim ? { x: (x - crop.x * dim.width) * scale, y: (y - crop.y * dim.height) * scale } : { x: 0, y: 0 };

  // Tag = mark + circled number, right after the end of its own line. It stays
  // there only if that spot is blank paper: if it would touch any printed line
  // or another tag, it goes to the right gutter at its line's height instead
  // (stacked below gutter neighbours). It never covers print, including the
  // value it marks.
  const placed: { m: Mark; x: number; y: number }[] = [];
  if (scale && dim) {
    type Rect = { x0: number; y0: number; x1: number; y1: number };
    const hit = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const inked: (Rect & { id: string })[] = pageLines.map((l) => {
      const p0 = toPx(l.bbox[0] * dim.width, l.bbox[1] * dim.height);
      const p1 = toPx(l.bbox[2] * dim.width, l.bbox[3] * dim.height);
      return { id: l.id, x0: p0.x + 1, y0: p0.y + 1, x1: p1.x - 1, y1: p1.y - 1 };
    });
    const tagRect = (x: number, y: number): Rect => ({ x0: x, y0: y - TAG_H / 2, x1: x + TAG_W, y1: y + TAG_H / 2 });

    const items = shown
      .map((m) => {
        const g = geometry(byId.get(m.lineId)!, dim);
        const a = (g.deg * Math.PI) / 180;
        const half = g.w / 2 + g.h * 0.3;
        const end = toPx(g.cx + half * Math.cos(a), g.cy + half * Math.sin(a));
        return { m, x: end.x + 4, y: end.y };
      })
      .sort((p, q) => p.y - q.y);
    const pageH = pageW / (ratio ?? 1);
    for (const it of items) {
      const r = tagRect(it.x, it.y);
      const blocked =
        it.x + TAG_W > pageW + GUTTER ||
        inked.some((l) => l.id !== it.m.lineId && hit(r, l)) ||
        placed.some((p) => hit(r, tagRect(p.x, p.y)));
      if (blocked) {
        it.x = pageW + 2;
        for (const p of placed) {
          if (p.x >= pageW && Math.abs(it.y - p.y) < TAG_H) it.y = p.y + TAG_H;
        }
      }
      it.y = Math.min(it.y, pageH - TAG_H / 2);
      placed.push(it);
    }
  }

  const order = new Map(marks.map((m, i) => [m.key, i]));

  return (
    <div
      className={s.wrap}
      data-framed={ratio ? true : undefined}
      data-compact={compact || undefined}
      style={ratio ? ({ "--ratio": ratio } as CSSProperties) : undefined}
    >
      <div ref={pageRef} className={s.page} style={ratio ? { aspectRatio: `${ratio}` } : undefined}>
        <div
          className={s.frame}
          style={
            ratio
              ? {
                  width: `${100 / crop.w}%`,
                  left: `${(-crop.x / crop.w) * 100}%`,
                  top: `${(-crop.y / crop.h) * 100}%`,
                }
              : undefined
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object/data URLs */}
          <img className={s.photo} src={src} alt={alt} />

          {dim &&
            shown.map((m) => (
              <div
                key={m.key}
                className={s.hl}
                data-key={m.key}
                data-status={m.status}
                data-active={activeKey === m.key || undefined}
                style={{ ...highlightStyle(byId.get(m.lineId)!, dim), "--i": order.get(m.key) } as CSSProperties}
                onMouseEnter={() => onHover?.(m.key)}
                onMouseLeave={() => onHover?.(null)}
              />
            ))}

          {picking &&
            pageLines.map((l) => (
              <button
                key={l.id}
                type="button"
                className={s.pick}
                style={bboxStyle(l.bbox)}
                onClick={() => onPickLine?.(l)}
                aria-label={`Usar «${l.text}»`}
                title={l.text}
              />
            ))}
        </div>
      </div>

      {placed.map((p) => (
        <span
          key={p.m.key}
          className={s.tag}
          data-status={p.m.status}
          data-active={activeKey === p.m.key || undefined}
          style={{ left: p.x, top: p.y, "--i": order.get(p.m.key) } as CSSProperties}
          aria-hidden
        >
          <StatusMark status={p.m.status} className={s.mark} />
          <span className={s.callout}>{p.m.n}</span>
        </span>
      ))}
    </div>
  );
}

export function Sheet({ pages, dimensions, reading, children, ...rest }: Props) {
  return (
    <div className={s.sheet} data-reading={reading || undefined} data-picking={rest.picking || undefined}>
      {pages.map((src, page) => (
        <Page
          key={page}
          src={src}
          page={page}
          dim={dimensions?.[page]}
          alt={pages.length > 1 ? `Documento, página ${page + 1}` : "Tu documento"}
          {...rest}
        />
      ))}
      {children}
    </div>
  );
}
