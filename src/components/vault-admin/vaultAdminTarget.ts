import { VAULT_MANAGER_BITS, isPrimaryOwner } from "@/services/permissions";

/** What a vault-admin surface acts on. Mirrors `VaultDetail` in VaultsSection. */
export interface VaultAdminTarget {
  kind: "local" | "cloud";
  vaultId: string | null;
  teamId: string | null;
  name: string;
}

/** A vault row of this device (carrying its team id once it is shared). */
export function localVaultTarget(v: { id: string; name: string; teamId?: string | null }): VaultAdminTarget {
  return { kind: "local", vaultId: v.id, teamId: v.teamId ?? null, name: v.name };
}

/** A standalone team vault: a member's team with no local row behind it. */
export function cloudVaultTarget(team: { id: string; name: string }): VaultAdminTarget {
  return { kind: "cloud", vaultId: null, teamId: team.id, name: team.name };
}

/**
 * The target behind a vault entry id, named the way the vault lists name it: a local
 * vault id, else the id of a team with no local row. Null for an id neither resolves
 * (an orphan this device knows nothing about).
 */
export function resolveVaultAdminTarget(
  id: string | null | undefined,
  vaults: { id: string; name: string; teamId?: string | null }[],
  teams: { id: string; name: string }[],
): VaultAdminTarget | null {
  if (!id) return null;
  const vault = vaults.find((v) => v.id === id);
  if (vault) return localVaultTarget(vault);
  const team = teams.find((t) => t.id === id);
  return team ? cloudVaultTarget(team) : null;
}

export interface VaultAdminCapabilities {
  isTeam: boolean;
  isOwner: boolean;
  canRename: boolean;
  canSetLockPolicy: boolean;
  canDelete: boolean;
  canMakePrivate: boolean;
  canLeave: boolean;
}

/**
 * Conditions carried over from the former VaultGeneralTab: `cloud` is a
 * standalone team vault with no local row, and "personal" is
 * the built-in vault that must always exist.
 */
export function vaultAdminCapabilities(
  target: VaultAdminTarget,
  teams: { id: string; owner_id: string; role_ids: string[] }[],
  rolesByTeam: Record<string, { id: string; name: string; is_builtin: boolean; permissions?: number }[]>,
  myUserId: string,
): VaultAdminCapabilities {
  const isTeam = !!target.teamId;
  const isLocal = target.kind === "local";

  const team = target.teamId ? teams.find((t) => t.id === target.teamId) : undefined;
  const roles = target.teamId ? rolesByTeam[target.teamId] ?? [] : [];
  const myRoles = (team?.role_ids ?? []).flatMap((rid) => roles.filter((role) => role.id === rid));
  const isOwner = isPrimaryOwner(team, myUserId);
  const managesTeam = isOwner || myRoles.some((r) => ((r.permissions ?? 0) & VAULT_MANAGER_BITS) !== 0);

  return {
    isTeam,
    isOwner,
    canRename: isTeam ? managesTeam : isLocal,
    canSetLockPolicy: isTeam && managesTeam,
    // The server lets only the primary owner delete a team, and that deletes it for every member.
    canDelete: isTeam ? isOwner : isLocal && target.vaultId !== "personal",
    canMakePrivate: isTeam && isOwner && isLocal && target.vaultId !== null,
    // The server refuses the primary owner leaving their own team.
    canLeave: isTeam && !!myUserId && !isOwner,
  };
}

/**
 * The one place the make-private copy decides between "N other people" and
 * "nobody else". The confirm prompt and the success toast say the same thing
 * about the same team from two different store reads, so the boundary — and the
 * off-by-one that turns a member list into a count of *other* members — lives
 * here rather than being written out at each call site.
 */
export function makePrivateMemberMessage(
  memberCount: number,
  t: (key: string, vars?: { count: number }) => string,
  keys: { others: string; alone: string },
): string {
  return memberCount > 1 ? t(keys.others, { count: memberCount - 1 }) : t(keys.alone);
}
