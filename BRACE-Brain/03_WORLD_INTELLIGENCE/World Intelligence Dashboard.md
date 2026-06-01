<!-- BRACE-GENERATED: v1 -->
---
title: World Intelligence Dashboard
type: dashboard
area: world
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [world, dashboard, brace]
---

        # World Intelligence Dashboard

        ## Intelligence Streams
        - [[Global News]]
        - [[India News]]
        - [[Maharashtra News]]
        - [[Pune News]]
        - [[Technology News]]
        - [[Economy and Business]]
        - [[Geopolitics]]
        - [[Climate and Environment]]
        - [[Science Updates]]
        - [[Space Updates]]

        ## Latest World Updates
        ```dataview
        TABLE date, category, source, reliability
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE type = "world-update"
        SORT date DESC
        LIMIT 20
        ```

        ## India / Pune Focus
        ```dataview
        TABLE date, category, source, reliability
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE contains(tags, "india") OR contains(tags, "pune") OR contains(tags, "maharashtra")
        SORT date DESC
        LIMIT 15
        ```

        ## Timeline
        - [[Important Events Timeline]]
        - [[Weekly World Summary]]
        - [[Monthly World Summary]]

        ## Low Reliability Watchlist
        ```dataview
        TABLE source, reliability, retrieved
        FROM "03_WORLD_INTELLIGENCE"
        WHERE reliability <= 2
        SORT retrieved DESC
        ```
