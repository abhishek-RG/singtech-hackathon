# Phase 1: Demo scope and sample-data plan

## Product goal

Build a RAG-powered sales copilot that retrieves relevant facts from an account's lifetime interaction history and Singtel's available service information. It presents concise, source-backed guidance to the assigned salesperson, including during a live microphone-fed mock conversation.

The customer timeline is a lifetime account workspace and document finder. Opportunities are separate records linked to the enduring customer account. A won deal does not end the timeline: later onboarding, service reviews, renewals, and new product opportunities remain part of the same relationship history.

## Prototype journey

1. The single preconfigured demo user signs in. There is no public signup flow in this prototype.
2. They open an account and review its existing Singtel service, prior interactions, opportunities, and source documents in a searchable timeline.
3. They paste a mock email. The app links it to the selected account, adds it to the timeline, and makes its content retrievable.
4. They start a microphone-fed mock conversation. The app displays a live transcript and retrieves relevant account history and service information.
5. The copilot shows a concise suggestion with the supporting customer interaction and Singtel service source.
6. The salesperson reviews the suggestion, saves the interaction summary, and sees follow-up actions and any new opportunity signal added to the account.

## Demo data rules

- Use the Singtel service names and brief descriptions supplied in the challenge image: 5G+, Singtel CUBZ, Cyber Security, Internet of Things, Mobility, and Quantum-Safe Network.
- Do not invent technical specifications, pricing, availability, or promises for any Singtel service. Product suggestions must be grounded in the available service descriptions and the customer's mock requirements.
- Create fictional customer names, contacts, needs, emails, transcripts, timelines, commitments, and deal outcomes. Mark this material as demo data in the interface and seed records.
- Use multiple dated interactions for one account so the demo proves continuity over time, including a past purchase and a later potential need.
- Keep one preconfigured demo user for this prototype. Do not build public signup or multi-user assignment UI in this phase.
- Email input is manual paste for this phase. Do not connect a real mailbox.
- Live audio is microphone-fed and user-started. Do not claim it is a Zoom, Teams, phone-system, or WhatsApp integration.

## Initial account and opportunity structure

- One preconfigured demo salesperson user; no public signup.
- One primary account containing a dated, multi-stage relationship history, an existing Singtel service, a completed earlier opportunity, and a later potential opportunity.
- Each interaction and extracted event retains its account, optional opportunity, date, channel, and source reference.

## Prototype boundaries

Included in the first build:

- Branded sign-in for one preconfigured demo user and a customer workspace.
- Customer-lifetime timeline and document finder for available demo material.
- Manual email paste and sample document ingestion.
- RAG retrieval over mock customer history and the supplied Singtel service information.
- Microphone-fed live transcript using the selected streaming speech-to-text integration, with a clearly labeled fallback if credentials are unavailable.
- Source-backed suggestions, interaction summaries, and follow-up actions for salesperson review.

Deferred until separately scoped and authorized:

- Live mailbox synchronization.
- Direct Zoom, Teams, telephony, or WhatsApp Business integration.
- Production customer data, production SSO, CRM synchronization, and enterprise deployment controls.

## Phase 1 decisions carried forward

- Preserve the repository's JavaScript ESM conventions: React/Vite frontend and Express 5 backend. Do not introduce TypeScript or a CSS framework into this scaffold.
- Use a single-user demo login for the first prototype, with signup disabled. Revisit Supabase Auth and Postgres/pgvector when provider credentials and the multi-user scope are confirmed.
- Use local Node-compatible embeddings and Groq for prototype text generation, subject to the selected models and account availability.
- Keep all generated customer interactions explicitly fictional and all product claims bounded by the supplied Singtel material.
