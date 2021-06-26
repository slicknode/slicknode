title: Enum Types: Using Enum types in GraphQL
description: How to create enum types for Slicknode using the GraphQL Schema Definition Language (GraphQL SDL)

# Enum Types

An Enum Type is a special type that consist of a predefined set of constants. 

## Definition

**Example:**

```graphql
"""
The status of a payment
"""
enum Payment_PaymentStatus {
  """Payment completed successfully"""
  SUCCEEDED
  
  """Payment is pending"""
  PENDING
  
  """Payment failed"""
  FAILED
}
```

This creates an Enum type with 3 possible values: `SUCCEEDED`, `PENDING` and `FAILED`. 
The values should use `UPPERCASE_LETTERS`, numbers and underscores. 


## Usage

Descriptions can be added by adding a comment to the value as in the example above. 

You can use those enum types for field values like any other type:

```graphql 
type Payment_Invoice {
  # The payment status can be one of `SUCCEEDED`, `PENDING` or `FAILED`
  paymentStatus: Payment_PaymentStatus!
}
```

The field values of Enum type fields are enforced on the database level. If you delete a value
of an Enum type that is used in another object, the migration will fail since the constraint cannot 
be satisfied. You would first have to remove or change the values for the existing objects to be 
able to remove a value from an Enum type. 