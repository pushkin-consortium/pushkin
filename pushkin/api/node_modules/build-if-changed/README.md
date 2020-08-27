# build-if-changed

Build your packages only if they changed since the last build.

&nbsp;

## How it works

1. Look for `package.json` modules in the working directory, ignoring any
   `node_modules` directories by default. Any local `.gitignore` is also
   respected.

2. Crawl the package and generate SHA-1 hashes from every watched file. These
   hashes are stored in the `.bic_cache` file next to each `package.json` module.

3. If any `.bic_cache` files are outdated, then `bic` will execute `npm run build`
   in the relevant packages.

&nbsp;

## Usage

1. Install the package:

```sh
yarn add build-if-changed -D
```

2. Edit your `package.json` module to customize the behavior:

```js
// Only watch the "src" directory:
"bic": ["src"],
// Any glob can be included or excluded:
"bic": { "only": [], "skip": [] },
// Disable bic for a package:
"bic": false,
```

3. Use the package:

```sh
yarn build-if-changed
# or
yarn bic
```

&nbsp;

## Notes

- The `skip` config takes precedence over the `only` config.
- The `.git` and `node_modules` directories are always skipped.
- Any package with `bic` or `build-if-changed` in its "build" script is skipped.
- This tool uses a custom glob syntax ([see here](https://www.npmjs.com/package/recrawl#pattern-syntax)).
