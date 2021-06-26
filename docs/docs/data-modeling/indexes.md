title: Indexes / Unique Constraints: Adding Database Indexes to Slicknode GraphQL APIs
description: How to add indexes and unique constraints to your GraphQL APIs using Slicknode and the GraphQL schema definition language. 

# Indexes

Indexes allow you to optimize your database and significantly improve the performance of your database queries,
especially as your dataset grows. With Slicknode you can add a variety of index types to your database
by simply adding directives to your schema.

You want to add indexes to your Slicknode models whenever they would also make sense in a traditional database. 
Keep in mind that this improves the performance for read operations. Write operations will be slower when
the index has to be updated.


## Single Column Indexes

If you want to add an index to a single column on one of your types, add the `@index` directive to the field
of the node. 

For example:

```graphql
type Staff_Employee implements Node {
  id: ID!
  position: String! @index
}
```

This will create an index on the `position` column in the database and speed up queries where you filter the employees
by their position. 

Fields to other types that implement the `Node` interface do not need an explicit index as this is already added by Slicknode automatically.


## Single Column Unique Indexes

If you want to add an index to a single column and also ensure that a single value can only occur once for that
type, add the `@unique` directive to the field.

For example:

```graphql
type Library_Book implements Node {
  id: ID!
  title: String
  isbn: String @unique
}
```

This will add a unique index to the field `isbn` and also ensure at the database level that you cannot store
two books with the same ID. 

This also automatically adds a root field to the `Query` object to get the `Library_Book` by its isbn:

```graphql
extend type Query {
  Library_getBookByIsbn(isbn: String!): Library_Book
}
```


## Composite Indexes

To add an index that includes multiple columns, add the `@index` directive to the object type definition
and specify the fields that should be included in the index. 

For example:

```graphql
type Blog_Post implements Node
@index(fields: ["author", "category"])
{
  id: ID!
  title: String
  text: String
  author: User!
  category: User!
}
```

This would add an index on the two columns `author` and `category`. The performance for read queries where
you want to return all `Blog_Post` nodes for a specific author **and** in a specific category would be improved,
especially on a large dataset. 

## Composite Unique Indexes

When you want to ensure that a combination of multiple columns is unique within a type, you can 
create multi-column, or composite, unique indexes. Add the `@index` directive to the type, specify
the fields and pass `unique: true` as an argument.

For Example, if you create a multi-user issue tracker application and want to make sure that the project
name is unique for each user account, the schema could look something like this:

```graphql
type IssueTracker_Project implements Node 
@index(fields: ["name", "user"], unique: true)
{
  id: ID!
  name: String!
  user: User!
}
```

This would ensure that each user cannot use the same name twice for a project, but two different
users can each have a project with that name.

### Many-to-many relation

When you create a [many-to-many relation](./relations.md#many-to-many-relation), most of the time
you want to make sure that the two nodes can only be connected once. To enforce this
at the database level, add the composite unique index with the `@index` directive.

```graphql
type Group_Membership implements Node 
@index(fields: ["group", "user"], unique: true)
{
  id: ID!
  group: Group_Group!
  user: User!
}

type Group_Group implements Node {
  id: ID!
  name: String
}
```

This ensures that each user can only be assigned to each group once. 
