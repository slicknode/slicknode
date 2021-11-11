title: Create Slicknode Extension with Custom Code
description: Extend your Slicknode GraphQL API with custom extensions. Write Javascript or TypeScript modules, deploy to your own cloud.

# Create Extension

The runtime environment for your extensions can be enabled and configured for each
[module](../data-modeling/modules.md) individually.
That way you can split a complex application into small pieces and manage their dependencies independently.
You can also keep the custom logic completely separate from the data model to separate the concerns of your
application logic. For example, when the auth module provides the `User` type, you could have a newsletter subscribe
module that is only responsible for adding the email address of each newly created user to the newsletter service.

## 1. Configure Runtime

To enable the runtime environment for a module, simply add the following configuration section to the `slicknode.yml`
file of your module (**not** the slicknode.yml file in the root folder of your project).

**modules/my-module-name/slicknode.yml:**

```yaml
runtime:
  engine: nodejs@8
```

This enables the Nodejs runtime for the module with version 8. _(This is the only supported runtime and version at the moment)_

Afterwards you can start adding javascript files to your module folder which can then be referenced in the
configuration file.

## 2. Setup package.json

Each module with an enabled runtime environment should have its own `package.json`. This just works like a `package.json`
file in any other Nodejs application. You can add dependencies, configure build scripts etc.

To setup the `package.json` file for your module, navigate to the module folder and run `npm init`:

```bash
# Navigate to module folder
cd ./modules/my-module-name
npm init
```

Afterwards you can install npm modules in that folder like you would with an ordinary Nodejs application.

!!! warning "Important"

    It is important to install dependencies that are not used for the execution of regular code as
    dev dependencies (like test runners, build tools etc.):

    npm install **--save-dev** my-npm-dependency

    Otherwise the startup time of runtime containers will be negatively impacted.

## 3. Add .npmignore

It is important to keep the size of the module extensions as small as possible to get the best performance
for the following operations:

- **Deployment:** Whenever you run `slicknode deploy` or `slicknode status` to deploy a new version to the slicknode
  servers, all files need to be uploaded to detect changes. _(This does not include files that are included
  as dependencies in your `package.json` though.)_
- **Scaling:** Every time slicknode creates a container for your runtime environment, for example to scale up
  capacity, it initially needs to load all source files into the container. The less files you have in your
  module, the faster the container will be ready to accept load.

You should add an `.npmignore` file to each module to exclude unnecessary files from the runtime environment.
This could look something like this:

```
# Exclude all .graphql files (we don't need them in the runtime ususally)
*.graphql

# Exclude all tests files
*/**/__tests__/**/*

# etc.
```

You can check if you have unnecessary files in your bundle by running `npm pack` in your module folder and then see if
you have anything in the resulting Zip-file that is not needed for execution.

## 4. Add build script (optional)

If you want to add a build process to your module, for example to compile [typescript](https://www.typescriptlang.org/) into executable
javascript, you can add a build script to your `package.json` in the `prepare` script.

For example, to compile typescript:

```json
{
  "scripts": {
    "prepare": "tsc"
  }
}
```

When you are using a build script, make sure to reference the compiled files instead of the source files in your configurations:

Instead of

```yaml
myhandler: src/hooks/my-handler.js
```

use

```yaml
myhandler: dist/hooks/my-handler.js
```

In this case, the source folder should also be added to the [`.npmignore`](#3-add-npmignore) file since the source files
are not needed for execution.

## 5. Local Development

To start the runtime on your local machine, execute the following command in the project root dir:

    slicknode runtime start --watch

This starts a HTTP server on port 5100 (can be changed with the `--port` option).
The flag `--watch` ensures that all code changes are active immediately without restarting the server.
This flag should only be used during development.

To connect the runtime with your Slicknode GraphQL server, it needs to be accessible from the internet.
If you are running the runtime on your local machine, you can use [ngrok](https://ngrok.com/)
to get a public URL of your local server.

Open up the console of your project (`slicknode console`) and set the
runtime endpoint in the settings tab to the public URL.

## 6. Build

To combine all the extensions and modules into a build that can be deployed, run the `slicknode runtime build`
command and specify the output directory of the build files:

    slicknode runtime build ./build

This will run all build scripts of your modules and copy the compiled files into the folder
`./build` inside your project. It is recommended to add this folder to your `.gitignore` file.

## 7. Deploy

The runtime build folder can be deployed as a serverless Google Cloud Function (more deployment targets coming soon...).
You should deploy the function to the same region where your project is deployed to minimize the latencies.

For example:

```bash
gcloud functions deploy my-project-runtime \
  --runtime nodejs8 \
  --trigger-http \
  --source ./build \
  --region us-east1 \
  --set-env-vars SLICKNODE_SECRET=chooseafancysecretkey
```

This deploys the runtime as a google cloud function that can be triggered via HTTPS. Note the URL
of the cloud function and the secret key for the next step.

## 8. Update Project Settings

Open up the console of your project (`slicknode console`) and in the settings tab update the
runtime endpoint and your secret.

Save the changes to complete your runtime setup.

**Info:** For updates you only have to create a new build and redeploy the cloud function (Steps 6 and 7).
