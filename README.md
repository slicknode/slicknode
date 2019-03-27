# [Slicknode](https://slicknode.com) 

[![npm version](https://badge.fury.io/js/slicknode.svg)](https://badge.fury.io/js/slicknode) [![CircleCI](https://circleci.com/gh/slicknode/slicknode.svg?style=shield)](https://circleci.com/gh/slicknode/slicknode)

GraphQL-First application framework and CMS for rapid software development: Serverless, declarative and extensible. 

To lean more, check out the [website](https://slicknode.com).

**Features:**

-   Instant **GraphQL API** on managed cloud infrastructure
-   Use with any API and database
-   Powerful data modeling features with **relations, interfaces, enum types** etc.
-   Automatic **database migrations**
-   **Multi-Stage** development workflow
-   Works with your favorite technologies (React, Angular, Vue, Javascript, iOS, Android etc.)
-   **Headless CMS**
-   Extensible with custom code (Javascript, TypeScript, Flow etc.)

[Sign up](https://console.slicknode.com/register) to create production ready GraphQL Backends in minutes.

To stay up to date on the latest updates and features, follow us on [Twitter](https://twitter.com/SlicknodeHQ)
and [Facebook](https://www.facebook.com/SlicknodeHQ/). 


## Installation

To install the slicknode CLI tool, run the following command 
(you have to have [npm](https://docs.npmjs.com/getting-started/installing-node) installed): 

    npm install -g slicknode


## Help

To get a list of all the available commands: 

    slicknode
    
To get help for a certain command: 

    slicknode help <command>

## Usage
     
#### Usage

     slicknode <command> [options]

#### Commands

     init [name]                 Initialize a new slicknode project
     deploy                      Deploy the current project state to the slicknode servers
     scale                       Scale the cloud infrastructure of the project
     status                      Show information about the current project status (changes, warnings etc.)
     module add [names...]       Adds a module as a dependency to the project
     module create <name>        Creates a new module
     runtime build <output>      Builds the source package for the runtime to be deployed
     pull                        Pull the latest changes from the server
     login                       Login to a slicknode account / change user
     configure                   Update local configuration of the slicknode CLI.
     endpoint                    Return the GraphQL API endpoint
     playground                  Open the GraphiQL API Playground
     console                     Open the Slicknode console
     delete                      Delete the current project deployment from the slicknode servers.
     help <command>              Display help for a specific command

#### Global Options

     -h, --help         Display help                                      
     -V, --version      Display version                                   
     --no-color         Disable colors                                    
     --quiet            Quiet mode - only displays warn and error messages
     -v, --verbose      Verbose mode - will also output debug messages    

