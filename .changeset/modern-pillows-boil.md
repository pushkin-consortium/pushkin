---
"@pushkin-templates/site-basic": patch
"pushkin-cli": patch
---

- Added logic to front end's `config.js` to automatically detect use in GitHub Codespaces and appropriately set API endpoints
- Similar logic added to front end's craco config to set WebSocket URL appropriately for Codespaces
- Added detection of Codespaces-specific environment variables to CLI's `setEnv()` function
