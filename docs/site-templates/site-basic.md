# @pushkin-templates/site-basic

The basic template provides everything you need for building a bare-bones Pushkin site. It does not include authentication, forum, or dashboard features.

## Installing the site-basic template

Make sure you've first created a new directory in which you'll build your Pushkin site. From within your new site directory, run:

```
pushkin i site
```

Select the main Pushkin distribution and `@pushkin-templates/site-basic` from the list of available templates. Then choose which version you want (the latest is typically recommended).

### Testing 

Site basic currently contains three Jest tests related to its frontend React components. These tests encompass the **Header**, **FindingsPage**, and **TeamMembers** pages. Note that if you make changes to these pages, these tests may fail. For information on how to run these tests, please refer to [this](../developers/getting-started-on-development.md/#testing-with-jest)