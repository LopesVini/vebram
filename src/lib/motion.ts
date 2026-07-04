import gsap from "gsap";

export const DESKTOP_MQ = "(min-width: 768px)";
export const MOBILE_MQ = "(max-width: 767.98px)";
export const REDUCED_MQ = "(prefers-reduced-motion: reduce)";

// Roteia animações GSAP por viewport e preferência de movimento:
// desktop → full, mobile → light, reduced-motion → nada (conteúdo estático).
export function responsiveMotion(
  scope: Element | null,
  handlers: { full?: () => void; light?: () => void },
): gsap.MatchMedia {
  const mm = gsap.matchMedia(scope ?? undefined);
  mm.add(
    { isDesktop: DESKTOP_MQ, isMobile: MOBILE_MQ, reduced: REDUCED_MQ },
    (ctx) => {
      const c = ctx.conditions as { isDesktop: boolean; isMobile: boolean; reduced: boolean };
      if (c.reduced) return;
      if (c.isDesktop) handlers.full?.();
      else if (c.isMobile) handlers.light?.();
    },
  );
  return mm;
}
