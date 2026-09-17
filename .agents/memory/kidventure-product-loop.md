---
name: KidVenture product loop
description: Product decisions for the child-safe, low-screen-time KidVenture MVP.
---

KidVenture is intentionally built around a short digital-to-real-life loop: a parent sets a daily focus window and reward consent, the child completes one meaningful mission, then the app hands the family an offline activity to do together.

**Why:** The product should not compete with entertainment apps on session length; its differentiator is helping families turn limited screen time into curiosity, conversation, and shared offline action.

**How to apply:** Keep new features aligned to short missions, visible parent guardrails, experience-based rewards, age-appropriate content for ages 6–10, and an explicit offline handoff.

Parent feedback is stored on-device and sent to a server-side Gemini coach when the configured provider is available; the deterministic local coach remains the fallback.

**Why:** The app must remain useful offline and must never pretend that local heuristics are an LLM; keeping the fallback also protects the short parent-child loop when the provider is unavailable.