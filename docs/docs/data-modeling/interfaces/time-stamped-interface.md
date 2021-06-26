# TimeStampedInterface

The slicknode core module provides a `TimeStampedInterface` which automatically adds the current time
to a `createdAt` and `lastUpdatedAt` field whenever a node is saved. 

## Definition

```graphql
"""Interface for objects that automatically get timestamped values"""
interface TimeStampedInterface {
  """The time when the object was first added"""
  createdAt: DateTime!

  """The time when the object was last updated"""
  lastUpdatedAt: DateTime
}
```

## Usage

To add timestamped fields to a node that are automatically updated, just implement the `TimeStampedInterface`
for the node: 

```graphql
type Blog_Article implements Node & TimeStampedInteface {
  id: ID!
  
  createdAt: DateTime!
  lastUpdatedAt: DateTime
}
```

Whenever a new node of type `Blog_Article` is created, the field `createdAt` will automatically have the
value of the current timestamp. When the node is initially created, `lastUpdatedAt` will be `null`. 

Whenever the node is updated, the field `lastUpdatedAt` will have the current timestamp. Note that these
values cannot be overwritten. If you need to overwrite those values occasionally, you can create your own 
interface and combine that with [extensions](../../extensions) in which you set the values
manually after a certain logic. 
