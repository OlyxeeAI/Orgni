---
name: api-client-react ApiError export
description: How to inspect HTTP status (e.g. 409) from generated React Query hook errors in this monorepo
---

# Inspecting error status from generated API hooks

The generated client in `@workspace/api-client-react` throws an `ApiError` instance
(with `.status`, `.statusText`, `.data`, `.headers`) on non-2xx responses. The class
lives in `lib/api-client-react/src/custom-fetch.ts`.

**Gotcha:** `ApiError` is NOT re-exported from the package barrel by default — the
barrel (`src/index.ts`) only re-exports `./generated/*` plus `setBaseUrl`/`setAuthTokenGetter`.
To do `err instanceof ApiError && err.status === 409` in a frontend, you must add
`export { ApiError } from "./custom-fetch"` to `lib/api-client-react/src/index.ts`,
then rebuild lib declarations (`pnpm run typecheck:libs`) so leaf artifacts see it.

**Why:** Generated hooks' `onError` gives an untyped error; the only clean way to
branch on HTTP status (treat a 409 "already exists" as success, etc.) is the
`ApiError` class, which isn't exposed unless you add it to the barrel.

**How to apply:** Any time the frontend needs to react to a specific status code
from a generated mutation/query, ensure `ApiError` is exported and import it from
`@workspace/api-client-react`.
