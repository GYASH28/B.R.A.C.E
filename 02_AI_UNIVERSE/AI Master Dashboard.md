<!-- BRACE-GENERATED: v1 -->
---
title: AI Master Dashboard
type: dashboard
area: ai
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [ai, dashboard, brace]
---

        # AI Master Dashboard

        ## Map
        - [[Artificial Intelligence Overview]]
        - [[Machine Learning]]
        - [[Deep Learning]]
        - [[Generative AI]]
        - [[LLMs]]
        - [[AI Agents]]
        - [[Voice Agents]]
        - [[AI Automation]]
        - [[Prompt Engineering]]
        - [[AI Tools Database]]
        - [[AI Research Papers]]

        ## Latest AI News
        ```dataview
        TABLE date, source, reliability, category
        FROM "02_AI_UNIVERSE/Updates"
        WHERE type = "ai-news"
        SORT date DESC
        LIMIT 15
        ```

        ## AI Tools Database
        ```dataview
        TABLE category, pricing, use_case, rating
        FROM "02_AI_UNIVERSE"
        WHERE type = "ai-tool"
        SORT rating DESC
        ```

        ## Research Papers
        ```dataview
        TABLE published, source, reliability, topic
        FROM "02_AI_UNIVERSE" OR "09_RESEARCH_DATABASE"
        WHERE contains(tags, "ai/research")
        SORT published DESC
        LIMIT 12
        ```

        ## Agent and Automation Ideas
        ```dataview
        TASK
        FROM "02_AI_UNIVERSE" OR "06_PROJECTS" OR "10_AUTOMATION_SYSTEM"
        WHERE !completed AND (contains(text, "agent") OR contains(text, "automation"))
        LIMIT 20
        ```

        ## Prompt Engineering Library
        - [[Prompt Engineering]]
        - [[B.R.A.C.E Project]]
        - [[AI Automation]]
