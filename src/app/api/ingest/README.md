# Ingest API

## Endpoint

`POST /api/ingest`

## Description

Ingests a batch of transactions into the system. It attempts basic local categorization based on string matching. It also updates the associated account's balance.

## Request

### Headers

- `Content-Type`: `application/json`

### Body

The request body must adhere to the following schema:

```json
{
  "accountId": "string", // UUID of the account these transactions belong to
  "transactions": [
    {
      "id": "string", // External or temporary ID (not used for DB ID)
      "date": "string", // ISO Date string
      "description": "string", // Transaction description
      "amount": 123.45 // Numeric amount
    }
  ]
}
```

## Response

### Success (200 OK)

Returns the newly created transaction records, including their assigned categories.

```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2024-01-01T00:00:00.000Z",
      "description": "GROCERY STORE",
      "amount": "123.45",
      "userId": "uuid",
      "accountId": "uuid",
      "categoryId": "uuid",
      "categoryStatus": "pending" | "completed",
      "categorySource": "pending" | "local",
      "categoryConfidence": "1",
      "category": "Groceries" // Resolved Category Name
    }
    // ...
  ]
}
```

### Errors

| Status Code                 | Description                                                       | Body                                                                                  |
| :-------------------------- | :---------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `400 Bad Request`           | Invalid body or missing Account ID/User.                          | `{ "error": "Invalid request body", ... }` or `{ "error": "Account ID is required" }` |
| `500 Internal Server Error` | System config error (missing Uncategorized category) or DB error. | `{ "error": "System configuration error..." }` or `{ "error": "Failed to ingest" }`   |

## Notes

- Transactions matching a known keyword locally are marked as `completed` with source `local` and confidence `1.0`.
- Transactions with no local match are marked as `pending` with source `pending` and confidence `0` (Uncategorized).
- The account balance is automatically updated by summing the transaction amounts.
