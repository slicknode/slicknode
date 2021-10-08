# Settings / Environment Variables

Slicknode provides an easy way to manage credentials and other configuration for your modules.
You can define a settings type via GraphQL SDL for each module with all your configuration values.
Those values are then available in the context object that is passed to your handlers and can be
configured via the console of our project.

## Creating Settings Configuration

To create a settings configuration for your module, simply add a `settings.graphql` file to your module folder
and define a single input type with all the fields of your configuration values.

For example, a configuration for a module that sends emails via the Amazon SES service could look
something like this:

**modules/my-email-module/settings.graphql:**

```graphql
"""
Email configuration
"""
input Settings {
  """
  The SES sender address
  """
  fromAddress: String!

  """
  AWS Access Key
  """
  awsAccessKey: String!

  """
  AWS Secret Key
  """
  awsSecretKey: String! @input(type: PASSWORD)

  """
  Enable or disable email
  """
  enabled: Boolean!
}
```

You can use comments of the GraphQL SDL to provide more information about the available configuration
options. Those descriptions will be displayed in the admin console.

In the code of your slicknode module you just define the structure of your settings, the actual
data can be set in the console for each project and environment individually. This allows you to
set different keys for production and development environments.

You can also share your modules easily, other users can then install the modules in their projects
and provide their own API keys and configuration.

The values are encrypted and stored in a secure location. For sensitive information like secrets
and API keys, you should define the input directive for the field as `@input(type: PASSWORD)`. That way
the values are write-only and will never be exposed via the admin API (for example to populate the form),
which provides an additional layer of security.

## Using Configuration

The configuration values are passed to all your handlers in the context object:

**modules/my-email-module/src/myHandler.js**

```javascript
import * as AWS from 'aws-sdk';

export default async function (payload, context) {
  try {
    // Check if settings are provided
    if (!context.settings.awsAccessKey || !context.settings.awsSecretKey) {
      throw new Error('Module settings are not configured yet.');
    }

    // Create SES service object with the access keys from the settings
    const ses = new AWS.SES({
      apiVersion: '2010-12-01',
      accessKeyId: context.settings.awsAccessKey,
      secretAccessKey: context.settings.awsSecretKey,
    });

    // Send email
    // ...
  } catch (e) {
    // Catch the error and add a meaningful error message, then rethrow error
    throw new Error(`Error sending email: ${e.message}`);
  }
}
```

!!! warning "Important"

    You should always implement proper error handling in your code for the case that the settings
    are not provided. When a project is deployed to the slicknode cloud, the settings are initially
    empty and first have to be configured.
    Even when you define the settings as not nullable (`String!` etc.), it is still possible that the
    code is executed with no values. Throwing a meaningful exception is one option.
