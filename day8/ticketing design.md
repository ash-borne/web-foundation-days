# TicketHub Design

TicketHub sells tickets for concerts and events. The hardest moment is a big sale, when thousands of people compete for the same seats.

## 1. Requirements

**Functional:** browse events and view a seat map; hold seats for 5 minutes while paying; pay; view my tickets.

**Non-functional:**
- **Correctness:** a seat is never sold twice (the most important rule)
- **Speed:** browsing pages load in under 300 ms
- **Fairness:** in a big sale, people are served in the order they arrived
- **Availability:** the site stays up during a huge spike
- **Durability:** a paid order is never lost

## 2. Estimates

Assumptions: 100,000 seconds per day, and about 10 requests per buyer in a big sale.

| | Normal day | Big sale |
|---|---|---|
| People | 50,000 visitors x 10 pages | 200,000 people in 10 minutes (600 s) |
| Reads | 500,000 per day = **5 per second** | 2,000,000 requests / 600 s = **3,300 per second** |
| Purchases | 5,000 per day = **0.05 per second** | 20,000 seats / 600 s = **33 per second** at most |

The big sale has about **660 times** the normal traffic, and only 1 in 10 people can get a seat, so 90% must be turned away quickly and cheaply.

## 3. API

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/events` | Browse events | 200 |
| GET | `/events/{id}` | Event details | 200 |
| GET | `/events/{id}/seats` | Seat map with each seat's status | 200 |
| POST | `/events/{id}/holds` | Hold seats, body `{ "seatIds": [101, 102] }` | 201 |
| POST | `/orders` | Pay for a hold, body `{ "holdId": 7, "paymentToken": "..." }` | 201 |
| GET | `/orders` | View my tickets | 200 |

Errors: `409` seat already taken, `410` hold expired, `401` not logged in.

## 4. Data model

- **users:** `id` (PK), `email` (unique), `password_hash`
- **events:** `id` (PK), `name`, `venue`, `starts_at`
- **orders:** `id` (PK), `user_id` (FK), `event_id` (FK), `total`, `status`, `payment_ref`
- **seats:** `id` (PK), `event_id` (FK), `section`, `row_label`, `seat_number`, `price`, `status` (available, held, sold), `held_by` (FK to users), `hold_expires_at`, `order_id` (FK to orders), `UNIQUE (event_id, section, row_label, seat_number)`

A user has many orders, an event has many seats and orders, and an order has many seats (each seat is in at most one order).

## 5. How double-booking is prevented

The **database** decides who gets a seat, never the cache or browser. A hold is one atomic conditional update:

```sql
UPDATE seats
SET status = 'held', held_by = ?, hold_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = ?
  AND (status = 'available' OR (status = 'held' AND hold_expires_at < NOW()));
```

- The database locks the row, so two simultaneous clicks run one after the other. The first changes the row, and the second finds it already held, changes **0 rows** and gets `409`.
- All seats in a hold are updated in **one transaction**: if any seat fails, everything rolls back.
- Payment is also a transaction: seats become `sold` only if still held by this user and not expired, otherwise it rolls back and the payment is refunded.
- The **unique constraint** means each physical seat exists as one row, so it has only one status and one order.
- A stale seat map in the cache may show a taken seat as free, but the database still rejects the second buyer.

## 6. Architecture

```
          Client
            |
           DNS
            |
           CDN  (event pages, images)
            |
      Load balancer
            |
      Waiting room (admits users in order)
            |
     +------+------+
     v             v
  App server 1  App server 2 ... (more added for a sale)
     |   |   |   \
     v   v   v    v
  Cache  Primary DB --> Read replica    Queue --> Worker
 (Redis) (seats, orders)                (e-tickets, expiring holds)
```

- **CDN:** serves event pages and images near the user, so most traffic never reaches our servers.
- **Load balancer:** spreads requests over the app servers, avoiding a single point of failure.
- **Waiting room:** admits people in arrival order at a rate the database can handle, giving fairness and protection.
- **App servers:** run the API and are stateless, so more can be added before a sale.
- **Cache:** serves the seat map from memory, refreshed every second or two, so viewers do not hit the database.
- **Primary database:** the single source of truth for seats and orders, where the atomic updates happen.
- **Read replica:** answers browsing queries so the primary can focus on holds and payments.
- **Queue and worker:** send e-tickets and release expired holds in the background.

**Surviving the big sale:** the CDN and cache absorb the reads, the waiting room limits holds to about 33 per second, extra app servers are added in advance, and the 90% who miss out get a quick `409`.

## 7. Trade-offs

- **Cached seat map vs load:** the map can be a second or two old, so someone may click a seat just taken and get a 409. This is fine because the database still prevents double-booking.
- **Waiting room vs convenience:** it gives fairness and stability, but people must wait and it is one more component to run.
- **Hold time:** a longer hold means fewer failed payments, but an abandoned hold blocks a seat until it expires.
- **One primary database vs scale:** it keeps correctness simple but limits write speed. 33 writes per second is easy, and the data can later be split by event.