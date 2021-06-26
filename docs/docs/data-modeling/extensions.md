title: Type Extensions: Adding Type Extensions in GraphQL
description: How to add type extensions in Slicknode using the GraphQL Schema Definition Language (GraphQL SDL)

# Type extensions

Object types that are part of your GraphQL schema can be extended in any module. This can be used
to add additional functionality to core modules or to extend an object type from a module
that you do not want to change. You might want to choose an extension if the functionality you plan
to add does logically not belong into the module itself or if you don't have access to the code (core
modules). 

## Extending Object Types

When you want to create a module to add functionality to an existing module, you can extend
the type by using the keywords `extend type`. 

Adding a twitter handle to the `User` type in a module with the namespace `Twitter` could look 
something like this: 

```graphql
extend type User {
  # Twitter handle
  Twitter_username: String @unique
}
```

This adds a field of type `String` to the `User` object which is part of the core module. 
Note that the field name must be prepended with the namespace of the module and an underscore
if it is adding fields to a type of another module. This prevents field name collisions.

You cannot add required fields as type extensions as they would potentially break existing
functionality. 

Besides those limitations, the fields of type extensions behave exactly the same way as if they
were defined on the type itself. You can add [scalar fields](./scalar-types.md),
[enum fields](./enum-types.md), [relations](./relations.md) etc.


