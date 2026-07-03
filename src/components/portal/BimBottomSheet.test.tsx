import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BimBottomSheet from "@/components/portal/BimBottomSheet";

describe("BimBottomSheet", () => {
  it("inicia recolhida (peek) e renderiza o conteúdo", () => {
    render(<BimBottomSheet><p>conteúdo do painel</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    expect(sheet.dataset.state).toBe("peek");
    expect(screen.getByText("conteúdo do painel")).toBeInTheDocument();
  });

  it("toque na alça cicla peek → half → full → peek", () => {
    render(<BimBottomSheet><p>x</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    const handle = screen.getByRole("button", { name: /painel do modelo/i });
    fireEvent.click(handle);
    expect(sheet.dataset.state).toBe("half");
    fireEvent.click(handle);
    expect(sheet.dataset.state).toBe("full");
    fireEvent.click(handle);
    expect(sheet.dataset.state).toBe("peek");
  });

  it("arrastar para cima a partir de peek abre half", () => {
    render(<BimBottomSheet><p>x</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    const handle = screen.getByRole("button", { name: /painel do modelo/i });
    fireEvent.pointerDown(handle, { clientY: 700 });
    fireEvent.pointerUp(handle, { clientY: 600 }); // -100px = swipe up
    expect(sheet.dataset.state).toBe("half");
  });

  it("swipe não dispara o clique fantasma que mudaria o estado de novo", () => {
    render(<BimBottomSheet><p>x</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    const handle = screen.getByRole("button", { name: /painel do modelo/i });
    fireEvent.pointerDown(handle, { clientY: 700 });
    fireEvent.pointerUp(handle, { clientY: 600 }); // swipe up → half
    fireEvent.click(handle); // clique sintético que o browser emite após pointerup
    expect(sheet.dataset.state).toBe("half"); // não avançou para full
  });
});
