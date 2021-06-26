title: GraphQL Tutorial: Data Modeling
description: Data modeling using the GraphQL SDL: Type definitions, interfaces, directives and relations. 

# Data Modeling

The schema is the basis for your GraphQL API. You define the schema of your data
model using the GraphQL Schema Definition Language (SDL) and Slicknode then uses the data
model to add the CRUD mutations, filters, sorting, pagination, etc. to your API.

## Instructions

We will start with a simple version of the blog schema that we extend throughout the tutorial. 
To determine the schema for your application, we just have to convert [the requirements](./description.md)
into a GraphQL schema. 

The schema of our blog is part of the blog module and should therefore be added
to the `schema.graphql` file in that module folder. Open the file in your favorite 
IDE and add the following:

**modules/blog/schema.graphql:**

```graphql
type Blog_Article implements Node & TimeStampedInterface {
  id: ID!
  title: String!
  slug: String! @unique
  text: String! @input(type: MARKDOWN)
  author: User
  category: Blog_Category!
  
  createdAt: DateTime!
  lastUpdatedAt: DateTime
}

type Blog_Category implements Node {
  id: ID!
  name: String!
  slug: String! @unique
}
```
### Validation

Check the validity of your code by running the status command and fix any errors it might display: 

    slicknode status

This validates the schema, checks for syntax errors, naming conventions and consistency. In case it does not detect
any errors in your schema definition, it will compare the changes to the schema that is currently deployed
to the cloud and will output a list of all the pending changes. 

### Deployment

Deploy the schema changes to the Slicknode Cloud by running: 

    slicknode deploy

This will show you a preview of the pending changes that will be applied after confirmation. 

Now your Slicknode GraphQL API has blog functionality and is ready to be used. 

## Explanations

If we look at this schema, we can see how types are defined with the GraphQL SDL: 

### Naming convention

It always starts with the keyword `type` followed by the typename. Note that there is always the
namespace of the module prepended to the type name (`Blog_`). This is a Slicknode convention to avoid
name collisions of types from different modules. The last part of the types should always use CamelCase.
There can be any number of type definitions in one schema file. 

### Node Interface

The definition `implements Node` means that the type implements the `Node` interface. Interfaces
are a special type in GraphQL that let you define a set of fields. 
([Learn more about interfaces](../data-modeling/interfaces)) 
Every type that implements the
interface has to implement all the fields of that interface. The `Node` interface
is defined by the [Relay](https://facebook.github.io/relay/) standard and has just the field `id` with
the scalar type `ID!`. The exclamation mark behind type names indicates that this field
value is required and cannot be NULL. Slicknode uses the `Node` interface to determine 
for which types it should generate database tables and CRUD mutations / fields. So for most types
you would implement the `Node` interface and add the corresponding field `id: ID!`. 

### Input Directive

Slicknode has a special `@input` directive which allows you to configure the appearance of the
input element in the data browser. By default, fields of type `String` have a simple text
input element. To change this to a markdown editor, you can configure the input element 
by adding the `input` directive after the field: 

```graphql
type Blog_Article implements Node & TimeStampedInterface {
  text: String! @input(type: MARKDOWN)
}
```

There are several input elements available, check [the documentation](../data-modeling/scalar-types/#string) for the type
to see which input elements are available.

### TimeStampedInterface

The `TimeStampedInterface` is an interface that is part of the `core` module of Slicknode. 
It automatically adds the current timestamp to the field `createdAt` whenever a new node is created and
updates the field `lastUpdatedAt` on update. Since we want to keep track of the dates when an article is
created and updated, we add the interface along with the fields:

```graphql
type Blog_Article implements Node & TimeStampedInterface {
  # ...
  createdAt: DateTime!
  lastUpdatedAt: DateTime
}
```

The field `createdAt` is required and cannot be null and will automatically be set to the current timestamp when 
the article is created.
The field `lastUpdatedAt` is optional and its value is `null` when an article is initially created. When the article
is updated, the value of that field is updated as well. 

When you add multiple interfaces to a type, the interface names have to be separated by `&`.  

To learn more about the `TimeStampedInterface`, [click here](../data-modeling/interfaces/time-stamped-interface.md).


### String fields

The fields `slug`, `title` and `text` are defined with the data type `String!`. We add the exclamation
mark after the type name to make sure that these values cannot be NULL. 

For the field `slug` we also add a `@unique` directive. Directives can be added to elements in your
GraphQL documents to provide additional instructions for the processing GraphQL engine. Slicknode
supports a variety of directives that we will get to know in the tutorial. The `@unique` directive
ensures that the value is unique across all stored nodes of that type. 
We will use the `slug` to build our unique SEO friendly URLs and need to have a unique identifier. 


### Author relation

The field `author` is of type `User`, which is a special type that is provided by the `auth` core 
module. It is used for authentication, authorization and already has builtin functionality to store
encrypted password hashes etc.

This is our first relation. One user can write multiple articles, but each article can only have 
one author (One-to-many relationship). This creates a column
in the database that references the related user object with a foreign key constraint, which ensures
that you can only add existing users as an author and not arbitrary user IDs. 
The type `User` does not have an exclamation mark at the end and is therefore optional. 
You could also make this a required field and define that every article should have an author. 
However, when you create your data model, you should always plan for the full lifecycle of all related
objects: What happens when you delete a user object that has published articles? In that case this would
violate the foreign key constraint. Slicknode enforces foreign key constraints at the database level, it
would automatically delete all related objects if this were a required field to keep the data 
consistent. (Cascading delete)

This is why we define this field as not required: If we delete a user from the database, we can still keep 
the articles of that user. The field `author` would just be set to NULL and we can display in our frontend
something like "Deleted User".

### Category

For the category, we define a separate type that is also persisted to the database (`implements Node`) 
so that we can create relations to the articles. The relation between the `Blog_Category` and
the `Blog_Article` can be created the same way as for the `author` field. In this case, we define
the field `category` with a type of `Blog_Category!`. This means, that the category can never be NULL. 
If we delete a category, it would also automatically delete all articles in that category. Let's assume
that this is the business logic we want for our blog. 

