# @pushkin-templates/exp-basic

## 6.2.0

### Minor Changes

- [#354](https://github.com/pushkin-consortium/pushkin/pull/354) [`468998f`](https://github.com/pushkin-consortium/pushkin/commit/468998f94396c12e72b7478d35864707e8017120) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Added support for jsPsych simulation mode for both automated end-to-end testing and manual testing. To demo this feature, navigate to `http://localhost/quizzes/<exp-name>?simulate=true&mode=visual` to launch the experiment in visual simulation mode.

- [#354](https://github.com/pushkin-consortium/pushkin/pull/354) [`7504ca0`](https://github.com/pushkin-consortium/pushkin/commit/7504ca0385d90d5e1a17824fea294b8b3f179730) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Added end-to-end testing with [Playwright](https://playwright.dev/) to site and experiment templates, plus minor additions to the CLI's site template installation process.

### Patch Changes

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`329c560`](https://github.com/pushkin-consortium/pushkin/commit/329c560454b5f139dbafab3a2693180061bb44a4) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Bumped pushkin-worker to 3.0.2 in experiment templates' worker component

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`5a71392`](https://github.com/pushkin-consortium/pushkin/commit/5a71392a5adf03be41ae3c286db52aeac2264c8a) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Removed console.logging of potentially sensitive information like passwords

## 6.1.0

### Minor Changes

- [#305](https://github.com/pushkin-consortium/pushkin/pull/305) [`ffba8bb`](https://github.com/pushkin-consortium/pushkin/commit/ffba8bbbb62d901d271655d71453f95648d5f5aa) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Added modes to `rm exp` to pause and unpause data collection for the specified experiment(s).

### Patch Changes

- [#304](https://github.com/pushkin-consortium/pushkin/pull/304) [`973bb92`](https://github.com/pushkin-consortium/pushkin/commit/973bb92667497df54d41bea5f85061d855c89f06) Thanks [@dependabot](https://github.com/apps/dependabot)! - Added flag to build script to keep node_modules out of template.zip

- [#311](https://github.com/pushkin-consortium/pushkin/pull/311) [`aca988c`](https://github.com/pushkin-consortium/pushkin/commit/aca988c9c4b9acab0b676798a0780848f70bdbf6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump express from 4.18.2 to 4.19.2

- [#338](https://github.com/pushkin-consortium/pushkin/pull/338) [`2c96097`](https://github.com/pushkin-consortium/pushkin/commit/2c9609743f32c15a6e812daeb15188bc481a3864) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Regenerate lock files for web page, api controllers, and worker components of all experiment templates to resolve security alerts.

- [#304](https://github.com/pushkin-consortium/pushkin/pull/304) [`81f61e4`](https://github.com/pushkin-consortium/pushkin/commit/81f61e4c049a3dd7416c62e4c2b8876fcd1907f2) Thanks [@dependabot](https://github.com/apps/dependabot)! - bump axios to 1.6.8

## 6.0.0

### Major Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`046ed03`](https://github.com/pushkin-consortium/pushkin/commit/046ed03da5aa3711bfca8dd026fa0356c8a3b242) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - The basic experiment template -- along with all other templates -- is now implemented as an npm package. The contents of the template remain unchanged, but are compressed into `build/template.zip`. `pushkin-cli` v4+ is required to install the new packaged templates.

  The reason for this change has to do with Pushkin's transition to a monorepo structure. Previously, Pushkin distributed templates through each repo's GitHub releases, but the new monorepo made this more challenging (see [#254](https://github.com/pushkin-consortium/pushkin/issues/254)). By moving to distributing all projects through npm, Pushkin is able to streamline both its deployment workflow and the CLI code itself.

### Minor Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`316d6ec`](https://github.com/pushkin-consortium/pushkin/commit/316d6ecbb6547654242d6d214b5feb529ef4b39d) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Testing with Jest is set up by default on the user's site. Current tests distributed with experiment templates now work after installation.
