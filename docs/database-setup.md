# Database phase: Supabase Postgres and pgvector

## What the schema provides

The migration creates relational tables for accounts, contacts, services, opportunities, interactions, documents, follow-up actions, and suggestions. It also creates `document_chunks` with a 384-dimension pgvector column and a cosine-similarity search function. Singtel-wide knowledge documents can have a null account ID and `singtel_global` scope; customer records are linked to an account and can optionally be scoped to an opportunity.

Postgres and pgvector are one database service. The normal columns preserve dates, ownership, and relationships; the vector column supports semantic retrieval over document and interaction chunks.

## Setup

1. Create a Supabase project for the prototype.
2. Open the Supabase SQL editor and run `supabase/migrations/202611160001_customer_rag.sql`.
3. Copy `.env.example` to `.env`.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the project settings. Keep the service-role key in the backend environment only; never expose it through a `VITE_` or `NEXT_PUBLIC_` variable or commit it to Git.
5. Sign in to the app and request `/api/storage/status` to check that the backend can reach the database.

## Current boundary

The app still uses its local prototype files for customer accounts, pasted emails, and the local embedding index. This phase prepares the database schema and a backend connection check; the next database integration step will move those reads and writes into Supabase and store/retrieve embeddings through `document_chunks` and `match_customer_chunks`.

Do not put real customer data into the prototype until the database integration, authentication and account policies, retention rules, and Singtel’s vendor/security requirements are reviewed.
