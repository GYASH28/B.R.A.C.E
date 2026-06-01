<!-- BRACE-GENERATED: v1 -->
---
title: n8n Workflows
type: automation-doc
area: Automation Dashboard
status: evergreen
created: 2026-05-26
updated: 2026-05-26
tags: [brace, automation]
---

        # n8n Workflows


        ## n8n Plan
        1. Cron node: run daily at 7:00 AM.
        2. RSS Read nodes: AI, tech, world, India feeds.
        3. HTTP Request nodes: CWIT, MSBTE, DTE, AICTE official pages.
        4. Function node: normalize title, URL, published date, category, reliability.
        5. Data Store node: check duplicate URL/hash.
        6. AI node: summarize only if source text was fetched successfully.
        7. Markdown node: format using B.R.A.C.E templates.
        8. Write Binary/File node or GitHub node: save into vault.
        9. Error branch: append `Update not verified. Source unavailable.` to update log.
        10. Weekly/monthly Cron branches: generate digest notes.

        ## Workflow Skeleton
        See `10_AUTOMATION_SYSTEM/n8n_workflows/brace_daily_intelligence_workflow.json`.


        ## Intelligence Links
        - Home: [[🧠 B.R.A.C.E Master Dashboard]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
