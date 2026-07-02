import { cn } from "@/lib/utils";

interface VerticeLogoProps {
  className?: string;
  /**
   * Força brancos puros (útil em cima de fundos coloridos/escuros fixos
   * como o hero da landing page). Ignora o tema.
   */
  monoWhite?: boolean;
  /**
   * Força navy puro (útil em cima de fundos claros fixos que NÃO trocam de
   * cor com o tema, como o painel esquerdo da tela de login). Ignora o tema.
   */
  monoNavy?: boolean;
}

/**
 * Logo da Vértice — círculo com triângulo inscrito.
 *
 * Cores controladas por:
 *  - stroke (círculo + contorno do triângulo) = `currentColor`, então o pai
 *    define via `text-*` (default: navy / white no dark).
 *  - fill (triângulo interno sólido) = classe Tailwind, alterna entre azul
 *    da marca e azul claro para não camuflar em nenhum tema.
 */
export default function VerticeLogo({ className, monoWhite = false, monoNavy = false }: VerticeLogoProps) {
  const outlineColor =
    monoWhite ? "text-white" :
    monoNavy  ? "text-navy"  :
                "text-navy dark:text-white";

  const innerFill =
    monoWhite ? "fill-white/80" :
    monoNavy  ? "fill-[#1B5F8A]" :
                "fill-[#1B5F8A] dark:fill-blue-400";

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Vértice"
      className={cn(outlineColor, className)}
    >
      <circle cx="50" cy="55" r="37" stroke="currentColor" strokeWidth="4" />
      <path
        d="M50 5 L92 80 L8 80 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M50 28 L76 70 L24 70 Z" className={innerFill} />
    </svg>
  );
}
