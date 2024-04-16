# pushkin-cli

## 4.1.0

### Minor Changes

- [#305](https://github.com/pushkin-consortium/pushkin/pull/305) [`ffba8bb`](https://github.com/pushkin-consortium/pushkin/commit/ffba8bbbb62d901d271655d71453f95648d5f5aa) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Added modes to `rm exp` to pause and unpause data collection for the specified experiment(s).

### Patch Changes

- [#305](https://github.com/pushkin-consortium/pushkin/pull/305) [`ffba8bb`](https://github.com/pushkin-consortium/pushkin/commit/ffba8bbbb62d901d271655d71453f95648d5f5aa) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - - Fixed issue where workers for experiments including capital letters would not be deleted by `rm exp --mode delete`.

  - Fixed issue where it was possible to create two experiments which would yield workers with the same name.

- [#310](https://github.com/pushkin-consortium/pushkin/pull/310) [`81d9aab`](https://github.com/pushkin-consortium/pushkin/commit/81d9aab753b85d05d8ad572329803fbdfaa2279f) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - - Added logic to front end's `config.js` to automatically detect use in GitHub Codespaces and appropriately set API endpoints
  - Similar logic added to front end's craco config to set WebSocket URL appropriately for Codespaces
  - Added detection of Codespaces-specific environment variables to CLI's `setEnv()` function

## 4.0.0

### Major Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`046ed03`](https://github.com/pushkin-consortium/pushkin/commit/046ed03da5aa3711bfca8dd026fa0356c8a3b242) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - The basic experiment template -- along with all other templates -- is now implemented as an npm package. The contents of the template remain unchanged, but are compressed into `build/template.zip`. `pushkin-cli` v4+ is required to install the new packaged templates.

  The reason for this change has to do with Pushkin's transition to a monorepo structure. Previously, Pushkin distributed templates through each repo's GitHub releases, but the new monorepo made this more challenging (see [#254](https://github.com/pushkin-consortium/pushkin/issues/254)). By moving to distributing all projects through npm, Pushkin is able to streamline both its deployment workflow and the CLI code itself.

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`ad84d51`](https://github.com/pushkin-consortium/pushkin/commit/ad84d5155114debfd50302c8d641cb5a7cf3fb68) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - The `--nomigrations` and `--nocache` flags in `prep` and `start` (respectively) are replaced with `--no-migrations` and `--no-cache`.

### Minor Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`7703288`](https://github.com/pushkin-consortium/pushkin/commit/7703288988244f2f2a1dcba429225d6e0a0c25be) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Users can now delete and archive/unarchive experiments using the `remove experiment` (alias `rm exp`) command.

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`316d6ec`](https://github.com/pushkin-consortium/pushkin/commit/316d6ecbb6547654242d6d214b5feb529ef4b39d) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Testing with Jest is set up by default on the user's site. Current tests distributed with experiment templates now work after installation.

### Patch Changes

- [#285](https://github.com/pushkin-consortium/pushkin/pull/285) [`668abcb`](https://github.com/pushkin-consortium/pushkin/commit/668abcbecd362ac212e750f7599b092953261383) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Removed stray console.log

- [#285](https://github.com/pushkin-consortium/pushkin/pull/285) [`2015e4a`](https://github.com/pushkin-consortium/pushkin/commit/2015e4a7aea89074c5a31b3f7280adea8c1db05e) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Fixed image tags in package READMEs so they display properly on npm

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`2421b20`](https://github.com/pushkin-consortium/pushkin/commit/2421b202844b4f5540e32093a1b21c675487fb89) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - If the user's site directory isn't empty when they call `install site`, the CLI now asks if they really want to install their site there.
