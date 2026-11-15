# Atlas — Your Personal Intelligence

Atlas is a mobile-first personal AI workspace. The frontend is a static HTML app; the secure chat API runs as Vercel serverless functions.

## Current foundation

- Atlas home, chat, voice, projects, memory, and settings screens
- Chat messages saved locally in the current browser/device
- Server-side provider routing with Gemini first and Groq as fallback
- Provider keys are read only from server environment variables
- A status endpoint reports which providers are configured

## Deploy

1. Import this GitHub repository into Vercel.
2. Add the environment variables below in the Vercel project settings.
3. Deploy. The frontend and /api endpoints must be hosted together on Vercel for this first version.
4. Open the deployed URL and send a test message.

### Environment variables

| Variable | Required | Default |
|---|---|---|
| GEMINI_API_KEY | Optional; at least one provider key is required | — |
| GEMINI_MODEL | No | gemini-3.8-flash |
| GROQ_API_KEY | Optional; at least one provider key is required | — |
| GROQ_MODEL | No | qwen/qwen3.8-27b |

Gemini is attempted first when configured. If it fails, Atlas tries Groq. If only one provider key is configured, Atlas uses that provider.

Get API keys from the official provider dashboards:
- Google AI Studio: https://aistudio.google.com/app/apikey
- Groq: https://console.groq.com/keys

**Never put provider keys in index.html, frontend JavaScript, GitHub commits, or browser storage.** Add them only as Vercel environment variables. Do not share the keys in chat.

## Important notes

- Provider free tiers have changing quotas and rate limits. Fallback improves resilience but cannot guarantee unlimited access.
- This first version stores conversation history in browser localStorage on this device. It is not yet synced across devices or backed up to a user account.
- The app does not yet have long-term semantic memory, web research, voice calling, or autonomous action tools. Those will be built as separate, permission-controlled features.
- For local testing, use a serverless/Vercel-compatible environment. Opening index.html directly will not provide the /api endpoints.
