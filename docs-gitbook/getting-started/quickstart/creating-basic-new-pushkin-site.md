# Creating a basic new Pushkin site

All instructions are for working on a Mac. If you figure out how to install Pushkin on Windows, please update the documentation and submit a pull request!

If you don’t have [Homebrew](https://brew.sh/), install it. Then run the following:

```bash
$ brew install Node wget
```

Install the pushkin-cli package globally.

```bash
$ npm install -g pushkin-cli
```

Next, install [Docker](https://docs.docker.com/install/).

Make sure Docker is running.

Then, open a terminal and move to an empty directory in which to setup Pushkin.

```bash
$ pushkin site default
$ pushkin init site
```

This sets up a skeleton website in the current folder and sets up a development database. Once that finishes, you should have a directory tree that looks something like this:

```text
├── experiments
├── pushkin
   ├── api
   ├── docker-compose.dev.yml
   ├── front-end
   └── util
└── pushkin.yaml
```

Most of the stuff in the pushkin folder won’t need to be edited at all, with the exception of the website \(in the front-end folder\).

