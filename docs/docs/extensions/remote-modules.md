title: Remote Modules: Merge multiple GraphQL APIs with advanced Schema-Stitching
description: Combine multiple GraphQL APIs into one unified data graph using Slicknode. Extend and combine existing functionality. 


# Remote Modules

If you want to embed an existing or 3rd party GraphQL API into your project, you can create a remote module. 

A remote module merges an entire external GraphQL schema into the Slicknode API which then allows you to query
the external API along with all the data from Slicknode via a unified GraphQL endpoint. 


## Creating a Remote Module With CLI (Recommended)

To create a new remote module with the CLI, use the `slicknode module create` command and pass the
GraphQL API endpoint (`--endpoint`). You can optionally pass HTTP headers.

**Example:**

    slicknode module create my-remote-module --endpoint https://example.com/graphql -h "Authentication: XYZ-API-KEY"

Note that introspection needs to be enabled on the remote server. If the remote server has introspection disabled, 
you can configure the remote module manually. 

This command adds the headers directly to the configuration in the `slicknode.yml` file of the module. If you need
to pass sensitive information, we recommend passing them as configuration variables, so they don't have to be added
to your source code. See the section about configuration below.


## Creating a Remote Module Manually

To create a remote module manually, follow these steps.

1.  Create a new module in your project:
    
        slicknode module create my-remote-module
        
1.  Add the configuration for the remote GraphQL endpoint to the `slicknode.yml` file of
    the module:
    
        module:
          id: "@private/my-remote-module"
          label: "My Remote Module"
          namespace: "MyRemoteModule"
        
          # Remote module configuration
          remote:
            endpoint: "https://example.com/graphql"
            
            # Optionally configure HTTP headers that are sent to the endpoint
            headers:
              # Variables are replaced, for example for API keys (see variables section)
              Authorization: "Bearer ${settings.apiKey}"
    
    
1.  Copy and paste the schema definition of your remote GraphQL API to the `schema.graphql` file of the module.

    You can use also download the schema from the endpoint with the following command, just adjust the endpoint and
    output file path:
    
        npx get-graphql-schema https://example.com/graphql > modules/my-remote-module/schema.graphql

1.  Deploy the changes to the cloud:

        slicknode deploy
        
This merges the external schema into your Slicknode API so you can query all fields of the external 
GraphQL API via Slicknode. Note that all root query and mutation fields will be prefixed with the namespace
of the module to prevent name collisions. 


## Configuration Variables

In a lot of cases you need to pass additional information to the remote GraphQL API in the form of HTTP 
headers or query variables, for example to pass API keys. 

You can use variables in the configuration values that are automatically replaced. 

For example:

```yaml
module:
  # ...
  remote:
    endpoint: https://example.com/graphql?apiKey=${settings.apiKey}
    headers:
      Authorization: "Bearer ${request.headers.authorization}"
      X-Forwarded-For: "${request.ip}"
```

You can use any of the following variables:

```javascript
{
  request: {
    // User IP address
    ip: "123.43.23.43",
    
    // HTTP headers of the original request
    headers: {
      // All HTTP headers that were passed to the API, with all keys in lowercase
      authorization: "123xyz"
    }
  },
  settings: {
    // The configured settings of the module, as defined in settings.graphql
  }
}
```


## Updating a Remote Module

If you are making changes to the remote GraphQL API, you can update the Slicknode server by updating the
`schema.graphql` file accordingly and then redeploying your changes to the cloud. 

This also allows you then to only expose parts of your external GraphQL API via Slicknode. You could for example
omit all mutations to add your external GraphQL API in readonly mode. 


## Limitations

If the external GraphQL server supports subscriptions, they are currently not added to the Slicknode API. 
Only the queries and mutations will be merged. 
