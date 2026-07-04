import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useEnhanceText } from "./useEnhanceText";
import { toast } from "sonner";

describe("useEnhanceText", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("retorna o texto melhorado e envia o system prompt", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "  texto melhorado  " } }] }),
    });
    const { result } = renderHook(() => useEnhanceText("PROMPT DE TESTE"));
    let out: string | null = null;
    await act(async () => { out = await result.current.enhance("texto original"); });
    expect(out).toBe("texto melhorado");
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "PROMPT DE TESTE" });
    expect(body.messages[1]).toEqual({ role: "user", content: "texto original" });
  });

  it("retorna null e mostra toast quando a API falha", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useEnhanceText("p"));
    let out: string | null = "x";
    await act(async () => { out = await result.current.enhance("abc"); });
    expect(out).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it("não chama a API com texto vazio", async () => {
    const { result } = renderHook(() => useEnhanceText("p"));
    await act(async () => { await result.current.enhance("   "); });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retorna null e avisa quando a chave da API não está configurada", async () => {
    vi.stubEnv("VITE_GROQ_API_KEY", "");
    const { result } = renderHook(() => useEnhanceText("p"));
    let out: string | null = "x";
    await act(async () => { out = await result.current.enhance("abc"); });
    expect(out).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("retorna null e mostra toast quando a IA devolve conteúdo vazio", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "   " } }] }),
    });
    const { result } = renderHook(() => useEnhanceText("p"));
    let out: string | null = "x";
    await act(async () => { out = await result.current.enhance("abc"); });
    expect(out).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
});
