---
name: KidVenture product loop
description: Product decisions for the child-safe, low-screen-time KidVenture MVP.
---

KidVenture is intentionally built around a short digital-to-real-life loop: a parent sets a daily focus window and reward consent, the child completes one meaningful mission, then the app hands the family an offline activity to do together.

**Why:** The product should not compete with entertainment apps on session length; its differentiator is helping families turn limited screen time into curiosity, conversation, and shared offline action.

**How to apply:** Keep new features aligned to short missions, visible parent guardrails, experience-based rewards, age-appropriate content for ages 6–10, and an explicit offline handoff.

For the current local-first MVP, parent feedback is stored on-device and converted into focus areas with a deterministic coach fallback; provider-backed AI should be added only through a server-side integration when a provider credential is available.

**Why:** Managed AI setup required an account upgrade and the user declined providing a provider key, so the parent feedback loop must remain useful without pretending that local heuristics are an LLM.