# Keep Lovable AI with your own Supabase

## Current state (verified)

- **Lovable AI is independent of Lovable Cloud.** Disconnecting Cloud did not remove the AI key: `LOVABLE_API_KEY` is still provisioned as a managed project secret and is present in the server environment.
- The AI assistant (`chatAssistant` server function in `src/lib/analytics.functions.ts`) already calls the Lovable AI Gateway server-side using that key (`openai/gpt-6-astra` on `/v1/responses`, with a data-querying tool).
- Data connectivity on your own Supabase is fine: `transactions`, `transaction_details`, `plants`, `mother_warehouses`, `distributors` all return 200 via the REST API.

## Conclusion: the cleanest way is what's already wired

No migration, no new credentials, no code changes are required. The assistant reads the key only on the server and never exposes it to the browser, and AI usage is billed to this workspace as before.

## Work to do

1. **Live verification (the only real step):**
   - Send a real question through the assistant (e.g. "Top 5 categories by sales for Q2") via the running app and confirm it grounds its answer in the Supabase data.
   - Confirm the gateway responds with a valid answer and no auth/credit errors (401/402/403).
2. **If the key were rejected** (`lovable_api_key_not_registered`), rotate it with the platform key-rotation tool and re-verify — not expected, since the secret is present and registered.
3. **If the assistant returns data errors**, that would be a Supabase RLS/permissions issue on your own project, not an AI issue; report findings before changing anything.

## What will NOT change

- Your external Supabase connection and `.env` configuration.
- All existing dashboard code, data loading, and analytics.
- The assistant's model, tools, and prompts.
