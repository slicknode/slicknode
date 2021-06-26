# Slicknode CLI

The Slicknode CLI is used to create and manage slicknode projects and to manage the deployed
version in the Slicknode Cloud. 

## Installation

The Slicknode CLI can be installed via npm ([Don't have NPM yet?](https://docs.npmjs.com/getting-started/installing-node))
It should be installed as a global module: 

    npm install -g slicknode

## Commands

You can get a list of available commands by simply running slicknode: 

    slicknode

To get help for a specific command, you can run the following: 

    slicknode help <command>

### init

The `init` command initializes a new Slicknode project in the current folder if no other directory is specified. 
Use this to start a project from scratch, it creates all the necessary files and creates the GraphQL API in the
cloud. 

**Example:**
 
```bash
slicknode init my-project
```

**Options:**

| Option | Alias | Required | Default | Description |
| ------------- |------------- | ------------- | ----- | ----- |
| --dir | -d | Optional | Current working directory | The target directory, if other than current |
| --name | -n | Optional | NULL | The name of the project |
| --alias | -a | Optional | Will be generated based on name | The alias of the project, will be part of the GraphQL API URL. Unique across all slicknode projects |


### deploy

see: `slicknode help deploy`

### status

see: `slicknode help status`

### module create

see: `slicknode help module create`

### pull

see: `slicknode help pull`

### login

see: `slicknode help login`

### configure

see: `slicknode help configure`
