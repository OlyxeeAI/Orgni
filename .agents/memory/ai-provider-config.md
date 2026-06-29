---
name: AI provider config (Grok/xAI vs Anthropic)
description: Why Grok auth fails when the provider defaults wrong, and the chosen default-provider contract.
---

# AI provider configuration

This is a **Grok app**: the single LLM interface (`getConfig` in the api-server engine's
`ai.service.js`) defaults the provider to **grok** when none is explicitly set.

**Why this matters:** Grok speaks the OpenAI-compatible API (Bearer auth at `api.x.ai`), NOT the
Anthropic API (`x-api-key` at `api.anthropic.com`). The original auth failure was a Grok key being
sent to Anthropic's host with the wrong header → 401. Defaulting to grok guarantees a "key only"
deployment (just an API key env var, nothing else) still authenticates correctly.

**How to apply:**
- The API key is supplied by the *deployment* environment (the user keeps it in their own env, e.g.
  Vercel). It is read under several aliases (AI_API_KEY / GROK_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY).
  In Replit dev with no key, AI calls intentionally fail with MISSING_API_KEY — do NOT hardcode/fake a
  key to "fix" that.
- To switch off Grok (e.g. to Anthropic), set `AI_PROVIDER` (or `AI_DEFAULT_PROVIDER`) explicitly.
- `AI_MODEL` overrides the model (default `grok-2-latest`); `AI_BASE_URL` overrides the host.
