---
"pushkin-cli": patch
---

- Fixed issue where workers for experiments including capital letters would not be deleted by `rm exp --mode delete`.
- Fixed issue where it was possible to create two experiments which would yield workers with the same name.
