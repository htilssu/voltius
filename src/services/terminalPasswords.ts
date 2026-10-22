import { findConnection, resolveConnectionCredentials } from "./credentials";
import { useIdentityStore } from "@/stores/identityStore";
import { canConnect } from "./permissionsFromStores";
import { getSecret } from "./vault";

export interface TerminalPasswordChoice { id: string; label: string; username: string; kind: "connection" | "identity" }

/** Metadata only: never load secrets to populate the suggestion UI. */
export function terminalPasswordChoices(connectionId: string): TerminalPasswordChoice[] {
  const connection = findConnection(connectionId);
  const choices: TerminalPasswordChoice[] = connection ? [{ id: connection.id,
    label: connection.name || connection.host, username: connection.username, kind: "connection" }] : [];
  for (const identity of useIdentityStore.getState().identities) {
    if (identity.deleted_at) continue;
    choices.push({ id: identity.id, label: identity.name || identity.username,
      username: identity.username, kind: "identity" });
  }
  return choices;
}

export async function readTerminalPassword(choice: TerminalPasswordChoice): Promise<string | null> {
  if (choice.kind === "connection") {
    const connection = findConnection(choice.id);
    if (!connection) return null;
    return (await resolveConnectionCredentials(connection)).password ?? null;
  }
  const identity = useIdentityStore.getState().identities.find((i) => i.id === choice.id && !i.deleted_at);
  if (!identity || !(await canConnect(identity.vault_id, identity.id))) return null;
  return getSecret(`identity:${identity.id}:password`);
}
