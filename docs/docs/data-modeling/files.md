title: File Uploads: Managing File Uploads in GraphQL
description: How to add file uploads to Slicknode GraphQL APIs. 

# Files

The Slicknode Cloud comes with a highly scalable and secure module to store large files. The file module
integrates fully with the [authorization](../auth) functionality of Slicknode which lets you define
the users that have access to uploaded files. 

Files can also be public and be served via a global CDN for minimum latency. 

## Installation

The file module can be installed as any module in slicknode. In your project folder run: 

```bash
slicknode module add file
```

This will add the module to your `slicknode.yml` file of the project. Afterwards deploy the changes to the cloud: 

```bash
slicknode deploy
```

## Usage

Once the file module is installed and deployed, the `File` type is available in your GraphQL schema and
can be used as any other type for fields in your data structure. 


### Definition

Let's say we have a comment module in a blog application where we want to allow the users to attach files to comments.
Just define the field in your `schema.graphql` file:

```graphql
type Blog_Comment implements Node {
  id: ID!
  text: String!
  attachment: File
}
```

File objects are supposed to be attached to other nodes. The File object itself is just a reference to the
actual file in the file storage. It is used to generate the URL to the file and stores meta data like the file
size, Mime-Type etc. of the object.


### Upload

The file upload with the file module is a two step process: 

1.  Create a `File` node in the system with the `createFile` mutation. This saves a reference to the file in the 
    database and returns a temporary `uploadUrl`. At this point the actual file is not yet uploaded. 
1.  Use the `uploadUrl` that was obtained in the previous step to upload the file with a `PUT` request. This 
    uploads the file directly to the storage backend to reduce the resource usage on your API server. 


**Example:**

```javascript
import Client from 'slicknode-client';
import 'isomorphic-fetch';

const client = new Client({
  endpoint: '<my-slicknode-endpoint>'
});

// ... authenticate user

const mutation = `mutation CreateFile {
  createFile(input: {
    # The file is publicly accessible
    isPublic: true, 
    
    # The filename as it will be stored on the server
    name: "filename.pdf", 
    
    # The mimetype of the file, also set in the Content-Type header
    mimeType: "application/pdf"
  }) {
    # This the temporary URL where the file can be uploaded
    uploadUrl
    file {
      # The URL to the file, once it is uploaded
      url
      
      # Temporary token needed to attach the file to other nodes
      token
    }
  }
}`;

// Run mutation
client.fetch(mutation)
  .then(({data}) => {
    const payload = data.createFile;
    
    // Now we can upload the file
    console.log('Success, upload file to: ', payload.uploadUrl);
    
    // Temporary token that is needed to attach the file to other nodes
    const token = payload.file.token;
    
    // Get the reference to your file from your input element, dropzone component etc.
    // For simplicity, we are just assuming we have a DOM element with a selected file. 
    const file = document.getElementById('#file-input').files[0];
    // Run file upload
    fetch(payload.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': file.length,
        'Content-Type': file.type
      },
      body: file
    })
      .then(() => {
        console.log('Fileupload successful');
      })
      .catch(err => {
        console.log(`Fileupload to data store failed: ${err.message}`);
      });
  })
  .catch(err => {
    console.log('Error creating file: ' + err.message);
  });
```


### Attaching Files to Nodes

To attach files to other nodes, you have to pass the temporary `token` of a file to one of the mutations. The
token can be obtained directly when the file is first created with the `createFile` mutation (see example above),
or you can also use a token of a `File` that is already stored in your system. This lets you reuse files
for multiple nodes, for example if you want to build a media library and reuse the same asset with multiple
nodes. 

**Example:**

For the schema as defined under [definition](#definition) the mutation to create a new comment with
an attachment that was previously uploaded as described in the [upload section](#upload) could look
something like this:

```graphql
mutation CreateComment {
  Blog_createComment(input: {
    text: "Test comment with attachment",
    
    # Pass the file token of the file that shuold be attached to the comment
    attachment: "<file-token>"
  }) {
    node {
      id
      attachment {
        # URL to the file
        url
      }
    }
  }
}
```
