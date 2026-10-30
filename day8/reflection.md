# Reflection

The most difficult concept for me was scaling a system, especially understanding how a cache, a read replica and a queue each solve a different problem. It was easy to memorise the names of the components, but harder to explain why each one is needed and what it costs. I overcame this by working with real numbers, such as turning a number of users into reads and writes per second, and then asking what would break first. Seeing that a system is read-heavy made the reasons for caching and replicas much clearer.

Based on the feedback I received, the part of my capstone I would improve is the documentation. On Day 7 my scaling plan was marked down because sections were missing from what the grader could see, which taught me that documents must be concise, well ordered and checked in full after pushing to GitHub. For my capstone I would shorten the design documents, put the most important sections first and add more detail on failure cases, such as what happens when the cache or the database goes down.

Next, I want to learn how to build a real backend with Node.js, a SQL database and user authentication, so I can turn my API design into a working service. After that I plan to learn about testing and deployment, so that I can run and maintain a project like QuickNotes online.
