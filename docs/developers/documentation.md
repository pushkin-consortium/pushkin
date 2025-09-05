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

For details, see Poetry's [installation instructions](https://python-poetry.org/docs/#installation).

### Install dependencies and build the docs

In the root of the repo, run either:

```
yarn docs:deploy <docs_version> latest
```

or

```
poetry install --no-root
poetry run mike deploy <docs_version> latest -u --alias-type=redirect
```
!!! note
    The former command is simply shorthand for the latter, but the former may not work if you haven't first run `yarn install` in the process of making your changes. This is not necessarily true if you're just fixing an issue in the docs themselves.

For the most faithful representation of what the docs site would look like with your changes, you should substitute `<docs_version>` with the major/minor version number (i.e. X.X) of pushkin-cli; however, getting the version number right isn't particularly important if all you're doing is local testing. It will simply change whether you overwrite an existing version of the docs or create a new one in your local `gh-pages` branch. It will **not** affect the public deployment of the docs.

Including the `latest` alias in your command is helpful, since the docs website defaults to the version tagged `latest`. This way, when you preview your edits, the version you deployed will pop right up when you visit `http://localhost:8000/` (see [below](#preview-the-docs)).

This command builds the docs and commits the new or updated version to your local `gh-pages` branch. Note that you will not be able to push any of these commits to remote unless you are a core Pushkin maintainer, as doing so would affect the public deployment of the docs site. Of course, you can still push your commits editing the source files to whatever development branch/fork you like before making a pull request.

### Preview the docs

In the root of the repo, run either:

```
yarn docs:serve
```

or (1)
{ .annotate }

1.  As above, `yarn docs:serve` may require previously running `yarn install`.

```
poetry run mike serve
```

You should now be able to view the docs at `http://localhost:8000`. When you're done viewing your changes, press ++ctrl+c++. If you want to preview additional changes, you need to re-run the `deploy` and `serve` scripts.

!!! tip
    Each time you build the docs, `mike` automatically commits to your local `gh-pages` branch. If you're doing local testing as you compose updates to the docs, you will be left with a bunch of junk commits on `gh-pages` that you might want to delete. When you've finished your documentation updates and have committed them to your development branch, you can delete your local commits on `gh-pages` by running:

    ```
    git checkout gh-pages && git reset --hard origin/gh-pages
    ```
    
    This will reset your local `gh-pages` branch to the remote state (i.e. whatever is currently deployed on the live site). Make **certain** you've checked out `gh-pages` before running the `reset` command, as you don't want to accidentally reset your actual development branch.

## Public deployment

!!! warning
    Only core Pushkin maintainers have permissions to push to `gh-pages`.

As mentioned [above](#install-dependencies-and-build-the-docs), building the docs locally will automatically commit to `gh-pages`. Pushing these commits will update the public site. Typically, these steps should be automated by the workflow defined in `/.github/workflows/publish-docs.yml`, which helps ensure that `gh-pages` isn't being updated with changes that haven't yet been merged into `main`; however, in some cases, it may be necessary to update `gh-pages` manually.
