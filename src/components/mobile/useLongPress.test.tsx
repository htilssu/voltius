import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LONG_PRESS_FALLBACK_MS, useLongPress } from "./useLongPress";

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn(() => true) }));
import { haptic } from "@/lib/haptics";

function Row({ onLong, onTap }: { onLong: () => void; onTap: () => void }) {
  return <button data-row {...useLongPress(onLong, onTap)}>row</button>;
}

const setup = () => {
  const onLong = vi.fn(), onTap = vi.fn();
  const { container } = render(<Row onLong={onLong} onTap={onTap} />);
  return { onLong, onTap, el: container.querySelector("[data-row]")! };
};

beforeEach(() => { vi.useFakeTimers(); vi.mocked(haptic).mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("useLongPress", () => {
  test("a tap runs onTap only", () => {
    const { onLong, onTap, el } = setup();
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(el);
    fireEvent.click(el);
    vi.advanceTimersByTime(LONG_PRESS_FALLBACK_MS * 2);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onLong).not.toHaveBeenCalled();
  });

  test("the WebView contextmenu fires onLong once, without a second haptic, and eats the click", () => {
    const { onLong, onTap, el } = setup();
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.contextMenu(el);
    vi.advanceTimersByTime(LONG_PRESS_FALLBACK_MS * 2);
    fireEvent.touchEnd(el);
    fireEvent.click(el);
    expect(onLong).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    expect(haptic).not.toHaveBeenCalled();
  });

  test("without a contextmenu the fallback timer fires with haptic('press')", () => {
    const { onLong, el } = setup();
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 10 }] });
    vi.advanceTimersByTime(LONG_PRESS_FALLBACK_MS);
    expect(onLong).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledWith("press");
  });

  test("moving past the touch slop (a scroll) cancels it", () => {
    const { onLong, el } = setup();
    fireEvent.touchStart(el, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(el, { touches: [{ clientX: 10, clientY: 40 }] });
    vi.advanceTimersByTime(LONG_PRESS_FALLBACK_MS * 2);
    expect(onLong).not.toHaveBeenCalled();
  });
});
