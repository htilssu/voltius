import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaneDragController } from "./usePaneDragController";
import { DropZones } from "./DropZones";
import { useDragStore } from "@/stores/dragStore";
import { findSessionPane, getPaneLeaves, getPaneSessionIds, useLayoutStore } from "@/stores/layoutStore";
import { useSessionStore } from "@/stores/sessionStore";
import type { TerminalSession } from "@/types";

const session = (id: string): TerminalSession => ({ id, connectionId: "host", connectionName: "Host", type: "ssh", status: "connected" });
const originalBegin = useSessionStore.getState().beginSession;
let begin: ReturnType<typeof vi.fn<(connectionId: string, cwd?: string) => string>>;
beforeEach(() => {
  useDragStore.getState().cancelDrag();
  useSessionStore.setState({ sessions: [session("only")], activeSessionId: "only" });
  useLayoutStore.setState({ root: null, splitTabs: [], activeSplitTabId: null, activePaneId: null,
    splitTabActive: false, maximizedPaneId: null, broadcastActive: false, titlebarOrder: ["session:only"] });
  begin = vi.fn(() => {
    useSessionStore.setState((s) => ({ sessions: [...s.sessions, session("duplicate")] }));
    return "duplicate";
  });
  useSessionStore.setState({ beginSession: begin });
});
afterEach(() => { cleanup(); useDragStore.getState().cancelDrag(); useSessionStore.setState({ beginSession: originalBegin }); vi.restoreAllMocks(); });

function Harness({ paneId, targetSessionId = "only" }: { paneId?: string; targetSessionId?: string }) {
  usePaneDragController();
  return <DropZones target={paneId ? { type: "pane", paneId } : { type: "session", sessionId: targetSessionId }} />;
}
function startDrag() {
  act(() => useDragStore.getState().beginTabDrag("only", 0, 0));
  act(() => useDragStore.getState().updatePointer(100, 100));
}
describe("dragging a tab into its own terminal", () => {
  it.each([
    ["left", 5, 300], ["right", 795, 300], ["top", 400, 5], ["bottom", 400, 595],
  ] as const)("splits a single open tab toward %s without Ctrl", (position, x, y) => {
    const { container } = render(<Harness />);
    startDrag();
    const zone = container.firstElementChild!;
    vi.spyOn(zone, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 800, height: 600 } as DOMRect);
    fireEvent.mouseEnter(zone, { clientX: x, clientY: y });
    expect(useDragStore.getState().dropTarget).toEqual({ type: "session", sessionId: "only", position });
    fireEvent.mouseUp(window);
    expect(begin).not.toHaveBeenCalled();
    expect(getPaneLeaves(useLayoutStore.getState().root).filter((leaf) => !leaf.sessionId)).toHaveLength(1);
    expect(getPaneSessionIds(useLayoutStore.getState().root).sort()).toEqual(["only"]);
    const root = useLayoutStore.getState().root!;
    expect(root.type).toBe("split");
    if (root.type === "split") {
      expect(root.direction).toBe(position === "left" || position === "right" ? "h" : "v");
      expect(getPaneSessionIds(position === "left" || position === "top" ? root.first : root.second)).toEqual(["only"]);
    }
    expect(useLayoutStore.getState().splitTabs).toHaveLength(1);
    expect(useSessionStore.getState().activeSessionId).toBe("only");
    expect(useDragStore.getState().isPointerDown).toBe(false);
  });

  it("opens a picker for a session tab dropped onto its own existing pane", () => {
    useSessionStore.setState({ sessions: [session("only"), session("other")] });
    useLayoutStore.getState().createSplitTab("only", "other", "right");
    const pane = findSessionPane(useLayoutStore.getState().splitTabs, "only")!;
    render(<Harness paneId={pane.paneId} />);
    startDrag();
    act(() => useDragStore.getState().setDropTarget({ type: "pane", paneId: pane.paneId, position: "bottom" }));
    fireEvent.mouseUp(window);
    expect(begin).not.toHaveBeenCalled();
    expect(getPaneSessionIds(useLayoutStore.getState().root).sort()).toEqual(["only", "other"]);
  });

  it("moves a tab onto a different session without duplicating", () => {
    useSessionStore.setState({ sessions: [session("only"), session("other")] });
    render(<Harness targetSessionId="other" />);
    startDrag();
    act(() => useDragStore.getState().setDropTarget({ type: "session", sessionId: "other", position: "right" }));
    fireEvent.mouseUp(window);
    expect(begin).not.toHaveBeenCalled();
    expect(getPaneSessionIds(useLayoutStore.getState().root).sort()).toEqual(["only", "other"]);
  });
});
