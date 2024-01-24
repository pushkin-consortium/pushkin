# Pushkin's documentation

## Overview

Pushkin's documentation practices have been heavily influenced by [jsPsych](https://www.jspsych.org/) (thanks for the inspiration!). The docs use [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/). You can find the documentation files in the `/docs` directory of the [Pushkin GitHub repo](https://github.com/pushkin-consortium/pushkin/tree/main/docs).

## Local testing

Since the docs are written in Markdown, the simplest of changes (e.g., typos) may not require a local build for testing purposes; the Markdown preview in your IDE may be sufficient. However, for anything substantive, you'll want to build and view the site locally to test your changes. After making changes in your development branch/fork, follow the steps below to test the site.

### Install Poetry

MkDocs requires [Python](https://www.python.org/downloads/), which we'll assume you already have. [Poetry](https://python-poetry.org/) is a package manager for Python. Building the Pushkin documentation doesn't necessarily require Poetry, but it makes it easier to install the docs' dependencies and guarantees the consistency of the build across contributors.

The easiest way to install Poetry is with [pipx](https://github.com/pypa/pipx). If you need to install pipx, follow their [installation instructions](https://github.com/pypa/pipx?tab=readme-ov-file#install-pipx). Then, all you need to do is run:

```
pipx install poetry
```

For more details, see Poetry's [installation instructions](https://python-poetry.org/docs/#installation).

### Install dependencies

In the root of the repo, run:

```
poetry install --no-root
```

This will install Material for MkDocs and the handful of other dependencies the docs use.

### Build the docs locally

In the root of the repo, run either:

```
yarn docs:deploy <docs_version>
```
or

```
poetry run mike deploy -u <docs_version>
```
!!! note
    The former command is simply shorthand for the latter, but the former may not work if you haven't first run `yarn install` in the process of making your changes. This is not necessarily true if you're just fixing a small issue in the docs themselves.

Getting the version number right isn't particularly important if all you're doing is local testing. It will simply change whether you overwrite an existing version of the docs or create a new one in your local `gh-pages` branch. In either case, you'll be able to select the version to which you made changes when you view the docs in the next step.

This command builds the docs and commits the new or updated version to your local `gh-pages` branch. Note that you will not be able to push any commits to remote unless you are a core Pushkin maintainer, as doing so would affect the public deployment of the docs site.

### Preview the docs

In the root of the repo, run either:

```
yarn docs:serve (1)
```
{ .annotate }

1.  See note above on potentially requiring `yarn install`.

or

```
poetry run mike serve
```

You should now be able to view the docs at http://localhost:8000.

!!! tip
    Each time you build the docs, `mike` automatically commits to your local `gh-pages` branch. If you're doing local testing as you compose updates to the docs, you will be left with a bunch of junk commits that you might want to delete. To delete them, run:

    ```
    git checkout gh-pages
    git reset --hard origin/gh-pages
    ```
    
    This will reset your local `gh-pages` branch to its remote state (i.e. whatever is currently deployed on the live site).

## Public deployment

!!! warning "For core Pushkin maintainers only"

