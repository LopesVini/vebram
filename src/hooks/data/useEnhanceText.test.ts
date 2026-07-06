import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const invoke = vi.fn();
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));

import { useEnhanceText } from "./useEnhanceText";
import { toast } from "sonner";

describe("useEnhanceText", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("retorna o texto melhorado e envia o system prompt", async () => {
    invoke.mockResolvedValue({
      data: { choices: [{ message: { content: "  texto melhorado  " } }] },
      error: null,
    });
    const { result } = renderHook(() => useEnhanceText("PROMPT DE TESTE"));
    let out: string | null = null;
    await act(async () => { out = await result.current.enhance("texto original"); });
    expect(out).toBe("texto melhorado");
    const [fnName, opts] = invoke.mock.calls[0];
    expect(fnName).toBe("chat-groq");
    expect(opts.body.messages[0]).toEqual({ role: "system", content: "PROMPT DE TESTE" });
    expect(opts.body.messages[1]).toEqual({ role: "user", content: "texto original" });
  });

  it("retorna null e mostra toast quando a API falha", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("boom") });
    const { result } = renderHook(() => useEnhanceText("p"));
    let out: string | null = "x";
    await act(async () => { out = await result.current.enhance("abc"); });
    expect(out).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it("não chama a API com texto vazio", async () => {
    const { result } = renderHook(() => useEnhanceText("p"));
    await act(async () => { await result.current.enhance("   "); });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("retorna null e mostra toast quando a IA devolve conteúdo vazio", async () => {
    invoke.mockResolvedValue({
      data: { choices: [{ message: { content: "   " } }] },
      error: null,
    });
    const { result } = renderHook(() => useEnhanceText("p"));
    let out: string | null = "x";
    await act(async () => { out = await result.current.enhance("abc"); });
    expect(out).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
});
