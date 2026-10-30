# SnapShare Scaling Plan

SnapShare is a photo-sharing app where users upload photos and scroll a feed of photos from people they follow. This document works out how much traffic and storage the system must handle and designs an architecture that can scale to it.

## 1. Assumptions

- Registered users: **10,000,000**
- Active each day: **10%**
- Each active user uploads **1 photo per day** and views **50 feed pages per day**
- Average photo size: **2 MB**
- Each photo also gets a **50 KB thumbnail**
- One day is about **100,000 seconds** (a rounded version of 86,400, which keeps the maths simple)
- One year is **365 days**
- Peak traffic is **5 times** the average
- Extra assumption: each photo row in the database (owner, file location, time, status) is about 1 KB

## 2. Estimates

### Daily active users

- 10,000,000 registered users x 10% = **1,000,000 daily active users**

### Uploads per second

- Uploads per day: 1,000,000 users x 1 photo = 1,000,000 photos per day
- Average: 1,000,000 / 100,000 = **10 uploads per second**
- Peak (5x): **50 uploads per second**

### Feed views per second

- Feed views per day: 1,000,000 users x 50 = 50,000,000 feed views per day
- Average: 50,000,000 / 100,000 = **500 feed views per second**
- Peak (5x): **2,500 feed views per second**

### Photo storage per year

- Per photo: 2 MB original + 0.05 MB thumbnail = 2.05 MB
- Per day: 1,000,000 x 2.05 MB = 2.05 TB
- Originals per year: 2 TB x 365 = 730 TB
- Thumbnails per year: 50 GB x 365 = about 18.25 TB
- Total per year: about **748 TB, or roughly 0.75 PB**
- Database metadata per year: 1,000,000 rows x 365 x 1 KB = about 365 GB, which is tiny compared with the photos

| Measure | Average | Peak (5x) |
|---|---|---|
| Uploads per second | 10 | 50 |
| Feed views per second | 500 | 2,500 |
| New photo storage | 2.05 TB per day | about 748 TB per year |

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are 50 feed views for every 1 upload, a read to write ratio of about 50 to 1, and each feed page loads many photos, which makes the read load even bigger. (If each feed page shows about 10 thumbnails, that is roughly 5,000 thumbnail requests per second on average.)

What this means for the design:

- Make reads as cheap as possible by serving photos from a CDN and hot data from a cache, so most requests never reach the database.
- Add a read replica so that database reads can be spread out, while a single primary database handles the small number of writes.
- Writes are low (10 per second on average), so they can be simple, but uploads move large files and should not block the user, which is why thumbnail creation is done in the background.

## 4. Why photos are not stored in the database

- **Size:** Photos add about 750 TB per year. Databases are built for small, structured rows, and storing that much binary data would make them huge, slow and expensive.
- **Performance:** Reading large files uses database connections and memory that should be serving fast queries. Backups, replication and recovery would also take far longer.
- **Cost and fit:** Object storage is designed for huge numbers of files. It is cheap, very durable and scales almost without limit, and it can be connected directly to a CDN.

**Where they go instead:** the original photos and thumbnails are stored in **object storage**. The database stores only the **metadata** (photo id, owner, caption, time, status) and the **key (location)** of each file in object storage.

## 6. Components and the problem each one solves

- **CDN:** Delivers photos and thumbnails from servers close to the user, which solves slow loading for faraway users and keeps most of the heavy read traffic away from our own servers.
- **Load balancer:** Spreads incoming requests across many app servers, which solves a single server becoming overloaded and a single point of failure.
- **App servers:** Run the business logic (login, upload, feed, follow), and because they are stateless, more of them can be added whenever traffic grows.
- **Cache (Redis):** Keeps hot data such as recent feeds in fast memory, which solves repeated expensive database queries for the same data.
- **Database (primary):** Stores users, follows and photo metadata reliably, which solves the need for structured, consistent data and a single place where writes happen.
- **Read replica:** Holds a copy of the primary database that serves read queries, which solves the primary being overwhelmed by the heavy read load.
- **Object storage:** Stores the original photos and thumbnails as files, which solves the problem of storing hundreds of terabytes cheaply and durably.
- **Queue:** Holds "create thumbnail" jobs until a worker is ready, which solves slow uploads and lost work during traffic spikes, because the user does not wait for image processing.
- **Worker:** Picks jobs from the queue and creates the 50 KB thumbnail, which solves the heavy image processing work by moving it off the app servers.

