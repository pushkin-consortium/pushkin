---
"pushkin-cli": patch
---

**Bug Fix:**
Fix Docker COPY error when running pushkin prep on a site with no experiments installed.
Fix TypeError that can be thrown when pushkin prep fails to set up the database.
Fix pushkin prep failure that results from orphaned database volumes.

**Improvements:**
Improve error catching/handling for docker build commands.
