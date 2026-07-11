import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { RectShape } from "@/lib/maps.functions";

export type EditorHotspot = {
  id: string;
  booth_code: string;
  polygon: RectShape;
  exhibitor_id: string | null;
};

type DrawState = { x: number; y: number; w: number; h: number };

/**
 * Overlay editor: click-and-drag on the image to draw a new rectangle,
 * click an existing rectangle to select it.
 * All coordinates are normalized 0..1 relative to the image box.
 */
export function RectHotspotEditor({
  imageUrl,
  hotspots,
  selectedId,
  onSelect,
  onCreate,
}: {
  imageUrl: string;
  hotspots: EditorHotspot[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (rect: RectShape) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  function pt(e: ReactPointerEvent) {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function onDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).dataset.hotspot) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pt(e);
    setStart(p);
    setDraw({ x: p.x, y: p.y, w: 0, h: 0 });
    onSelect(null);
  }

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!start) return;
    const p = pt(e);
    setDraw({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }

  function onUp() {
    if (draw && draw.w > 0.005 && draw.h > 0.005) {
      onCreate({ type: "rect", ...draw });
    }
    setDraw(null);
    setStart(null);
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full touch-none select-none overflow-hidden rounded-md border bg-muted"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <img
        src={imageUrl}
        alt="Floor plan"
        className="pointer-events-none block h-auto w-full"
        draggable={false}
      />
      {hotspots.map((h) => {
        const active = h.id === selectedId;
        return (
          <button
            key={h.id}
            data-hotspot="1"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(h.id);
            }}
            className={`absolute cursor-pointer border-2 text-[10px] font-semibold text-white transition ${
              active
                ? "border-primary bg-primary/40 ring-2 ring-primary"
                : "border-primary/70 bg-primary/20 hover:bg-primary/30"
            }`}
            style={{
              left: `${h.polygon.x * 100}%`,
              top: `${h.polygon.y * 100}%`,
              width: `${h.polygon.w * 100}%`,
              height: `${h.polygon.h * 100}%`,
            }}
          >
            <span className="absolute left-1 top-0.5 rounded bg-black/50 px-1 py-0.5">
              {h.booth_code}
            </span>
          </button>
        );
      })}
      {draw && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
          style={{
            left: `${draw.x * 100}%`,
            top: `${draw.y * 100}%`,
            width: `${draw.w * 100}%`,
            height: `${draw.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}
