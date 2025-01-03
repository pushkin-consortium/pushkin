---
"pushkin-cli": patch
---

Upgraded docker-compose to ^1.1.0. This means it's using [Docker Compose V2](https://docs.docker.com/compose/releases/migrate/). You might have to update Docker Desktop if you haven't done so in a while. Nothing seems to have broken as far as Pushkin goes in the switch from Compose V1 to V2, but it's possible bugs could arise from this.
