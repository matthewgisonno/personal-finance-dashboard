# Transactions API

## Endpoint

`GET /api/transactions`

## Description

Retrieves a list of transactions for the current user, optionally filtered by status or account.

## Request

### Headers

- None required (Authentication implied via mock user lookup)

### Query Parameters

| Parameter   | Type   | Required | Description                                          |
| :---------- | :----- | :------- | :--------------------------------------------------- |
| `status`    | string | No       | Filter by category status: `pending` or `completed`. |
| `accountId` | string | No       | Filter by specific Account UUID.                     |

**Example:**
`GET /api/transactions?status=pending&accountId=123-abc`

## Response

### Success (200 OK)

Returns an array of transaction objects joined with category and account information.

```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2024-01-01T00:00:00.000Z",
      "description": "Store Name",
      "amount": "50.00",
      "categoryId": "uuid",
      "categoryStatus": "pending" | "completed",
      "categorySource": "ai" | "local" | "user" | "pending",
      "categoryConfidence": "0.95",
      "category": "Shopping",     // Joined Category Name
      "accountName": "Checking",  // Joined Account Name
      "accountId": "uuid"
    }
  ]
}
```

### Errors

| Status Code                 | Description                 | Body                                             |
| :-------------------------- | :-------------------------- | :----------------------------------------------- |
| `400 Bad Request`           | Invalid `status` parameter. | `{ "error": "Invalid 'status' query param" }`    |
| `401 Unauthorized`          | User not found (Mock auth). | `{ "error": "No user found" }`                   |
| `500 Internal Server Error` | Database or fetching error. | `{ "error": "Failed to fetch due to error..." }` |

## Notes

- Results are ordered by date descending.
- Amounts and confidence scores are returned as strings (typical for exact numeric types from DB).
