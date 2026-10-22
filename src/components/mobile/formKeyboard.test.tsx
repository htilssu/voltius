import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { formFields, nextField, revealDelta, useFormKeyboard, REVEAL_MARGIN_PX } from "./formKeyboard";

afterEach(cleanup);

describe("nextField", () => {
  test("moves to the following field and stops at the last", () => {
    expect(nextField(["a", "b", "c"], "a")).toBe("b");
    expect(nextField(["a", "b", "c"], "c")).toBeNull();
    expect(nextField(["a"], "x")).toBeNull();
  });
});

describe("revealDelta", () => {
  const view = { top: 100, bottom: 600 };
  test("0 when the field sits inside the view with its margin", () => {
    expect(revealDelta({ top: 200, bottom: 256 }, view)).toBe(0);
  });
  test("scrolls down so a field under the keyboard edge clears it by the margin", () => {
    expect(revealDelta({ top: 560, bottom: 616 }, view)).toBe(616 - (600 - REVEAL_MARGIN_PX));
  });
  test("scrolls up for a field above the view", () => {
    expect(revealDelta({ top: 50, bottom: 106 }, view)).toBe(50 - (100 + REVEAL_MARGIN_PX));
  });
  test("a field taller than the view aligns on its top edge", () => {
    expect(revealDelta({ top: 300, bottom: 1300 }, view)).toBe(300 - (100 + REVEAL_MARGIN_PX));
  });
});

function Form({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFormKeyboard(ref);
  return <div ref={ref} data-testid="root">{children}</div>;
}

// jsdom has no layout: every element reports one client rect so formFields sees it.
function withRects() {
  Object.defineProperty(HTMLElement.prototype, "getClientRects", { configurable: true, value: () => [{}] });
}

describe("useFormKeyboard", () => {
  test("Enter moves to the next reachable field, skipping collapsed and disabled ones", () => {
    withRects();
    const { getByTestId } = render(
      <Form>
        <input data-testid="a" />
        <div data-collapsed=""><input data-testid="hidden" /></div>
        <input disabled />
        <textarea data-testid="b" />
      </Form>,
    );
    const root = getByTestId("root");
    expect(formFields(root).map((e) => e.dataset.testid)).toEqual(["a", "b"]);
    const a = getByTestId("a") as HTMLInputElement;
    a.focus();
    expect(a.enterKeyHint).toBe("next");
    a.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(getByTestId("b"));
  });

  test("the last input gets 'done' and Enter closes the keyboard", () => {
    withRects();
    const { getByTestId } = render(<Form><input data-testid="only" /></Form>);
    const el = getByTestId("only") as HTMLInputElement;
    el.focus();
    expect(el.enterKeyHint).toBe("done");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(document.activeElement).not.toBe(el);
  });

  test("an Enter a field already handled (preventDefault) is left alone", () => {
    withRects();
    const { getByTestId } = render(
      <Form>
        <input data-testid="chip" onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} />
        <input data-testid="next" />
      </Form>,
    );
    const chip = getByTestId("chip");
    chip.focus();
    chip.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(chip);
  });
});
