# AGENTS.md

## Upstream and remotes

This repository is the fork `htilssu/voltius`, and the fork is the source of truth.

| Remote   | Repository            | Role                                              |
|----------|-----------------------|---------------------------------------------------|
| `origin` | `htilssu/voltius`     | Upstream. Push here, read release tags from here. |
| `o`      | `VoltiusApp/voltius`  | External source. Merge from it only when asked.   |

- Push to `origin` only. Never push to `o`.
- When comparing versions or release tags (for example `plugin-*-v*`), use the fork's tags on `origin`, not VoltiusApp's.
- When a merge from `o` conflicts, keep the fork's intent unless told otherwise.

## After merging from `o`

VoltiusApp publishes its own plugin tags, and they can share a version number with a fork tag while holding different code. For example, both repos have a `plugin-docker-v1.5.4`, and the two tags point to different commits.

After every merge from `o`:

1. Run `node scripts/check-plugin-versions.mjs`.
2. For each plugin it reports, bump `version` in `src/plugins/<id>/manifest.json` above the fork's latest tag.
3. Add a line under `## [Unreleased]` in `CHANGELOG.md` for each bump.
