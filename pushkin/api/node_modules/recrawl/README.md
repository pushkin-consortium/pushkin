# recrawl v1.2.2

Collect the descendants of a directory.

```ts
import { recrawl } from 'recrawl'

// Create a crawl function.
// These are the default options.
const crawl = recrawl({
  only: [],
  skip: [],
  deep: true,
  follow: false,
})

// The result is an array when `follow` is false, else an object.
const files = crawl(root)

// Provide your own array/object.
crawl(root, files)

// Provide an iterator.
crawl(root, (file, link) => {
  // The `file` argument is relative to the root.
  // The `link` argument is null for non-symlinks. It will be absolute if the target is outside the root.
})
```

You can use the `crawl()` export if you don't want to reuse the configured crawler.

```ts
import { crawl } from 'recrawl'

crawl(root, {
  only: [],
  skip: [],
  deep: true,
  follow: false,
})
```

### Options

- `only?: string|string[]`
- `skip?: string|string[]`
- `deep?: boolean`
- `depth?: number`
- `enter?: function`
- `filter?: function`
- `follow?: boolean|number|function`
- `adapter?: FileAdapter`

The `only` and `skip` options should be self-explanatory. Paths matching any of
the `only` patterns are good. When `only` is an empty array, all paths are good.
Paths matching any of the `skip` patterns are bad. When `skip` is an empty
array, no paths are bad. The `skip` patterns override the `only` patterns.

To avoid crawling sub-directories, set `deep` to false or `depth` to 0. You
should never define both `deep` and `depth`, because the `depth` option implies
`deep` when it's greater than zero. If neither `deep` nor `depth` are defined,
the default depth is infinite.

The `enter` option is called whenever a directory is encountered. It's passed
the directory path and the current depth. You may return a falsy value to avoid
crawling a directory.

The `filter` option is called whenever a filename is encountered. It's passed
the filename and its basename. You may return a falsy value to skip a filename.
The `only` and `skip` options are applied before this option is called.

To follow all symlinks, set `follow` to true. For greater control, use a
function. It's called whenever a symlink is encountered. You may return a falsy
value to avoid following a symlink. It's passed the symlink path and the current
link depth. If you only need to limit the link depth, you can set `follow` to a
number, where zero is equivalent to false.

The `adapter` option lets you provide your own filesystem.

### Gotchas

- Directory symlinks are treated the same as real directories
- Directories are not affected by the `only` option

### Pattern syntax

Recrawl has its own take on globbing.

1. When a path has no separators (`/`), only the basename is matched.

```js
'*.js' // matches 'a.js' and 'a/b.js'
```

2. Recursivity is implicit.

```js
'a/b' // identical to '**/a/b'
```

3. Use a leading separator to match against the root.

```js
'/*.js' // matches 'a.js' not 'a/b.js'
```

4. Use a trailing separator to match all descendants.

```js
'foo/' // matches 'foo/bar' and 'foo/bar/baz' etc
```

5. Regular expression syntax is supported. (except dot-all)

```js
'*.jsx?' // matches 'a.js' and 'b.jsx'
'*.(js|ts)' // matches 'a.js' and 'b.ts'
```

6. Recursive globbing is supported.

```js
'foo/**/bar' // matches 'foo/bar' and 'foo/a/b/c/bar' etc
```
