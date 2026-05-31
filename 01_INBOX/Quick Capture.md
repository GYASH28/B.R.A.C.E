<!-- BRACE-GENERATED: v1 -->
---
title: Quick Capture
type: inbox
area: inbox
status: evergreen
created: 2026-05-26
updated: 2026-05-26
tags: [brace, inbox]
---

        # Quick Capture


        ## Capture Rules
        - Keep this raw, fast, and messy only at capture time.
        - Process useful items into permanent notes within 48 hours.
        - Add source links immediately if the item came from the web.

        ## Queue
        - [ ] 

        ## Processed Links
        ```dataview
        LIST
        FROM ""
        WHERE contains(file.outlinks, this.file.link)
        SORT file.mtime DESC
        LIMIT 20
        ```


        ## Intelligence Links
        - Home: [[🧠 B.R.A.C.E Master Dashboard]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
