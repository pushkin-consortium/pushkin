---
"pushkin-worker": patch
---

**Bug Fix:**
Fix bug that caused a race condition between adding a user to the database when the experiment starts and adding stimulus/response data that references that user.
