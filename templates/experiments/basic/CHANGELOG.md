# @pushkin-templates/exp-basic

## 6.1.0

### Minor Changes

- [#305](https://github.com/pushkin-consortium/pushkin/pull/305) [`ffba8bb`](https://github.com/pushkin-consortium/pushkin/commit/ffba8bbbb62d901d271655d71453f95648d5f5aa) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Added modes to `rm exp` to pause and unpause data collection for the specified experiment(s).

## 6.0.0

### Major Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`046ed03`](https://github.com/pushkin-consortium/pushkin/commit/046ed03da5aa3711bfca8dd026fa0356c8a3b242) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - The basic experiment template -- along with all other templates -- is now implemented as an npm package. The contents of the template remain unchanged, but are compressed into `build/template.zip`. `pushkin-cli` v4+ is required to install the new packaged templates.

  The reason for this change has to do with Pushkin's transition to a monorepo structure. Previously, Pushkin distributed templates through each repo's GitHub releases, but the new monorepo made this more challenging (see [#254](https://github.com/pushkin-consortium/pushkin/issues/254)). By moving to distributing all projects through npm, Pushkin is able to streamline both its deployment workflow and the CLI code itself.

### Minor Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`316d6ec`](https://github.com/pushkin-consortium/pushkin/commit/316d6ecbb6547654242d6d214b5feb529ef4b39d) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Testing with Jest is set up by default on the user's site. Current tests distributed with experiment templates now work after installation.
