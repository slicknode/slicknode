title: GraphQL Tutorial: Install Builtin Modules
description: How to install builtin modules in your Slicknode project

# Modules

Modules are the top level building blocks of a Slicknode project. They contain reusable pieces of functionality that you can flexibly combine and extend in your projects. You can add built-in or existing modules to your project by just adding them as a dependency, or you can create your own modules where you organize your custom types and business logic.

To learn more about modules, [click here](../data-modeling/modules.md)

## Install Modules

Slicknode provides built-in modules with the most common functionality.

Let's install a module for content management, versioning and one for image management. In your terminal, install the `content` and `image` modules:

```bash
slicknode module add image content
```

This will add the modules to the dependencies in your `slicknode.yml` file. Your `slicknode.yml` file should look something like this:

```yaml
dependencies:
  auth: latest
  core: latest
  relay: latest
  image: latest
  content: latest
```

You now have image support and can create types that automatically have functionality for localiztion, versioning and publishing workflows. You'll get to that in the next step when you create your custom types.
