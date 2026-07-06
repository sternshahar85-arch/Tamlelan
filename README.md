# Tamlelan - Autonomous AI Meeting Agent

Tamlelan is a private meeting agent built on pay-per-use cloud infrastructure rather than a fixed monthly SaaS subscription: it records a meeting locally, uploads the audio to Google Cloud, runs it through a serverless Gemini pipeline for analysis, and delivers a structured summary, a full transcript, and (when relevant) an architecture diagram to Google Drive - with no manual transcription step and no third-party SaaS dependency. It is in active daily personal use by the author.

## Why this exists

Meeting notes are usually either skipped or written from memory afterward. Tamlelan removes that tradeoff: press Start, talk, press End, and a structured executive summary, decisions log, action items table, and full verbatim transcript are waiting in Drive a few minutes later - fully automated, with no fixed recurring subscription fee. Operating cost is variable and usage-based (Google Cloud billing per Gemini API call, Cloud Run invocation, and storage), not zero - a deliberate build-vs-buy trade-off against a SaaS transcription subscription.

## Architecture

```
Windows client (scribe.py)          Cloud Storage              Cloud Run (Eventarc-triggered)
------------------------------      --------------------        --------------------------------
Tkinter GUI, threaded recording  -> tamlelan-inbox-*.wav     ->  main.py (functions-framework)
Captures BOTH microphone and                                    - atomic GCS lock keyed by the
system-output audio (WASAPI                                       Eventarc event ID (idempotent
loopback) and mixes them, so                                       even under at-least-once
remote-call audio is captured                                      delivery / duplicate events)
too, not just the mic                                            - Gemini 3.1 Pro: structured
Local backup vault (7-day                                          JSON summary (topics,
retention) survives any                                             decisions, action items)
upload failure                                                    - Gemini 3.1 Pro: full Hebrew
                                                                     verbatim transcript
                                                                   - Gemini 3.1 Flash: conditional
                                                                     Mermaid.js diagram if a
                                                                     technical architecture was
                                                                     discussed
                                                                        |
                                                                        v
                                                          Google Apps Script webhook (doPost)
                                                          - shared-secret + folder allowlist
                                                            checked in the request body
                                                            (Apps Script does not support
                                                            custom HTTP headers)
                                                          - writes into the author's personal
                                                            Drive, sidestepping GCS free-tier
                                                            storage-quota limits
```

## Security posture

This is a personal-scale system, but it is designed against the same principles used in production cloud environments:

- **Least-privilege service accounts.** The Cloud Run processor and the desktop client each run under a dedicated service account scoped to exactly what they need (bucket-scoped `storage.objectAdmin` / `storage.objectCreator`), not the project-wide default Compute Engine service account.
- **No credentials in source or in binaries.** API keys and the webhook shared secret are stored in Secret Manager and injected at runtime, not hardcoded or passed as plaintext environment variables. The desktop client's service-account key file is never bundled inside the compiled executable (a PyInstaller `--onefile` archive can be extracted trivially) - it ships alongside it instead.
- **Idempotency by construction.** The pipeline uses an atomic Cloud Storage conditional write (`if_generation_match=0`) keyed by the Eventarc event ID as a distributed lock, so duplicate event delivery (an explicit guarantee of the platform, not an edge case) never causes double-processing.
- **Authenticated webhook.** The Drive-delivery bridge validates a shared secret and an allowlisted destination folder on every request, rather than trusting the caller.

## What's deliberately out of scope

- **A mobile client** (Flutter/Android) was considered and consciously dropped to keep effort focused on hardening the core pipeline rather than expanding surface area.
- **Long-term memory / RAG over past meetings** (a Vertex AI Search agent grounded in the summaries folder) is a designed extension, not yet built.
- No automated test suite or CI pipeline exists; this is a personal tool, validated through real daily use rather than a formal test harness.

## Stack

Python (`sounddevice`/`pyaudiowpatch`, `scipy`, `numpy`, `google-cloud-storage`), Tkinter, PyInstaller, Google Cloud Run (2nd gen, Eventarc-triggered), Google Cloud Storage, Google Secret Manager, IAM, Gemini API (`google-genai`), Google Apps Script.
