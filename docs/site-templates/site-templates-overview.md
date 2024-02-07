# Overview of site templates

Pushkin uses site templates to set up the core functionality of the user's site &mdash; essentially, everything except the experiments themselves. Site templates are distributed as [npm packages](https://www.npmjs.com/org/pushkin-templates), which get added to the user's site as dependencies when they run `pushkin install site`. The template files are then unzipped into the user's site directory and subsequently manipulated by the CLI.

??? question "How can I work on multiple Pushkin sites simultaneously?"
    When running Pushkin on your local system, you can only work on a single Pushkin site at a time. For most users, this shouldn't present a problem, since additional experiments can always be added to a site; however, if you do need to work on multiple sites simultaneously, using [GitHub Codespaces](../getting-started/installation.md#github-codespaces) will allow you to keep your sites in separate virtual environments.

## Currently available site templates

!!! note 
    The only site template currently available from the main Pushkin distribution is the basic template. The Pushkin development team plans to produce additional templates in the future.

 - [**site-basic:**](site-basic.md) The basic template provides everything you need for building a bare-bones Pushkin site. It does not include authentication, forum, or dashboard features.

## How to install a site template

Create a new directory for your Pushkin site. Navigate into this folder and run:

```
pushkin install site
```

or

```
pushkin i site
```

Follow the CLI's prompts to select the template you want to install. In addition to templates from the main distribution, the CLI also offers you the ability to install templates from:

 - **path:** This option allows you to install a site template from a local path. In this case, the template must still be implemented as a package and will automatically be locally published using [`yalc`](https://github.com/wclr/yalc). Use this option if you are developing a new site template or testing a development version of an existing one.
 - **npm:** The CLI can attempt to install a site template from an arbitrary npm package, although obviously this will fail if the package isn't properly set up as a Pushkin site template. This option might be appropriate for you if you need to distribute a template you've developed (perhaps as private package) but don't wish to add it to the main Pushkin distribution. Generally, however, we encourage contributions of new templates that might be of use to the the broader Pushkin community (see our [contributor guidelines](../developers/contributor-guidelines.md) and [below](#contributing-site-templates) for specific notes on contributing site templates).

## Customizing sites



## Contributing site templates

There is currently no way of automatically packaging up an existing custom site into a new site template. How complicated the process will be of turning your site into a template depends on how much customization you've done (presumably based on the basic template). Complex customizations may present unexpected challenges for creation of a template. We encourage potential template contributors to reach out to the Pushkin team if they encounter any such issues.

In general, we encourage you to follow to the [contributor guidelines](../developers/contributor-guidelines.md). Additionally, if you'd like to contribute a template, please consider how you can make it maximally general by parameterizing as many of your customizations as you can. Try to imagine what variations on your site would be relevant for other researchers and make it easy to implement those variations via changing configuration settings.