## 7. Upload flow, step by step

1. The user picks a photo in the app, and the app sends an authenticated upload request.
2. The load balancer sends the request to any available app server.
3. The app server checks the user's token, validates the file (type and size), and creates a unique photo id.
4. The app server saves the original 2 MB photo in object storage.
5. The app server inserts a row in the primary database with the photo id, owner, file location and the status "processing".
6. The app server puts a "create thumbnail" job (containing the photo id) on the queue.
7. The app server immediately replies to the user with 201 Created, so the user does not wait for the thumbnail.
8. A worker takes the job from the queue, reads the original from object storage, creates the 50 KB thumbnail and saves it back to object storage.
9. The worker updates the database row to the status "ready" and stores the thumbnail location. If the worker fails, the job returns to the queue and is retried.
10. The cached feeds of the user's followers are invalidated or updated, so their next feed view loads the new photo (delivered through the CDN).

## 8. Trade-offs

- **Cache: speed vs fresh data.** The cache makes feed reads much faster and protects the database, but cached feeds can be out of date, and the system must invalidate or update the cache after changes, which adds complexity and possible bugs.
- **Read replica: scalability vs replication lag.** A replica spreads out the read load, but it can lag slightly behind the primary, so a user might not see their own new photo straight away. This can be reduced by reading a user's own recent data from the primary.
- **Queue and worker: fast uploads vs delayed thumbnails.** Uploads finish quickly and survive traffic spikes, but the thumbnail is not ready instantly, so the app must show a placeholder for a short time, and there is an extra component to run and monitor.
- **CDN and object storage: speed and durability vs cost.** Around 750 TB of new photos per year plus CDN traffic is expensive. Costs can be reduced by moving old, rarely viewed photos to cheaper storage tiers, at the price of slower access to them.

## 5. Architecture diagram

```
                 Users (mobile app / web browser)
                    |                      |
          photos and thumbnails       API requests
                    |                      |
                    v                      |
            +---------------+              |
            |      CDN      |              |
            +---------------+              |
                    |                      |
          (cache miss: fetch file)         v
                    |            +-----------------+
                    |            |  Load balancer  |
                    |            +-----------------+
                    |              |       |       |
                    |              v       v       v
                    |          +-----+ +-----+ +-----+
                    |          | App | | App | | App |   (stateless)
                    |          | srv | | srv | | srv |
                    |          +-----+ +-----+ +-----+
                    |              |       |       |
                    |      +-------+-------+-------+--------+
                    |      |               |                |
                    |      v               v                v
                    |  +---------+   +-------------+   +---------+
                    |  |  Cache  |   |  Database   |   |  Queue  |
                    |  | (Redis) |   |  (primary)  |   +---------+
                    |  +---------+   +-------------+        |
                    |                      |                v
                    |                replication       +---------+
                    |                      |           | Worker  |
                    |                      v           | (makes  |
                    |               +-------------+    | thumbs) |
                    |               |    Read     |    +---------+
                    |               |   replica   |         |
                    |               +-------------+         |
                    |                                       |
                    v                                       v
            +---------------------------------------------------+
            |   Object storage (original photos + thumbnails)   |
            +---------------------------------------------------+

 App servers also read and write photo files in object storage directly.
 Reads of feed data go to the cache first, then to the read replica.
 Writes go to the primary database, which copies changes to the replica.
```

