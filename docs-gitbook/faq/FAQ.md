# Frequently Asked Qustions \(FAQs\)

## How do I use an unpublished version of the CLI?

If you want to run an unpublished development version of the CLI rather than a published release, you will first need to clone the relevant repo onto your local machine. Make sure to checkout the particular branch you want. Navigate to the root of the CLI using `cd` and run:

```bash
 yarn install
 yarn build
```

Start Docker, navigate to the location you want to install your Pushkin site, and create the directory just as in the [quickstart](../getting-started/quickstart/README.md#creating-a-basic-new-pushkin-site). Now instead of running `pushkin install site`, you can access the unpublished CLI command by running:

```bash
 node [path_to_repo]/pushkin-cli/build/index.js install site
```

If your Pushkin site and the CLI repo are in the same parent directory, you can simply run `node ../pushkin-cli/build/index.js install site`. You can access the other CLI commands by replacing `pushkin` in the same way with `node ../pushkin-cli/build/index.js`.

## How to use unpublished templates?

If you want to run an unpublished site or experiment template, you can select "url" after running `install site` or `install experiment`. When prompted, enter the URL to the releases of the relevant GitHub repo. The URL should begin with "https://" and end with "releases", but either the api.github.com or github.com URL will work.
