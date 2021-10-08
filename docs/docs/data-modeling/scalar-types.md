# Scalar Types

Scalar types are the primitive data types that can be used to define the schema of the GraphQL
application. Slicknode supports a variety of scalar types: 

## String

The `String` type is for storing text values. 

**Example usage:** 

```graphql
type NewsFeed_Article implements Node {
  id: ID!
  text: String
}
```

**Configure Input Element:**

There are multiple input elements available in the Slicknode console. By default, the console
interface creates a single line input element of type text for all `String` fields. 

If you need multi line input or want to use [markdown](https://daringfireball.net/projects/markdown/) etc. you can customize the input widget
by adding the `@input` directive to the field:

```graphql
type NewsFeed_Article implements Node {
  id: ID!
  
  # Use a Markdown editor
  text: String @input(type: MARKDOWN)
  
  # Use a password input for this value
  secretValue: String @input(type: PASSWORD)
  
  # Use plain multiline textarea input
  multilineText: String @input(type: TEXTAREA)
}
```



## Int

The `Int` type is for storing numeric values. This is as per the GraphQL specification a 
32 bit integer. 

| Limitations |  |
|---|---|
| Maximum value | 2147483647 |
| Minimum value | -2147483648 |

If you need to store values that are out of the range of a 32 bit integer, use the `Decimal` type.

**Example usage:** 

```graphql
type NewsFeed_Article implements Node {
  id: ID!
  visits: Int
}
```

## Float

The `Float` type is for storing floating point numbers. 

**Example usage:** 

```graphql 
type NewsFeed_Article implements Node {
  id: ID!
  rating: Float!
}
```

!!! warning "Warning"

    Do not use this data type to store exact values like money amounts, as aggregations
    and calculations on floating point numbers can lead to inaccuracies. If you need exact values, 
    use the `Decimal` scalar instead.

## Boolean

The `Boolean` type is for storing boolean values (`true` / `false`). 

**Example usage:**

```graphql
type NewsFeed_Article implements Node {
  id: ID!
  published: Boolean!
}
```

## DateTime

The `DateTime` type can be used to store ISO 8601 date time values with timezone and milliseconds precision. 

**Example values:** 

    # Datetime + timezone
    2018-01-11T14:38:30+02:00
    
    # UTC Date
    2018-01-11T14:38:30Z

    # UTC Datetime + timezone with milliseconds 
    2017-12-27T22:25:21.830Z

## ID

The `ID` scalar is for storing unique identifiers of nodes. The type is reserved for object types
that implement the `Node` interface and can only be used for the field `id`. If you need to 
store identifiers of other systems, use a [`String`](#string) scalar instead. 

**Example usage:**

```graphql
type NewsFeed_Article implements Node {
  id: ID!
}
```

## Decimal

The `Decimal` scalar can be used to store large numbers or decimal numbers where exact values are important 
(e.g. monetary values).
It is slower and requires more storage in the database, but can handle larger numbers than the `Int` or
`Float` scalars. 

| Limitations |  |
|---|---|
| Maximum digits | 1000 decimal digits on both sides of the decimal point combined. (e.g: -12.345 would count as 5 digits) |
| Maximum value | A decimal value with 1000 digits |
| Minimum value | A negative value with 1000 digits |

**Important**

The values are always returned as a `String` value. For example `"-4.0567"`. If you want to do further calculations
in the client, you would first have to convert this value into a data type on which you can perform numeric operations. 
Always make sure that your programming language can handle the maximum and minimum values that can be returned by
your GraphQL endpoint. 

**Example: Large integers in Javascript**

If you use the `Decimal` scalar to store numbers that are larger than 32 bit and can't be stored as `Int`, you can use
the `parseInt` function to convert the returned `Decimal` to an integer. However, Javascript does have a limit
of 53 bit for integers. You can only do this if you can be sure that your numbers never exceed 9,007,199,254,740,991 
(2^53 - 1) and -9,007,199,254,740,991 (-2^53 - 1).

```javascript
// Convert decimal value to integer
const numericValue = parseInt(decimalValue, 10);
```

If you need to process larger numbers than that, use a library like [big-int](https://www.npmjs.com/package/big-integer)

**Example: Floating point numbers in Javascript**

To convert `Decimal` values to floating point numbers, you can use the javascript function `parseFloat`. Keep in mind
that the resulting values come with the inaccuracies of floating point numbers and that the values might be 
rounded depending on the floating number limitation of the language and operating system. 

```javascript
// Convert decimal value to floating point number
const floatNumber = parseFloat(decimalValue);
```

If you need to handle accurate numbers with arbitrary precision, use a library like [bigdecimal](https://www.npmjs.com/package/bigdecimal)
