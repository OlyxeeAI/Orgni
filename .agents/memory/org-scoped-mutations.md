---
name: Org-scoped mutations / IDOR guard
description: Why per-org mutations in the Orgni API must verify ownership at the model layer, not just the route param.
---

In the Orgni API, routes are `/orgs/:orgId/...` and `orgResolver` puts the org on
`req.org`. But several model mutations (notably validation finding
confirm/reject/edit) update records by raw `id` with no org check. Because the
record id is supplied by the caller, a foreign id under any `:orgId` would mutate
another org's data — broken access control / IDOR.

**Rule:** every per-org mutation must verify the target record belongs to the org
BEFORE writing — do it at the model layer (e.g. `findByIdForOrg(orgId, id)` →
return null on mismatch), and have the controller return 404 when the model
returns null. Thread `req.org.id` through the SDK into the model signature.

**Why:** route-level `:orgId` only authorizes the path, not the specific record.
Ownership must be checked against the stored `orgId` on the record itself.

**How to apply:** when adding any new mutation endpoint, pass orgId all the way to
the model and gate the update on a same-org lookup. Add a cross-org test (foreign
orgId + real record id ⇒ expect 404) to lock it in.
