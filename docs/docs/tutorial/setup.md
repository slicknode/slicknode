title: GraphQL Tutorial: Project setup with Slicknode
description: Initial project setup of the development workspace. 

# Setup

To get started, create a Slicknode account (if you haven't already) so that you can deploy 
your application to the cloud. [Sign up for free](https://www.slicknode.com)


## Instructions

Install the Slicknode CLI to manage your projects on your computer. 

The Slicknode CLI is available via NPM and should be installed globally: 

    npm install -g slicknode@latest

Afterwards, test the installation by running the following command in your terminal: 

    slicknode --version

This should print the currently installed version number of slicknode (for example `0.1.2`). *This is also helpful for
filing bug reports on github*


### Exploring the Slicknode CLI

The Slicknode CLI commands can be explored interactively. 

To list all available commands with descriptions, run this command: 

    slicknode

To get help and available options for a specific command, use the following: 

    slicknode help <commandname>

Here you would replace `<commandname>` with the command you want to inspect.
For example to get available options and arguments for the `init` command, we can use this: 

    slicknode help init

This works for every command and is automatically updated whenever new functionality is added
to Slicknode. 


### Project Setup

With the Slicknode CLI installed you can create a new project on your local machine. 
Navigate to the folder in which you want to create the new project, then initialize it: 

    slicknode init tutorial-project

This might ask you for your login credentials that you provided when you created your Slicknode
account in the first step. 

The command creates a new folder with the name `my-project` and adds the essential files for a Slicknode
project. Afterwards change into the newly created project directory to be able to run the
next commands:

    cd ./tutorial-project
    
!!! info

    For all the project specific commands that we are using in the next steps, slicknode by 
    default assumes to apply the command to the project in the current directory. 

## Explanations

If you open the project folder in your favorite IDE, you should see the following files:

    .slicknode/
    slicknode.yml
    .slicknoderc

### slicknode.yml

The `slicknode.yml` in the root directory of your project serves as the entry point to your
application. This is the place where the dependencies (modules) of your project are defined. 
This includes dependencies to core modules as well as dependencies to custom modules that we
are about to create for your blog. It is advised to not edit this file on the root level manually:

Removing a module tells Slicknode for example to remove a module entirely along with all the
database tables and data. This cannot be reverted in a lot of cases if it is deployed to the cloud.

The content of a fresh `slicknode.yml` file could look something like this: 

```yaml
dependencies:
  auth: latest
  core: latest
  relay: latest
```

### .slicknoderc

The `.slicknoderc` file serves as a store for all the active deployments of the project in the
Slicknode Cloud. It is a JSON object where the keys are the name of the environment (for example
`prod`, `develop`, `stage`) and the configuration itself holds information about the project,
like the ID, the current version etc.

This file should not be edited manually. You should always use the Slicknode CLI commands
to create or delete new environments. 

Whenever you create a new project, Slicknode automatically creates a `default` environment. 
This environment is used whenever you execute a command without the `--env` option. Therefore
it is recommended to use the `default` environment as your development branch, so that you
don't accidentally deploy unwanted changes to production. 

You can later always create more environments for staging, production etc. For now, we just 
use the default environment. 


### .slicknode Folder

The folder `.slicknode` stores cached files to optimize the performance and should not be 
edited manually. This folder can also be safely added to your `.gitignore` since it only
holds data that can be derived from the project configuration. 
