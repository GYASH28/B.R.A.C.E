<!-- BRACE-GENERATED: v1 -->
---
title: Projects Dashboard
type: dashboard
area: projects
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [project, dashboard, brace]
---

        # Projects Dashboard

        ## Active Projects
        ```dataview
        TABLE status, priority, deadline, tech-stack
        FROM "06_PROJECTS"
        WHERE type = "project"
        SORT priority DESC, deadline ASC
        ```

        ## Bugs
        ```dataview
        TASK
        FROM "06_PROJECTS"
        WHERE !completed AND contains(text, "bug")
        LIMIT 30
        ```

        ## Feature Ideas
        ```dataview
        TASK
        FROM "06_PROJECTS"
        WHERE !completed AND (contains(text, "feature") OR contains(text, "idea"))
        LIMIT 30
        ```

        ## Roadmaps
        - [[B.R.A.C.E Project]]
        - [[LERNIO Project]]
        - [[Feature Roadmap]]
        - [[Project Ideas]]
