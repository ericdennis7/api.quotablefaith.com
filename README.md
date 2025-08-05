# 📖 [api.quotablefaith.com](https://api.quotablefaith.com)

## 🤲🏻 Overview

The Quotable Faith Bible API is a ***free, simple, and fast service*** that gives you access to a large collection (10,000+) of Christian and Bible quotes. Whether you want a random quote for inspiration or want to search for quotes on a specific topic, this API makes it easy.

Key features include:

- **Random Quotes:** Get a single, random quote from the database.
- **Search by Topic:** Find quotes that match a topic you choose.
- **Fast and Easy to Use:** Designed to respond quickly with clear, simple results.
- **Simple REST API:** Easy-to-understand web addresses and JSON responses.
- **Control Over Results:** You can limit how many quotes you get back.
- **Helpful Details:** Each quote includes the author, number of likes, and topics.

This API is useful for developers building apps, websites, or tools that want to include inspiring Christian quotes.

Check out the endpoints below to learn how to use it.

> ❗ If you need an API key, [sign up here](https://api.quotablefaith.com).

## ⚠️ Warnings

- > **Each user is limited to one request per second.**
- > This project is supported by donations.
- > If any author wishes to have their quote removed, please reach out and it will be taken down as soon as possible.

## 🌐 Base URL

`https://api.quotablefaith.com`

## Authentication: `X-api-key` Header

> All requests to endpoints starting with `/v1/*` require an API key in the request header.  
> Example header:

```bash
X-api-key: <your_api_key>
```

If you need an API key, [sign up here](https://api.quotablefaith.com).

### Example Code Requests
#### Python (requests)
```python
import requests
headers = {"X-api-key": "<your_api_key>"}
resp = requests.get("https://api.quotablefaith.com/v1/quotes/random", headers=headers)
print(resp.json())
```

#### JavaScript (fetch)
```javascript
fetch("https://api.quotablefaith.com/v1/quotes/random", {
  headers: {"X-api-key": "<your_api_key>"}
})
  .then(res => res.json())
  .then(data => console.log(data));
```
#### PHP (cURL)
```php
$ch = curl_init("https://api.quotablefaith.com/v1/quotes/random");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-api-key: <your_api_key>"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```
#### Perl (LWP::UserAgent)
```perl
use LWP::UserAgent;
my $ua = LWP::UserAgent->new;
my $req = HTTP::Request->new(GET => 'https://api.quotablefaith.com/v1/quotes/random');
$req->header('X-api-key' => '<your_api_key>');
my $res = $ua->request($req);
print $res->decoded_content;
```
#### Bash (curl)
```bash
curl -H "X-api-key: <your_api_key>" https://api.quotablefaith.com/v1/quotes/random
```

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

