<!-- BRACE-GENERATED: v1 -->
---
title: Research Dashboard
type: dashboard
area: research
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [research, dashboard, brace]
---

        # Research Dashboard

        ## Research Areas
        - [[Research Inbox]]
        - [[Research Papers]]
        - [[Important Articles]]
        - [[YouTube Learning Notes]]
        - [[PDF Summaries]]
        - [[Book Notes]]
        - [[Source Database]]
        - [[Citation Database]]
        - [[Trusted Sources]]
        - [[Question Bank]]
        - [[Deep Research Topics]]

        ## Unprocessed Research Inbox
        ```dataview
        TABLE file.mtime, status, source
        FROM "09_RESEARCH_DATABASE"
        WHERE status = "inbox" OR contains(tags, "inbox")
        SORT file.mtime DESC
        ```

        ## Sources With Low Reliability
        ```dataview
        TABLE source, reliability, topic
        FROM "09_RESEARCH_DATABASE"
        WHERE reliability <= 2
        SORT reliability ASC
        ```

        ## Notes Without Source Links
        ```dataview
        LIST
        FROM "09_RESEARCH_DATABASE" OR "02_AI_UNIVERSE" OR "03_WORLD_INTELLIGENCE"
        WHERE !source AND type != "dashboard"
        LIMIT 50
        ```
