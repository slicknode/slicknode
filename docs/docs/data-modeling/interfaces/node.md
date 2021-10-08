# Node Interface

The `Node` interface is a convention first introduced by [Relay](https://facebook.github.io/relay/), the GraphQL client
that is used and developed by Facebook. It ensures that all objects have a unique identifier across the application
and that they can be refetched individually via a standardized field on the root query type. 

Slicknode also uses the `Node` interface to determine which types should be persisted to the database. When a type
implements the `Node` interface, Slicknode by default automatically creates the corresponding database table for the type
and the fields. 

## Definition

The `Node` interface has the following definition: 

```graphql
interface Node {
    id: ID!
}
```

## Description

The Node interface only has one field `id` of type `ID!`. The id of the Node is globally unique, 
there cannot be two nodes with the same ID in your GraphQL API. 

### Usage

To enable the storage for a type, it needs to implement the `Node` interface. 

```graphql
type Blog_Article implements Node {
    id: ID!
    title: String
}
```

This would create a type `Blog_Article` that is persisted to the database along with the fields
for the CRUD API. 

### Querying

All objects of types that implement the `Node` interface can be refetched via the `node` field on the
root query type:

```graphql
query {
    node(id: "theglobalnodeid") {
        id
        
        # Use fragments of the loaded type to load specific fields
        ...on Blog_Article {
            title
        }
    }
}
```

This can be used to refresh any persisted object in the UI. 
