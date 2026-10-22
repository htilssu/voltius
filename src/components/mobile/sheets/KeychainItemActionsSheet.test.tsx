import { describe, test, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import type { Identity, SshKey } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
vi.mock("@iconify/react", () => ({
  Icon: ({ icon }: { icon: string }) => <i data-icon={icon} />,
}));
vi.mock("@/stores/keyStore", () => ({ useKeyStore: Object.assign(() => vi.fn(), { getState: () => ({ loadKeys: vi.fn() }) }) }));
vi.mock("@/stores/identityStore", () => ({ useIdentityStore: Object.assign(() => vi.fn(), { getState: () => ({ loadIdentities: vi.fn() }) }) }));
vi.mock("@/stores/folderStore", () => ({ useFolderStore: () => vi.fn() }));
vi.mock("@/stores/notificationStore", () => ({ APP_SOURCE: { kind: "app" }, useNotificationStore: { getState: () => ({ addToast: vi.fn() }) } }));
vi.mock("@/hooks/useAllFolders", () => ({ useAllFolders: () => [] }));
vi.mock("@/services/publicKeyStore", () => ({ ensurePublicKey: vi.fn() }));
vi.mock("@/utils/clipboard", () => ({ writeClipboard: vi.fn() }));
// The share row must never read the private half itself: only ensurePublicKey (mocked) is used.
vi.mock("@/services/vault", () => ({ getSecret: vi.fn(), storeSecret: vi.fn() }));

import KeychainItemActionsSheet from "./KeychainItemActionsSheet";
import { ensurePublicKey } from "@/services/publicKeyStore";
import { getSecret } from "@/services/vault";
import { useMobileNavStore } from "@/stores/mobileNavStore";
import { initialMobileNavState } from "@/stores/mobileNavCore";

const key = { id: "k1", name: "laptop", tags: [], created_at: "", vault_id: "personal" } as unknown as SshKey;
const identity = { id: "i1", username: "root", tags: [], vault_id: "personal" } as unknown as Identity;

afterEach(() => {
  cleanup();
  useMobileNavStore.setState(initialMobileNavState);
});

describe("KeychainItemActionsSheet edit row", () => {
  test("a key pushes the key-edit screen", () => {
    render(<KeychainItemActionsSheet kind="key" item={key} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-keychain-action='edit']")!);
    expect(useMobileNavStore.getState().stack).toEqual([{ kind: "key-edit", keyId: "k1" }]);
  });

  test("an identity pushes the identity-edit screen", () => {
    render(<KeychainItemActionsSheet kind="identity" item={identity} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-keychain-action='edit']")!);
    expect(useMobileNavStore.getState().stack).toEqual([{ kind: "identity-edit", identityId: "i1" }]);
  });
});

describe("KeychainItemActionsSheet share public key", () => {
  type W = Window & { VoltiusShare?: unknown };
  const PUB = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHk3m1Qq7oHqH2k1lR3n8d0Zr5fXy6V2eJt0c5o4p9Ws me@laptop";
  const bridge = () => {
    const b = { shareText: vi.fn(() => true), shareFiles: vi.fn(() => true) };
    (window as W).VoltiusShare = b;
    return b;
  };
  const shareRow = () => document.querySelector("[data-keychain-action='share-public-key']") as HTMLElement | null;
  afterEach(() => { delete (window as W).VoltiusShare; vi.mocked(ensurePublicKey).mockReset(); });

  test("is not offered without the native share bridge, nor for an identity", () => {
    render(<KeychainItemActionsSheet kind="key" item={key} onClose={() => {}} />);
    expect(shareRow()).toBeNull();
    cleanup();
    bridge();
    render(<KeychainItemActionsSheet kind="identity" item={identity} onClose={() => {}} />);
    expect(shareRow()).toBeNull();
  });

  test("shares the public line as text/plain", async () => {
    const b = bridge();
    vi.mocked(ensurePublicKey).mockResolvedValue(PUB);
    const onClose = vi.fn();
    render(<KeychainItemActionsSheet kind="key" item={key} onClose={onClose} />);
    fireEvent.click(shareRow()!);
    await vi.waitFor(() => expect(b.shareText).toHaveBeenCalledWith(PUB, "laptop"));
    expect(onClose).toHaveBeenCalled();
  });

  test("never shares a private key", async () => {
    const b = bridge();
    vi.mocked(ensurePublicKey).mockResolvedValue("-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjE=\n-----END OPENSSH PRIVATE KEY-----");
    const onClose = vi.fn();
    render(<KeychainItemActionsSheet kind="key" item={key} onClose={onClose} />);
    fireEvent.click(shareRow()!);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(b.shareText).not.toHaveBeenCalled();
    expect(vi.mocked(getSecret)).not.toHaveBeenCalled();
  });
});
