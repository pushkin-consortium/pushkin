# Contributor Guidelines

We encourage contributions of all kinds, including changes to the core codebase, the development of new sites and templates, and improvements to the documentation. 

The project is managed entirely through the [GitHub repository](https://github.com/pushkin-consortium/pushkin). There you can:

* Use [discussions](https://github.com/pushkin-consortium/pushkin/discussions) to propose ideas for development and seek feedback on contributions, such as a new plugin.
* Use [issues](https://github.com/pushkin-consortium/pushkin/issues) to identify anything with an actionable next step. For example, a page in the documentation that needs to be fixed, a bug in the code, or a specific feature that has a clear scope.
* Submit a [pull request](https://github.com/pushkin-consortium/pushkin/pulls) with modifications to the codebase. Pull requests will be reviewed by one or more members of the core team.

## Guidelines for contibuting

### Contributing to the codebase

We welcome contributions of any scope. Before we can merge changes into the main codebase, we generally require a few things. Note that you are welcome to contribute code without these things in place, but it will help us get to your contribution faster if you take care of whatever components you are comfortable doing.


* **Relevant documentation must be updated.** Any pages in `/docs` that are affected by the contribution should be updated, and if new pages are needed they should be created. For example, if you are contributing a template then adding documentation for the plugin and updating the as well as the [mkdocs configuration file](https://github.com/pushkin-consortium/pushkin/blob/main/mkdocs.yml) is very helpful!

* **A changeset must be included in the pull request**. We use [changesets](https://github.com/atlassian/changesets/blob/main/docs/adding-a-changeset.md) to generate new releases and their corresponding release notes. [This is a good overview of changesets](https://github.com/atlassian/changesets/blob/main/docs/adding-a-changeset.md) that explains how to add one to your pull request. Feel free to ask for help with this!


### Contributing to the documentation

We are very appreciative of both small and large contributions to the documentation, from fixing a typo to adding a whole new tutorial. All of the documentation that appears on this site is contained in the [`/docs` folder](https://github.com/pushkin-consortium/pushkin/main/docs) of the repository. The documentation is built using [MkDocs](https://www.mkdocs.org/) and themed using [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/). You can edit any of the markdown files and submit a pull request to modify documentation.

For anything substantive, you'll want to build and view the site locally using poetry to test your changes. After making changes in your development branch/fork, follow [these](./documentation.md) steps to test the site.



