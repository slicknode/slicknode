# Interfaces

Interfaces can be used in GraphQL to predefine a set of fields and their types that can then be 
implemented in other object types. When an object types implements an interface, it has 
to implement all the fields of that interface, otherwise an error is raised during the schema
validation phase. 

If you have multiple variations of an object type in your application, you can use an interface
to define the common fields. For example, if you are building a web application in which several types
should have meta data attached for SEO purposes, you could create a `CMS_PageInterface` as follows: 

```graphql
interface CMS_PageInterface {
    # The following fields will be required by all types that implement the interface:
    title: String!
    description: String!
    slug: String! @unique
}

type CMS_Article implements CMS_PageInterface & Node {
    # Required field from Node interface
    id: ID!
    
    # Fields from CMS_PageInterface
    title: String!
    description: String!
    slug: String! @unique
    
    # Custom fields that are only part of CMS_Article
    text: String
    category: CMS_Category
}

type CMS_Category implements CMS_PageInterface & Node {
    # Required field from Node interface
    id: ID!
    
    # Fields from CMS_PageInterface
    title: String!
    description: String!
    slug: String! @unique
}
```

Both the `CMS_Article` type and the `CMS_Category` implement the `CMS_PageInterface` which guarantees
that they implement all the fields that are part of the interface. 
If a field is missing or has a wrong type, an error will be raised during the validation phase of the schema. 

You can reuse any interface that is part of your application, also across multiple modules. 

A type can implement multiple interfaces which would have to be separated by `&`. The above example
implements the `CMS_PageInterface` and the [`Node`](./node.md) interfaces. 

## Builtin Interfaces

Slicknode comes with several builtin interfaces that can be used to enable special functionality: 

-   [`Node`](./node.md): Types that implement the [`Node`](./node.md) interface are persisted to a data store and can also be
    refetched by its ID via the root query type. 
-   [`TimeStampedInterface`](./time-stamped-interface.md): Interface to automatically add the current timestamp on update and creation
