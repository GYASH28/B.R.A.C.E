<!-- BRACE-GENERATED: v1 -->
---
title: Dataview Queries
type: query-library
area: automation
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [brace, dataview, automation]
---

        # Dataview Queries

        ## Latest Notes
        ```dataview
        TABLE file.folder, file.mtime
        FROM ""
        SORT file.mtime DESC
        LIMIT 20
        ```

        ## Notes Created Today
        ```dataview
        LIST
        FROM ""
        WHERE file.cday = date(today)
        SORT file.ctime DESC
        ```

        ## AI News From Last 7 Days
        ```dataview
        TABLE date, source, reliability
        FROM "02_AI_UNIVERSE/Updates"
        WHERE type = "ai-news" AND date >= date(today) - dur(7 days)
        SORT date DESC
        ```

        ## CWIT Updates From Last 30 Days
        ```dataview
        TABLE retrieved, official, source, action_required
        FROM "04_CWIT_COLLEGE_PUNE/Updates"
        WHERE type = "cwit-update" AND retrieved >= date(today) - dur(30 days)
        SORT retrieved DESC
        ```

        ## Pending Tasks
        ```dataview
        TASK
        FROM ""
        WHERE !completed
        SORT due ASC
        ```

        ## Project Tasks By Priority
        ```dataview
        TASK
        FROM "06_PROJECTS"
        WHERE !completed
        GROUP BY file.frontmatter.priority
        ```

        ## Study Topics By Difficulty
        ```dataview
        TABLE subject, unit, topic, difficulty, status
        FROM "05_STUDIES"
        WHERE type = "study-note"
        SORT difficulty DESC
        ```

        ## Sources With Low Reliability
        ```dataview
        TABLE source, reliability, topic
        FROM ""
        WHERE reliability <= 2
        SORT reliability ASC
        ```

        ## Unprocessed Inbox Notes
        ```dataview
        TABLE file.mtime
        FROM "01_INBOX"
        WHERE status != "processed"
        SORT file.mtime DESC
        ```

        ## Notes Without Tags
        ```dataview
        LIST
        FROM ""
        WHERE !tags
        SORT file.mtime DESC
        ```

        ## Notes Without Source Links
        ```dataview
        LIST
        FROM "02_AI_UNIVERSE" OR "03_WORLD_INTELLIGENCE" OR "04_CWIT_COLLEGE_PUNE" OR "09_RESEARCH_DATABASE"
        WHERE !source AND type != "dashboard"
        SORT file.mtime DESC
        LIMIT 50
        ```
