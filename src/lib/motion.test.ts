import { describe, it, expect, vi, beforeEach } from "vitest";

// Controla o que window.matchMedia responde por query.
function stubMatchMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Object.entries(matches).find(([k]) => query.includes(k))?.[1] ?? false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("responsiveMotion", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("roda full no desktop", async () => {
    stubMatchMedia({ "min-width: 768px": true, "max-width": false, "prefers-reduced-motion": false });
    const { responsiveMotion } = await import("@/lib/motion");
    const full = vi.fn();
    const light = vi.fn();
    const mm = responsiveMotion(null, { full, light });
    expect(full).toHaveBeenCalledOnce();
    expect(light).not.toHaveBeenCalled();
    mm.revert();
  });

  it("roda light no mobile", async () => {
    stubMatchMedia({ "min-width: 768px": false, "max-width": true, "prefers-reduced-motion": false });
    const { responsiveMotion } = await import("@/lib/motion");
    const full = vi.fn();
    const light = vi.fn();
    const mm = responsiveMotion(null, { full, light });
    expect(light).toHaveBeenCalledOnce();
    expect(full).not.toHaveBeenCalled();
    mm.revert();
  });

  it("não roda nada com prefers-reduced-motion", async () => {
    stubMatchMedia({ "min-width: 768px": true, "max-width": false, "prefers-reduced-motion": true });
    const { responsiveMotion } = await import("@/lib/motion");
    const full = vi.fn();
    const light = vi.fn();
    const mm = responsiveMotion(null, { full, light });
    expect(full).not.toHaveBeenCalled();
    expect(light).not.toHaveBeenCalled();
    mm.revert();
  });
});
