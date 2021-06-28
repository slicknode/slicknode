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

!!! warning "Note"

    All images are publicly accessible and cached in a public CDN for optimal performance, so do not
    use this module to store sensitive information. If you want to protect your images, you can use the [file module](./files.md)
    instead or store references to your images in Slicknode to your own system that you can customize
    to meet your requirements.

### Upload

Uploading an image to Slicknode is a two step process:

1.  **Create a reference object:** Create an `Image` node via the `createImage` mutation to create a reference in your system that you can use to attach the image to other nodes in your application and to obtain a file upload URL.
1.  **Upload the image file:** Use the file upload URL that was generated in the previous step to upload the actual image file.

**Example:**

```javascript
// Import slicknode client or another GraphQL client
import client from './client';

async function uploadImage(file) {
  const query = `mutation CreateImage(
    # Filename of the image on the server
    $fileName: String!
    # The content length of the image file (max 20mb)
    $contentLength: Int!
  ) {
    createImage(input: { fileName: $fileName, contentLength: $contentLength }) {
      node {
        # The ID of the Image node that we need to attach the image to other nodes
        id
        url(height: 100, width: 100)
      }
      # Temporary upload url to upload the actual image
      uploadUrl
    }
  }`;
  const variables = {
    fileName: file.name,
    contenLength: file.size,
  };
  const { data, errors } = await client.fetch(query, variables);
  if (!data || !data.createImage || !data.createImage.node || !data.createImage.uploadUrl) {
    throw new Error('Image upload failed');
  }

  // Upload the image to the upload URL
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(file.size),
    },
    body: file,
  });
  if (response.status !== 200) {
    throw new Error('Error sending file to the servers');
  }

  // Return the image reference node to use ID, URL etc.
  return data.createImage.node;
}

// Get the file object, for example from
const file = document.getElementById('#file-input').files[0];
uploadImage(file)
  .then((image) => {
    console.log(`Image upload successful. ID: ${image.id} URL: ${image.url}');
  })
  .catch((err) => {
    console.error('Image upload failed');
  });
```

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
