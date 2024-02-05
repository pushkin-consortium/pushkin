# Frequently Asked Qustions (FAQs)

## What are all these different GitHub repos?

If you go to the main [Pushkin Consortium](https://github.com/pushkin-consortium) page on GitHub, you will see a number of different repos. You may not be sure where to find the code or help you're looking for. Here is a quick guide on the most important repos for beginning users/contributors:

- **[pushkin](https://github.com/pushkin-consortium/pushkin):** This repo actually contains the documentation you're currently reading. You probably won't need to look at the contents of this repo unless you are suggesting edits to the docs (for which we'll happily review pull requests!). However, this repo is especially important to newer members of the Pushkin community, because this is where you'll find our [discussion board](https://github.com/pushkin-consortium/pushkin/discussions). Please feel free to open up a discussion with our team and other Pushkin users! You also may find it useful to look at or post [issues](https://github.com/pushkin-consortium/pushkin/issues) in this repo. Most issues related to the Pushkin ecosystem are here, but issues specific to particular modules can be found in the issues sections of those repos.

- **[pushkin-cli](https://github.com/pushkin-consortium/pushkin-cli):** This repo contains the code for the Pushkin command line interface (or "CLI"). This is the software you're interacting with when you run `pushkin` commands from the terminal.

- **Site templates (beginning "pushkin-sitetemplate-") like [pushkin-sitetemplate-basic](https://github.com/pushkin-consortium/pushkin-sitetemplate-basic):** The Pushkin CLI uses these templates when you run `pushkin install site` to set up your Pushkin site.

- **Experiment templates (beginning "pushkin-exptemplates-") like [pushkin-exptemplates-basic](https://github.com/pushkin-consortium/pushkin-exptemplates-basic):** The Pushkin CLI uses these templates when you run `pushkin install experiment` to add a particular experiment to your Pushkin site.

If you want to learn more about these or other Pushkin modules, see the relevant section of the 'ADVANCED' docs or the page on [developing with Pushkin](../developers/developing-with-pushkin.md).

## How do I use an unpublished version of the CLI?

If you want to run an unpublished development version of the CLI rather than a published release, you will first need to clone the CLI repo onto your local machine. Then make sure you checkout the particular branch you want. Navigate to the root of the CLI using `cd` and run:

```bash
 yarn install
 yarn build
```

Start Docker, navigate to the location where you want to install your Pushkin site, and create the directory just as in the [quickstart](../getting-started/quickstart.md). Now instead of running `pushkin install site`, you can access the unpublished CLI command by running:

```bash
 node [path_to_repo]/pushkin-cli/build/index.js install site
```

If your Pushkin site and the CLI repo are in the same parent directory, you can simply run `node ../pushkin-cli/build/index.js install site`. You can access the other CLI commands by replacing `pushkin` in the same way with `node ../pushkin-cli/build/index.js`.

## How do I use unpublished templates?

If you want to run an unpublished site or experiment template, you can select "url" after running `install site` or `install experiment`. When prompted, enter the URL to the releases of the relevant GitHub repo. The URL should begin with "https://" and end with "releases", but either the api.github.com or github.com URL will work.
