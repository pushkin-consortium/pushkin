---
"pushkin-worker": patch
"@pushkin-templates/site-basic": patch
---

Fix RabbitMQ heartbeat timeout causing worker crashes

**Bug Fix:**
- Resolves "Heartbeat timeout" errors that prevented experiment workers from completing database operations
- Workers would crash with "Error: Heartbeat timeout at Heart.<anonymous>" during experiment execution

**Changes:**
- Added `heartbeat: 30` configuration to `amqp.connect()` in pushkin-worker to send heartbeats every 30 seconds
- Upgraded RabbitMQ from version 3.6 to 3.12 in docker-compose.dev.yml template
- Added `RABBITMQ_HEARTBEAT: '30'` environment variable to RabbitMQ service configuration

**Impact:**
This fix ensures stable RabbitMQ connections during long-running experiment tasks and prevents connection timeouts that were blocking database persistence of user data and experiment results.
