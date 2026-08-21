# Realtime Validation Notes

- The authenticated Pre-Canvass and Execution preview routes render the new live-update status badge after the protected browser configuration delivery change.
- The immediate screenshot captured the expected `CONNECTING` state while the Supabase channel handshake was in progress; an end-to-end credential test independently confirmed that an anon browser client receives a server-originated metadata-only broadcast.
- A subsequent settled-state browser check is required before checkpointing.
