---
name: React catalog pin
description: Why the React version in the pnpm catalog can be bumped freely
---

The `pnpm-workspace.yaml` `catalog:` pinned `react`/`react-dom` to an exact version
with a comment claiming "Must be this exact version because expo requires it".

**Why:** That comment is a leftover from the monorepo template. This project has no
Expo/React Native artifact (artifacts are: orgni, orgni-app, api-server,
mockup-sandbox — all web/Node). So the exact pin and the Expo constraint do not apply.

**How to apply:** React and react-dom can be upgraded together in the catalog. After
bumping, run `pnpm install` then `pnpm run build` to confirm all artifacts compile.
If an Expo artifact is ever added, re-introduce an exact-version constraint matched to
Expo's required React version.
