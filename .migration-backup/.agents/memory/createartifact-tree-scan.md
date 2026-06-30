---
name: createArtifact whole-tree scan
description: createArtifact scans the entire workspace for artifact.toml and registers duplicates from backup dirs.
---
When you call `createArtifact`, the platform scans the WHOLE workspace tree for `artifact.toml` files and registers every one it finds — including copies under a backup directory kept inside the workspace (e.g. `.migration-backup/artifacts/*`). These become duplicate artifacts AND duplicate workflows with the same `pnpm --filter` command/package name.

**Why:** During an import/migration, a full snapshot copy left inside the repo root was picked up by the scanner, producing bogus duplicate artifacts/workflows.

**How to apply:** Before registering artifacts, move any backup/snapshot copies OUTSIDE the workspace, or delete them. `.replitignore` does NOT exclude them from the artifact scanner (it only affects deploy image size). After deleting the backup dir, the `automatic_updates` reconcile and the duplicates disappear from `listArtifacts`/`listWorkflows`. Note: deleted files remain in git history, so binary assets can still be recovered via `git show HEAD:<path>`.
