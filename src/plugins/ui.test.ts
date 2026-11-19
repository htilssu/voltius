import { describe, test, expect } from "vitest";
import * as VoltiusUI from "./ui";

describe("@voltius/ui public surface", () => {
  test("exports exactly the documented components", () => {
    expect(Object.keys(VoltiusUI).sort()).toEqual([
      "BottomSheet", "ConfirmModal", "ConnectionAvatar", "FormSelect", "Icon", "InfoTooltip",
      "MobileButton", "MobileEmptyState", "MobileScreenHeader", "SheetActionRow", "StatusDot", "useActiveSession", "useAutosave", "useCopiedFlash", "useSessionById", "useT",
      "writeClipboard",
    ]);
  });
});
