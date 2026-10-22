import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PaneView } from "./PaneView";
import { getPaneLeaves, getPaneSessionIds, useLayoutStore } from "@/stores/layoutStore";
import { useSessionStore } from "@/stores/sessionStore";
vi.mock("@/components/shared/HostPickerPanel", () => ({ HostPickerPanel: ({onPick,onBack}: any) => <><button onClick={() => onPick({kind:"remote",connection:{id:"chosen-host"}})}>choose server</button><button onClick={onBack}>back</button></> }));
vi.mock("./PaneHeader", () => ({ PaneHeader: () => null }));
vi.mock("./PaneTerminal", () => ({ PaneTerminal: () => null }));
const originalBegin = useSessionStore.getState().beginSession;
const begin = vi.fn(() => { useLayoutStore.getState().setSplitTabActive(false); return "chosen-session"; });
beforeEach(() => {
  begin.mockClear();
  useLayoutStore.setState({root:null,splitTabs:[],activeSplitTabId:null,activePaneId:null,splitTabActive:false});
  useSessionStore.setState({beginSession:begin});
  useLayoutStore.getState().splitWithPicker("original", "right");
});
afterEach(() => { cleanup(); useSessionStore.setState({beginSession:originalBegin}); });
it("waits for server choice and fills the reserved pane, preserving original terminal", () => {
 const picker = getPaneLeaves(useLayoutStore.getState().root).find(n => !n.sessionId)!;
 render(<PaneView node={picker} visible />);
 expect(begin).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText("choose server"));
 expect(begin).toHaveBeenCalledExactlyOnceWith("chosen-host");
 expect(getPaneSessionIds(useLayoutStore.getState().root).sort()).toEqual(["chosen-session","original"]);
 expect(useLayoutStore.getState()).toMatchObject({splitTabActive:true,activePaneId:picker.id});
 expect(useLayoutStore.getState().splitTabs[0].activePaneId).toBe(picker.id);
});
it("closing picker returns original terminal to a normal tab", () => {
 const picker = getPaneLeaves(useLayoutStore.getState().root).find(n => !n.sessionId)!;
 render(<PaneView node={picker} visible />);
 fireEvent.click(screen.getByText("back"));
 expect(begin).not.toHaveBeenCalled();
 expect(useLayoutStore.getState().splitTabs).toHaveLength(0);
});
