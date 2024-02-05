# Contributor Guidelines

We encourage contributions of all kinds, including changes to the core codebase, development of new sites and templates, and improvements to the documentation.

The project is managed entirely through the [GitHub repository](https://github.com/pushkin-consortium/pushkin). There you can:

* Use [discussions](https://github.com/pushkin-consortium/pushkin/discussions) to propose ideas for development and seek feedback on contributions, such as a new plugin.
* Use [issues](https://github.com/pushkin-consortium/pushkin/issues) to identify anything with an actionable next step, like a page in the documentation that needs to be fixed, a bug in the code, or a specific feature with a clear scope.
* Submit a [pull request](https://github.com/pushkin-consortium/pushkin/pulls) with modifications to the codebase. Pull requests will be reviewed by one or more members of the core team.

## Reporting Security Vulnerabilities

!!! warning
    **If you believe you have found a security vulnerability that is too dangerous to be shared publicly, please refer to our [security policy](./security.md) for guidance on reporting it privately.**
    
## Guidelines for Contributing

### Contributing to the Codebase

We welcome contributions of any scope. To facilitate a smooth integration into the main codebase, we generally require a few things:

* **Updated Relevant Documentation:** Any pages in `/docs` affected by your contribution should be updated. If new pages are needed, please create them. For instance, if contributing a template, adding documentation for the plugin and updating the [mkdocs configuration file](https://github.com/pushkin-consortium/pushkin/blob/main/mkdocs.yml) is very helpful!
* **Inclusion of a Changeset:** Our project uses [changesets](https://github.com/atlassian/changesets/blob/main/docs/adding-a-changeset.md) to generate new releases and their corresponding release notes. Please include a changeset in your pull request. [This overview](https://github.com/atlassian/changesets/blob/main/docs/adding-a-changeset.md) explains how to add one. Feel free to ask for help with this!

### Contributing to the Documentation

Contributions to documentation, whether small corrections or adding new tutorials, are highly valued. All documentation on our site is in the [`/docs` folder](https://github.com/pushkin-consortium/pushkin/blob/main/docs) of the repository. It's built using [MkDocs](https://www.mkdocs.org/) and themed with [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/). You can edit the markdown files and submit a pull request for changes.

For substantive changes, it's best to build and view the site locally using poetry to test your modifications. After making changes in your development branch/fork, follow [these steps](./documentation.md) to test the site.
