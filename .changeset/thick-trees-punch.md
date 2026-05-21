---
"@pushkin-templates/exp-basic": patch
"@pushkin-templates/exp-grammaticality-judgment": patch
"@pushkin-templates/exp-lexical-decision": patch
"@pushkin-templates/exp-self-paced-reading": patch
---

**Bug Fix:**
Fix logic error that caused the post-experiment feedback page to show the "Oops! Something went wrong" message when the percentile rank and/or summary stat values was 0, which are valid values. Now it checks for null/undefined.
