---
name: Orgni request validation strips unknown fields
description: Why new request body fields silently vanish before reaching controllers/engine in the api-server.
---

Orgni's api-server validates request bodies with Joi schemas in
`engine/validators/index.js`, and `validate()` runs `schema.validate(req.body,
{ abortEarly: false, stripUnknown: true })`.

**Rule:** any NEW request body field must be added to its Joi schema, or
`stripUnknown: true` deletes it before the controller ever sees it — the
controller/engine then silently falls back to defaults and the feature looks
wired but does nothing.

**Why:** the Lucy "modes" redesign added a `mode` field to the chat request and
threaded it controller → SDK → engine, but `chatSchema` didn't list it, so it
was stripped and the engine always used the default mode. The bug is invisible
end-to-end (UI sends it, request 200s) until you check the schema.

**How to apply:** when adding a field to any `/engine/*` (or other validated)
endpoint, update the matching schema (e.g. `chatSchema`, `askSchema`,
`actionSchema`) in the same change, with an explicit `valid(...)` allowlist for
enums.
