# Library API Design

A REST API for a library's **books** resource. All requests and responses use JSON.

## Base URL

- `https://api.library.example/v1`

## The book object

```json
{
  "id": 7,
  "title": "Weep Not, Child",
  "author": "Ngugi wa Thiong'o",
  "isbn": "9780435908300",
  "year": 1964,
  "copiesAvailable": 3
}
```

## Endpoints

### 1. List all books

- **Method and path:** `GET /books`
- **Description:** Returns an array of every book in the library.
- **Request body:** none
- **Success status:** `200 OK`

### 2. Get one book

- **Method and path:** `GET /books/{id}`
- **Description:** Returns the single book with the given id.
- **Example:** `GET /books/7`
- **Request body:** none
- **Success status:** `200 OK`

### 3. Create a book

- **Method and path:** `POST /books`
- **Description:** Adds a new book to the library and returns it with its new id.
- **Example request body:**

```json
{
  "title": "Weep Not, Child",
  "author": "Ngugi wa Thiong'o",
  "isbn": "9780435908300",
  "year": 1964,
  "copiesAvailable": 3
}
```

- **Success status:** `201 Created`

### 4. Update a book

- **Method and path:** `PUT /books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example:** `PUT /books/7`
- **Example request body:**

```json
{
  "title": "Weep Not, Child",
  "author": "Ngugi wa Thiong'o",
  "isbn": "9780435908300",
  "year": 1964,
  "copiesAvailable": 2
}
```

- **Success status:** `200 OK`

### 5. Delete a book

- **Method and path:** `DELETE /books/{id}`
- **Description:** Removes the book with the given id from the library.
- **Example:** `DELETE /books/7`
- **Request body:** none
- **Success status:** `204 No Content` (nothing is returned)

### 6. List books by an author

- **Method and path:** `GET /books?author={name}`
- **Description:** Returns only the books written by the given author, using a query parameter.
- **Example:** `GET /books?author=Chinua%20Achebe`
- **Request body:** none
- **Success status:** `200 OK` (an empty array `[]` if the author has no books)

## Error codes

### 400 Bad Request

- **Meaning:** The request is invalid, so the server cannot process it.
- **Example:** `POST /books` with the `title` missing, or with `"year": "last year"` instead of a number.

### 404 Not Found

- **Meaning:** The requested resource does not exist.
- **Example:** `GET /books/999` when no book has the id 999. The same applies to `PUT` and `DELETE` on a missing id.