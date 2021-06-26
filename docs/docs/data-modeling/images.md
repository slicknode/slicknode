title: Images: Adding Images to Slicknode GraphQL APIs
description: How to add images to your GraphQL APIs using Slicknode and the GraphQL schema definition language. 

# Images

The Slicknode Cloud comes with a module that provides extensive functionality to store, process and deliver images. 
Images are resized and cropped on the fly and are automatically delivered via a global CDN. Resized images
are cached at numerous edge locations across the globe for minimum latency. 


## Installation

The image module can be installed as any module in slicknode. In your project folder run: 

```bash
slicknode module add image
```

This will add the module to your `slicknode.yml` file of the project. Afterwards deploy the changes to the cloud: 

```bash
slicknode deploy
```


## Usage

Once the image module is installed and deployed, the `Image` type is available in your GraphQL schema and
can be used as any other type for fields in your data structure. 


### Definition

An article in a Blog module with a main image could look something like this: 

```graphql
type Blog_Article implements Node {
  id: ID!
  image: Image
  title: String!
  text: String!
}
```

This adds an optional Image to the `Blog_Article` type. 

`Image` objects are intended to be attached to other types. If you want to store additional information 
like description, copyright, alt-text etc. you could create a media library module that has an image field:

```graphql
type Media_Image implements Node {
  id: ID!
  image: Image!
  createdBy: User
  description: String
  alt: String
  copyright: String
  # ... etc.
}
``` 

All images are publicly accessible and cached in a public CDN for performance reasons, so do not 
use this module to store sensitive information. If you want to protect your images, you can use the [file module](./files.md)
instead or store references to your images in Slicknode to your own system that you can customize
to meet your requirements. 


### Upload

The easiest way to upload images to the cloud is to use the 
[`slicknode-client`](https://www.npmjs.com/package/slicknode-client) which
has support for file upload and integrates seamlessly with authorization etc. 

```javascript
import Client from 'slicknode-client';
const client = new Client({
  endpoint: '<my-slicknode-endpoint>'
});

// Get the reference to your image file from your input element, dropzone component etc.
// For simplicity, we are just assuming we have a DOM element with a selected file. Add your validation logic 
// depending on what uploader you are using etc.
const file = document.getElementById('#file-input').files[0];

const variables = {};
const operationName = null;
const query = `mutation UploadImage {
  # We can specify the multipart form field name, in this example "myImage". 
  # Default is "file" if none specified
  uploadImage(input: {fieldName: "myImage"}) {
    node {
      id
      width
      height
      
      # Create thumbnail URL with 300x200 pixels and smart cropping (advanced image analysis using focal points)
      url(width:300, height:200, resizeMethod: SMART)
      
    }
  }
}`;

// Execute upload mutation, passing the file handle
client.fetch(query, variables, operationName, {
  myImage: file
})
  .then(({data}) => {
    console.log('Success, thumbnail URL: ', data.uploadImage.node.url);
    console.log('ID to use when adding images to other types: ', data.uploadImage.node.id)
  })
  .catch(err => {
    console.log('Error upload image: ' + err.message);
  });

```

#### Manual Upload

If you are not using the slicknode client, you can also send a raw HTTP request to your Slicknode endpoint. 
You have to send a multipart formdata POST request to the endpoint with the following fields: 

| Name | Type | Required | Description |
|------|------|--------- | ------------|
| `query` | `String` | required | The GraphQL query with the `uploadImage` mutation |
| `variables` | `String` | optional | The JSON encoded object of GraphQL query variables, if any |
| `operationName` | `String` | optional | The operationName if your GraphQL query string contains multiple queries |
| `file` | `Binary` | required | The image file. The name can also be something else but has to match the `fieldName` as provided in the mutation input arguments in that case |

You have to provide the GraphQL `query`, `variables`, `operationName` and the `file` as a multipart form data
request 


### Attaching Images to Nodes

The image node is always created without being attached to another node first. This ensures that you can 
for example display a resized preview image in a signup form before the actual `User` node exists.

In the upload mutation you should query the `id` of the created image. This `id` can then be used
as the input value in other mutations to attach the created image to other nodes. 

You can attach one image to any number of nodes. This way you can reuse images and reduce the amount of
required storage for your application. 

 
## Querying

You can query the properties of images like for any other object type. The only difference is an additional
`url` field which lets you retrieve URLs for the image in different resolutions, cropped, flipped etc.

You can use aliases to load image URLs to images in different resolutions in one request.  
For example to query for a profile image of the current user: 

```graphql
{
  viewer {
    user {
      image {
        id # The global ID
        width # Original image width
        height # Original image height
        size # Storage space used
        
        # Get the original URL by not providing any dimensions
        original: url
        
        # Crop the image to fit exactly into the specified dimensions
        # Uses advanced image analysis to find main focal points in the image
        # Avoids for example chopping off heads etc.
        smartCrop: url(width: 300, height: 200, resizeMethod: SMART)
        
        # Crop the image to fit exactly into 300x200 pixel window
        croppedImage: url(width: 300, height: 200, resizeMethod: CROP)
        
        # Fit within boundary box, no cropping
        # Resuling height or width of image might be smaller than specified in input arguments
        fit: url(width: 300, height: 200, resizeMethod: FIT)
        
        # Resize to match the width, not cropped
        resizedToWidth: url(width: 300)
        
        # Use negative dimensions to flip image
        flippedHorizontally: url(width: -300)
        flippedVertically: url(height: -200)
        flipped: url(width: -300, height: -200)
      }
    }
  }
}
```


## Limits

The maximum allowed image size is 10MB. 
