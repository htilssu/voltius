import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  find: vi.fn(), resolve: vi.fn(), secret: vi.fn(), can: vi.fn(), identities: [] as Record<string, unknown>[],
}));
vi.mock("./credentials", () => ({ findConnection: mocks.find, resolveConnectionCredentials: mocks.resolve }));
vi.mock("@/stores/identityStore", () => ({ useIdentityStore: { getState: () => ({ identities: mocks.identities }) } }));
vi.mock("./permissionsFromStores", () => ({ canConnect: mocks.can }));
vi.mock("./vault", () => ({ getSecret: mocks.secret }));
import { readTerminalPassword, terminalPasswordChoices } from "./terminalPasswords";
beforeEach(() => { vi.clearAllMocks(); mocks.identities = []; });
describe("terminal password sources", () => {
  it("lists metadata without decrypting secrets, including identities with both a key and password", () => {
    mocks.find.mockReturnValue({ id: "host", name: "Production", username: "alice" });
    mocks.identities = [{ id: "password", username: "root" }, { id: "key", key_id: "k" }, { id: "deleted", deleted_at: "today" }];
    expect(terminalPasswordChoices("host").map((c) => c.id)).toEqual(["host", "password", "key"]);
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.secret).not.toHaveBeenCalled();
  });
  it("resolves current host through existing credential policy", async () => {
    const connection = { id: "host" };
    mocks.find.mockReturnValue(connection);
    mocks.resolve.mockResolvedValue({ password: "stored" });
    expect(await readTerminalPassword({ id: "host", label: "host", username: "alice", kind: "connection" })).toBe("stored");
    expect(mocks.resolve).toHaveBeenCalledWith(connection);
  });
  it("rechecks identity access before reading any secret", async () => {
    mocks.identities = [{ id: "identity", vault_id: "vault" }];
    mocks.can.mockResolvedValue(false);
    const choice = { id: "identity", label: "root", username: "root", kind: "identity" as const };
    expect(await readTerminalPassword(choice)).toBeNull();
    expect(mocks.secret).not.toHaveBeenCalled();
    mocks.can.mockResolvedValue(true);
    mocks.secret.mockResolvedValue("stored");
    expect(await readTerminalPassword(choice)).toBe("stored");
    expect(mocks.secret).toHaveBeenCalledWith("identity:identity:password");
  });
});
