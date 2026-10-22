import { describe, test, expect } from "vitest";
import type { FileEntry } from "@/components/filetransfer/SFTPTypes";
import {
  NO_SELECTION, allSelected, paneItems, pruneSelection, setPaneSelection, toggleAll, toggleItem,
} from "./sftpSelectionCore";

const f = (name: string, isDir = false) => ({ name, path: `/home/demo/${name}`, isDir, size: 1 }) as unknown as FileEntry;
const a = f("a.txt"), b = f("b.txt"), dir = f("logs", true);

describe("sftp selection", () => {
  test("toggleItem adds then removes by path", () => {
    expect(toggleItem([], a)).toEqual([a]);
    expect(toggleItem([a, b], { ...a })).toEqual([b]);
  });

  test("a pane reporting items owns the selection; empty ends selection mode", () => {
    const s = setPaneSelection("a", [a]);
    expect(s).toEqual({ pane: "a", items: [a] });
    expect(paneItems(s, "a")).toEqual([a]);
    expect(paneItems(s, "b")).toEqual([]);
    expect(setPaneSelection("a", [])).toBe(NO_SELECTION);
  });

  test("selecting in the other pane takes the selection over", () => {
    const s = setPaneSelection("b", [dir]);
    expect(paneItems(s, "a")).toEqual([]);
    expect(paneItems(s, "b")).toEqual([dir]);
  });

  test("toggleAll selects every visible entry, then none", () => {
    const visible = [dir, a, b];
    expect(toggleAll([a], visible)).toEqual(visible);
    expect(allSelected(visible, visible)).toBe(true);
    expect(toggleAll(visible, visible)).toEqual([]);
    expect(allSelected([], [])).toBe(false);
  });

  test("pruneSelection drops entries the listing lost and keeps identity otherwise", () => {
    const items = [a, b];
    expect(pruneSelection(items, [a, b, dir])).toBe(items);
    expect(pruneSelection(items, [b, dir])).toEqual([b]);
    expect(pruneSelection(items, [])).toEqual([]);
  });
});
