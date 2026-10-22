// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";

const h = vi.hoisted(() => ({ openVault: vi.fn() }));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock("@iconify/react", () => ({ Icon: () => null }));
vi.mock("./BottomSheet", () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/stores/vaultStore", () => ({
  useVaultStore: (sel: (s: object) => unknown) => sel({
    vaults: [{ id: "personal", name: "Personal" }, { id: "v2", name: "Work" }],
    selectedVaultIds: ["personal"], selectVaultOnly: vi.fn(), addVault: vi.fn(),
  }),
}));
vi.mock("@/stores/teamStore", () => ({ useTeamStore: (sel: (s: object) => unknown) => sel({ teams: [{ id: "t9", name: "Shared", owner_id: "x", role_ids: [] }] }) }));
vi.mock("@/hooks/useAccessibleVaultIds", () => ({ useOrphanVaultIds: () => ["ghost"] }));
vi.mock("@/hooks/accessibleVaults", () => ({ unknownVaultLabel: (id: string) => `? ${id}` }));
vi.mock("@/services/openVault", () => ({ openVault: h.openVault }));
vi.mock("@/components/shared/VaultLimitModal", () => ({ VaultLimitModal: () => null, useVaultLimitReached: () => false }));

import VaultSwitcherSheet from "./VaultSwitcherSheet";
import { useMobileNavStore } from "@/stores/mobileNavStore";

beforeEach(() => {
  h.openVault.mockReset();
  useMobileNavStore.setState({ stack: [], sheet: { kind: "vault-switcher" } });
});
afterEach(cleanup);

test("every known vault has a ⋮; an orphan id has none", () => {
  const { container } = render(<VaultSwitcherSheet />);
  const ids = [...container.querySelectorAll("[data-vault-entry-settings]")].map((e) => e.getAttribute("data-vault-entry-settings"));
  expect(ids).toEqual(["personal", "v2", "t9"]);
  expect(container.querySelector('[data-vault-entry="ghost"]')).not.toBeNull();
});

test("⋮ opens that vault's settings page and closes the sheet", () => {
  const { container } = render(<VaultSwitcherSheet />);
  fireEvent.click(container.querySelector('[data-vault-entry-settings="v2"]')!);
  const s = useMobileNavStore.getState();
  expect(s.stack).toEqual([{ kind: "vault-settings", vaultId: "v2" }]);
  expect(s.sheet).toBeNull();
  expect(h.openVault).not.toHaveBeenCalled();
});

test("a long-press opens the settings page too, without switching vault", () => {
  const { container } = render(<VaultSwitcherSheet />);
  const row = container.querySelector('[data-vault-entry="t9"]')!;
  fireEvent.contextMenu(row);
  fireEvent.click(row);
  expect(useMobileNavStore.getState().stack).toEqual([{ kind: "vault-settings", vaultId: "t9" }]);
  expect(h.openVault).not.toHaveBeenCalled();
});

test("a tap still switches vault", () => {
  const { container } = render(<VaultSwitcherSheet />);
  fireEvent.click(container.querySelector('[data-vault-entry="v2"]')!);
  expect(h.openVault).toHaveBeenCalledWith("v2", undefined);
  fireEvent.click(container.querySelector('[data-vault-entry="ghost"]')!);
  expect(h.openVault).toHaveBeenCalledWith("ghost", undefined);
});
