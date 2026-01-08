# Categorize AI API

## Endpoint

`POST /api/categorize-ai`

## Description

Categorizes a list of transactions using AI (OpenAI). It updates the transactions in the database with the suggested category, confidence score, and status.

## Request

### Headers

- `Content-Type`: `application/json`

### Body

The request body must adhere to the following schema:

```json
{
  "transactions": [
    {
      "id": "string", // Unique identifier for the transaction
      "description": "string" // Transaction description to analyze
    }
  ]
}
```

## Response

### Success (200 OK)

Returns the categorization results for the processed transactions.

```json
{
  "categorizations": [
    {
      "i": "string", // Transaction ID
      "t": "string", // Suggested Category Name
      "n": 0.95 // Confidence Score (0.0 - 1.0)
    }
  ]
}
```

### Errors

| Status Code                 | Description                  | Body                                                          |
| :-------------------------- | :--------------------------- | :------------------------------------------------------------ |
| `400 Bad Request`           | Invalid request body format. | `{ "error": "Invalid request body", "details": ... }`         |
| `401 Unauthorized`          | User not found (Mock auth).  | `{ "error": "No user found" }`                                |
| `500 Internal Server Error` | Processing failed.           | (Falls back to 200 with "Uncategorized" if persistence fails) |

## Notes

- If the AI processing fails, the endpoint attempts to mark transactions as "Uncategorized" with status "completed" and source "error".
- It returns a fallback response (Uncategorized, 0 confidence) in case of processing errors to prevent client loops.
