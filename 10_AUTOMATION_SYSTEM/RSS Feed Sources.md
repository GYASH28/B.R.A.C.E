<!-- BRACE-GENERATED: v1 -->
---
title: RSS Feed Sources
type: automation-doc
area: Automation Dashboard
status: evergreen
created: 2026-05-26
updated: 2026-05-26
tags: [brace, automation]
---

        # RSS Feed Sources


        ## RSS Strategy
        RSS is the safest default for automated updates because it provides source URLs, titles, dates, and stable IDs.

        ## Source Config
        Edit:
        `10_AUTOMATION_SYSTEM/config/sources.json`

        ## Rules
        - Prefer official feeds for AI/company updates.
        - Prefer established news feeds for world/current affairs.
        - For CWIT, use official page monitoring because RSS may not exist.
        - If a feed fails, the updater logs the error and does not invent content.


        ## Intelligence Links
        - Home: [[🧠 B.R.A.C.E Master Dashboard]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
