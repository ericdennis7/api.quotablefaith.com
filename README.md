# 📖 api.quotablefaith.com

## 🤲🏻 Overview {#overview}

The Quotable Faith Bible API is a ***free, simple, and fast service*** that gives you access to a large collection of Christian and Bible quotes. Whether you want a random quote for inspiration or want to search for quotes on a specific topic, this API makes it easy.

Key features include:

- **Random Quotes:** Get a single, random quote from the database.
- **Search by Topic:** Find quotes that match a topic you choose.
- **Fast and Easy to Use:** Designed to respond quickly with clear, simple results.
- **Simple REST API:** Easy-to-understand web addresses and JSON responses.
- **Control Over Results:** You can limit how many quotes you get back.
- **Helpful Details:** Each quote includes the author, number of likes, and topics.

This API is useful for developers building apps, websites, or tools that want to include inspiring Bible quotes.

Check out the endpoints below to learn how to use it.

## ⚠️ Warnings

- > **Each user is limited to one request per second.**
- > This project is supported by donations.
- > If any author wishes to have their quote removed, please reach out and it will be taken down as soon as possible.

## 🌐 Base URL

`https://api.quotablefaith.com`

## 🔚 Endpoints

### 1. `GET /`

Returns a welcome message with a hint to check the documentation.

**Response:**

```json
{
  "message": "Welcome to the Bible API. See /docs for available endpoints."
}
```

### 2. `GET /v1/quotes/random`
Fetches a single random quote from the database.

#### Response (200 OK):

```json
{
  "author": "Author Name",
  "quote": "The quote text.",
  "likes": 123,
  "topics": "faith, hope, love"
}
```
#### Response (404 Not Found):

```json
{
  "detail": "No quotes available."
}
```
### 3. `GET /v1/quotes?q={topic}&limit={number}`
Searches quotes by topic keyword with an optional limit on the number of results.

#### Query Parameters:

| Parameter | Type   | Required | Description                                                     | Default | Constraints       |
| --------- | ------ | -------- | --------------------------------------------------------------- | ------- | ----------------- |
| `q`       | string | Yes      | Topic keyword to search within quote topics (case-insensitive). | —       | Minimum length: 1 |
| `limit`   | int    | No       | Maximum number of quotes to return.                             | 1       | Min: 1, Max: 50   |

#### Response (200 OK)

Returns an array of quotes matching the topic.

```json
[
  {
    "author": "Author Name",
    "quote": "The quote text.",
    "likes": 123,
    "topics": "faith, hope, love"
  },
  ...
]
```

#### Response (400 Bad Request)

Missing or invalid q parameter.

```json
{
  "detail": "Missing or invalid query param: q"
}
```

#### Response (404 Not Found)

No quotes found matching the topic.

```json
{
  "detail": "No quotes found for that topic."
}
```

### Errors
All errors return JSON responses with a detail message, e.g.:

```json
{
  "detail": "Not Found"
}
```

Status codes include 400 (bad request), 404 (not found), etc.

### Notes
- The limit parameter caps the number of returned quotes between 1 and 50.
- Searches are case-insensitive and match topics partially.
- Random quotes are selected using a database random ordering function.

