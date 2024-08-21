---
"pushkin-cli": patch
---

Relative paths now accepted with `install` and `use-dev`. This fix supports a new package script for the repo `test:e2e:setup`, which sets up and starts a test site (through `pushkin start`) in the `/testing` directory and takes the name of the site template (e.g. "basic") as its argument.
