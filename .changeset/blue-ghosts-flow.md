---
"@pushkin-templates/exp-grammaticality-judgment": major
"@pushkin-templates/exp-self-paced-reading": major
"@pushkin-templates/exp-lexical-decision": major
---

Experiment templates are now implemented as npm packages. The contents of the templates remain essentially unchanged but are compressed into `build/template.zip`. `pushkin-cli` v4+ is required to install the new packaged templates.

The reason for this change has to do with Pushkin's transition to a monorepo structure. Previously, Pushkin distributed templates through each repo's GitHub releases, but the new monorepo made this more challenging (see [#254](https://github.com/pushkin-consortium/pushkin/issues/254)). By moving to distributing all projects through npm, Pushkin is able to streamline both its deployment workflow and the CLI code itself.
