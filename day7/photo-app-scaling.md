# SnapShare Scaling Plan

## 1. Assumptions

- 10,000,000 registered users, 10% active each day = **1,000,000 daily active users**
- Each active user uploads 1 photo and views 50 feed pages per day
- Each photo is 2 MB, plus a 50 KB thumbnail (2.05 MB in total)
- One day is about 100,000 seconds, one year is 365 days, and peak is 5x the average

## 2. Estimates

- **Uploads:** 1,000,000 per day = **10 per second** on average, **50 per second** at peak
- **Feed views:** 50,000,000 per day = **500 per second** on average, **2,500 per second** at peak
- **Storage:** 1,000,000 x 2.05 MB = 2.05 TB per day, so about **748 TB per year** (730 TB originals + 18 TB thumbnails)

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**, with 50 feed views for every upload (50 to 1). So we serve files through a CDN, cache hot data, add a read replica, keep writes simple, and do slow work (thumbnails) in the background.

## 4. Why photos are not stored in the database

About 750 TB of photos per year would make the database huge, slow and expensive, and would slow queries, backups and replication. Photos go in **object storage** instead. The database keeps only metadata and each file's location.

## 6. Components

- **CDN:** serves photos and thumbnails from servers near users, solving slow loading and taking load off our servers.
- **Load balancer:** spreads requests across app servers, solving overload and a single point of failure.
- **App servers:** run the app logic and, being stateless, can be added as traffic grows.
- **Cache (Redis):** keeps hot feed data in memory, solving repeated expensive database queries.
- **Database (primary):** stores users, follows and photo metadata, solving the need for consistent structured data.
- **Read replica:** a copy of the database that serves reads, solving read overload on the primary.
- **Object storage:** stores originals and thumbnails cheaply and durably, solving the 750 TB per year file problem.
- **Queue:** holds thumbnail jobs, solving slow uploads because users do not wait for image processing.
- **Worker:** takes jobs from the queue and creates thumbnails, moving heavy work off the app servers.

## 7. Upload flow

1. The app sends an authenticated upload request, and the load balancer picks an app server.
2. The app server validates the file and creates a photo id.
3. It saves the original photo in object storage.
4. It inserts a database row (photo id, owner, file location, status "processing").
5. It puts a "create thumbnail" job on the queue.
6. It replies **201 Created** straight away, so the user does not wait.
7. A worker takes the job, reads the original, creates the 50 KB thumbnail and saves it to object storage.
8. The worker sets the row to "ready". If it fails, the job returns to the queue and is retried.
9. Followers' cached feeds are refreshed, and the photos reach them through the CDN.

## 8. Trade-offs

- **Cache:** faster reads, but data can be stale and invalidating it adds complexity.
- **Read replica:** spreads the read load, but replication lag means a user may not see a new photo at once (their own recent data can be read from the primary).
- **Queue and worker:** fast uploads, but thumbnails arrive late (show a placeholder) and there is more to run and monitor.
- **Cost:** 750 TB per year plus CDN traffic is expensive, so old photos can move to cheaper storage tiers, at the price of slower access.

## 5. Architecture diagram

```
                   Users
                  /     \
             files       API calls
               |           |
               v           v
              CDN     Load balancer
               |           |
               |           v
               |    App servers (stateless)
               |      |     |      |
               |      v     v      v
               |   Cache Database Queue
               |           |        |
               |    replicates      v
               |           |     Worker
               |           v        |
               |     Read replica   |
               |                    |
               v                    v
    +-----------------------------------------+
    |  Object storage (photos + thumbnails)   |
    +-----------------------------------------+
    (App servers also save the original photo here.)
```

