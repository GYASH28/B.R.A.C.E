<!-- BRACE-GENERATED: v1 -->
---
title: B.R.A.C.E Master Dashboard
type: dashboard
area: home
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [brace, dashboard, home]
---

        # 🧠 B.R.A.C.E Master Dashboard

        > [!quote] Operating Principle
        > B.R.A.C.E is the command layer for learning, research, projects, college, and future planning. It stores only what is useful, sourced, connected, and reviewable.

        ## Command Strip
        - Today: [[🔥 Today's Command Center]]
        - Start: [[🚀 Start Here]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
        - Quick Capture: [[Quick Capture]]
        - Review: [[Weekly Review Template]]

        ## Priority Panels

        ```dataview
        TABLE status, priority, deadline
        FROM "06_PROJECTS"
        WHERE type = "project" AND status != "completed"
        SORT priority DESC, deadline ASC
        LIMIT 8
        ```

        ```dataview
        TASK
        FROM "04_CWIT_COLLEGE_PUNE" OR "05_STUDIES" OR "06_PROJECTS"
        WHERE !completed
        GROUP BY file.folder
        ```

        ## Latest Intelligence

        ```dataview
        TABLE date, source, reliability, category
        FROM "02_AI_UNIVERSE/Updates"
        WHERE type = "ai-news"
        SORT date DESC
        LIMIT 7
        ```

        ```dataview
        TABLE date, source, reliability, category
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE type = "world-update"
        SORT date DESC
        LIMIT 7
        ```

        ```dataview
        TABLE retrieved, official, category, action_required
        FROM "04_CWIT_COLLEGE_PUNE/Updates"
        WHERE type = "cwit-update"
        SORT retrieved DESC
        LIMIT 7
        ```

        ## Study Radar

        ```dataview
        TABLE semester, difficulty, status
        FROM "05_STUDIES"
        WHERE type = "study-note"
        SORT difficulty DESC, file.name ASC
        ```

        ## Open Questions

        ```dataview
        TASK
        WHERE !completed AND contains(text, "?")
        LIMIT 12
        ```

        ## System Health

        ```dataview
        TABLE file.folder, created, updated
        FROM ""
        WHERE !tags
        SORT file.mtime DESC
        LIMIT 15
        ```

        ```dataview
        TABLE source, reliability, retrieved
        FROM "09_RESEARCH_DATABASE" OR "02_AI_UNIVERSE/Updates" OR "03_WORLD_INTELLIGENCE/Updates"
        WHERE reliability <= 2
        SORT retrieved DESC
        LIMIT 20
        ```
