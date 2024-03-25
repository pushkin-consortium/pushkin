# @pushkin-templates/site-basic

## 1.0.1

### Patch Changes

- [#295](https://github.com/pushkin-consortium/pushkin/pull/295) [`62f51fa`](https://github.com/pushkin-consortium/pushkin/commit/62f51fa4799376dc40d5775d1f1f005bfba845a4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump browserify-sign from 4.2.1 to 4.2.3 in /templates/sites/basic/src/pushkin/front-end

- [#308](https://github.com/pushkin-consortium/pushkin/pull/308) [`b028ea9`](https://github.com/pushkin-consortium/pushkin/commit/b028ea9eb9214839e7bed54db1e1eff699d48935) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump @babel/traverse from 7.10.5 to 7.24.1 in /templates/sites/basic/src/pushkin/front-end

- [#307](https://github.com/pushkin-consortium/pushkin/pull/307) [`02001c7`](https://github.com/pushkin-consortium/pushkin/commit/02001c72d11e693ce248dd9b5ab104b0f1995413) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump webpack-dev-middleware from 5.3.3 to 5.3.4 in /templates/sites/basic/src/pushkin/front-end

- [#293](https://github.com/pushkin-consortium/pushkin/pull/293) [`b550585`](https://github.com/pushkin-consortium/pushkin/commit/b55058529bcccb2f45518030d574f58cb846f9f6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump axios in /templates/sites/basic/src/pushkin/front-end from 0.19.2 to 0.28.0

## 1.0.0

### Major Changes

- [#290](https://github.com/pushkin-consortium/pushkin/pull/290) [`046ed03`](https://github.com/pushkin-consortium/pushkin/commit/046ed03da5aa3711bfca8dd026fa0356c8a3b242) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - The basic site template -- along with all other templates -- is now implemented as an npm package. The contents of the template remain unchanged, but are compressed into `build/template.zip`. `pushkin-cli` v4+ is required to install the new packaged template.

  The reason for this change has to do with Pushkin's transition to a monorepo structure. Previously, Pushkin distributed templates through each repo's GitHub releases, but the new monorepo made this more challenging (see [#254](https://github.com/pushkin-consortium/pushkin/issues/254)). By moving to distributing all projects through npm, Pushkin is able to streamline both its deployment workflow and the CLI code itself.
