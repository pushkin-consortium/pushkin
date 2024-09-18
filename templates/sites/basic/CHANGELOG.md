# @pushkin-templates/site-basic

## 1.1.0

### Minor Changes

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`029c3d3`](https://github.com/pushkin-consortium/pushkin/commit/029c3d30baff0df8108e854e7bc4d856be7942e7) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Set up a test suite for the site template (thanks due primarily to @hunterschep), plus minor modifications to the CLI to run tests after the user has installed the site template and experiments.

- [#354](https://github.com/pushkin-consortium/pushkin/pull/354) [`7504ca0`](https://github.com/pushkin-consortium/pushkin/commit/7504ca0385d90d5e1a17824fea294b8b3f179730) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Added end-to-end testing with [Playwright](https://playwright.dev/) to site and experiment templates, plus minor additions to the CLI's site template installation process.

### Patch Changes

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`5a71392`](https://github.com/pushkin-consortium/pushkin/commit/5a71392a5adf03be41ae3c286db52aeac2264c8a) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - changed hard coded key into a randomly generated encrypted key

## 1.0.1

### Patch Changes

- [#334](https://github.com/pushkin-consortium/pushkin/pull/334) [`66b4edb`](https://github.com/pushkin-consortium/pushkin/commit/66b4edb90d1026b1f78f49b8cd303f31a05a7584) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump @babel/traverse from 7.10.5 to 7.24.1

- [#337](https://github.com/pushkin-consortium/pushkin/pull/337) [`4188d63`](https://github.com/pushkin-consortium/pushkin/commit/4188d63b4111856c0475fea80a9d6ea3b54d0528) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump API dependencies:

  - json5 from 2.1.3 to 2.2.3
  - decode-uri-component from 0.2.0 to 0.2.2

- [#295](https://github.com/pushkin-consortium/pushkin/pull/295) [`62f51fa`](https://github.com/pushkin-consortium/pushkin/commit/62f51fa4799376dc40d5775d1f1f005bfba845a4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump browserify-sign from 4.2.1 to 4.2.3 in /templates/sites/basic/src/pushkin/front-end

- [#304](https://github.com/pushkin-consortium/pushkin/pull/304) [`973bb92`](https://github.com/pushkin-consortium/pushkin/commit/973bb92667497df54d41bea5f85061d855c89f06) Thanks [@dependabot](https://github.com/apps/dependabot)! - Added flag to build script to keep node_modules out of template.zip

- [#311](https://github.com/pushkin-consortium/pushkin/pull/311) [`aca988c`](https://github.com/pushkin-consortium/pushkin/commit/aca988c9c4b9acab0b676798a0780848f70bdbf6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump express from 4.18.2 to 4.19.2

- [#309](https://github.com/pushkin-consortium/pushkin/pull/309) [`a63cb95`](https://github.com/pushkin-consortium/pushkin/commit/a63cb958bbbced0aff3a0b2313f3a4af0ef40573) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump express from 4.17.1 to 4.19.2 in /templates/sites/basic/src/pushkin/api

- [#308](https://github.com/pushkin-consortium/pushkin/pull/308) [`b028ea9`](https://github.com/pushkin-consortium/pushkin/commit/b028ea9eb9214839e7bed54db1e1eff699d48935) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump @babel/traverse from 7.10.5 to 7.24.1 in /templates/sites/basic/src/pushkin/front-end

- [#310](https://github.com/pushkin-consortium/pushkin/pull/310) [`81d9aab`](https://github.com/pushkin-consortium/pushkin/commit/81d9aab753b85d05d8ad572329803fbdfaa2279f) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - - Added logic to front end's `config.js` to automatically detect use in GitHub Codespaces and appropriately set API endpoints

  - Similar logic added to front end's craco config to set WebSocket URL appropriately for Codespaces
  - Added detection of Codespaces-specific environment variables to CLI's `setEnv()` function

- [#330](https://github.com/pushkin-consortium/pushkin/pull/330) [`26a630f`](https://github.com/pushkin-consortium/pushkin/commit/26a630f9fc65fb933cd65430936a9695282a24f9) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump front-end dependencies:

  - path-parse from 1.0.6 to 1.0.7
  - minimatch from 3.0.4 to 3.1.2
  - ansi-regex from 5.0.0 to 5.0.1
  - tmpl from 1.0.4 to 1.0.5

- [#310](https://github.com/pushkin-consortium/pushkin/pull/310) [`1b08109`](https://github.com/pushkin-consortium/pushkin/commit/1b0810971292c87afbb7d716469afdde7497ef11) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Switched to self-hosting main site font

- [#333](https://github.com/pushkin-consortium/pushkin/pull/333) [`7751db8`](https://github.com/pushkin-consortium/pushkin/commit/7751db8b3ebcb5a9731b13ba7a32c429c2e51365) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump front-end dependencies:

  - browserslist from 4.13.0 to 4.23.0
  - lodash from 4.17.19 to 4.17.21
  - ini from 1.3.5 to 1.3.8

- [#318](https://github.com/pushkin-consortium/pushkin/pull/318) [`6e7335a`](https://github.com/pushkin-consortium/pushkin/commit/6e7335aed06b185b7d686147765d034c023969c6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump front-end dependencies:

  - minimist from 1.2.5 to 1.2.8
  - word-wrap from 1.2.3 to 1.2.5
  - lodash-es from 4.17.15 to 4.17.21
  - semver from 5.7.1 to 5.7.2

- [#307](https://github.com/pushkin-consortium/pushkin/pull/307) [`02001c7`](https://github.com/pushkin-consortium/pushkin/commit/02001c72d11e693ce248dd9b5ab104b0f1995413) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump webpack-dev-middleware from 5.3.3 to 5.3.4 in /templates/sites/basic/src/pushkin/front-end

- [#304](https://github.com/pushkin-consortium/pushkin/pull/304) [`81f61e4`](https://github.com/pushkin-consortium/pushkin/commit/81f61e4c049a3dd7416c62e4c2b8876fcd1907f2) Thanks [@dependabot](https://github.com/apps/dependabot)! - bump axios to 1.6.8

- [#293](https://github.com/pushkin-consortium/pushkin/pull/293) [`b550585`](https://github.com/pushkin-consortium/pushkin/commit/b55058529bcccb2f45518030d574f58cb846f9f6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump axios in /templates/sites/basic/src/pushkin/front-end from 0.19.2 to 0.28.0

## 1.0.0

### Major Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`046ed03`](https://github.com/pushkin-consortium/pushkin/commit/046ed03da5aa3711bfca8dd026fa0356c8a3b242) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - The basic site template -- along with all other templates -- is now implemented as an npm package. The contents of the template remain unchanged, but are compressed into `build/template.zip`. `pushkin-cli` v4+ is required to install the new packaged template.

  The reason for this change has to do with Pushkin's transition to a monorepo structure. Previously, Pushkin distributed templates through each repo's GitHub releases, but the new monorepo made this more challenging (see [#254](https://github.com/pushkin-consortium/pushkin/issues/254)). By moving to distributing all projects through npm, Pushkin is able to streamline both its deployment workflow and the CLI code itself.
