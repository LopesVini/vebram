import { useRef, useState } from "react";

type SheetState = "peek" | "half" | "full";

const HEIGHTS: Record<SheetState, string> = {
  peek: "2.5rem",
  half: "45dvh",
  full: "85dvh",
};

const ORDER: SheetState[] = ["peek", "half", "full"];

// Gaveta inferior do BIM viewer (só mobile). Três estados; arrasto na alça
// via pointer events — swipe de 40px+ muda um nível, toque cicla.
export default function BimBottomSheet({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SheetState>("peek");
  const dragStartY = useRef<number | null>(null);
  const dragged = useRef(false);

  function step(dir: 1 | -1) {
    setState((s) => ORDER[Math.min(Math.max(ORDER.indexOf(s) + dir, 0), ORDER.length - 1)]);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStartY.current = e.clientY;
    dragged.current = false;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (delta <= -40) { dragged.current = true; step(1); }   // swipe up → abre
    else if (delta >= 40) { dragged.current = true; step(-1); } // swipe down → fecha
  }

  function onClick() {
    if (dragged.current) { dragged.current = false; return; }
    setState((s) => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length]);
  }

  return (
    <div
      data-testid="bim-bottom-sheet"
      data-state={state}
      style={{ height: HEIGHTS[state] }}
      className="lg:hidden fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 bg-white dark:bg-navy-light border-t border-zinc-200 dark:border-white/10 rounded-t-2xl shadow-2xl transition-[height] duration-300 flex flex-col overflow-hidden"
    >
      <button
        type="button"
        aria-label="Painel do modelo"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onClick}
        className="h-10 shrink-0 flex items-center justify-center touch-none cursor-grab"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-white/20" />
      </button>
      <div className={`flex-1 overflow-y-auto px-4 pb-4 ${state === "peek" ? "invisible" : ""}`}>
        {children}
      </div>
    </div>
  );
}
