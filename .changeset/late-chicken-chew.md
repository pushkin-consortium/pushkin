---
"pushkin-cli": patch
---

Relative paths now accepted with `install` and `use-dev`. This fix supports a new package script for the repo `setup-site`, which sets up a test site (up through `pushkin prep`) in the `/testing` directory and takes the name of the site template (e.g. "basic") as its argument.
