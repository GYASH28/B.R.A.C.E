<!-- BRACE-GENERATED: v1 -->
---
title: Backup System
type: automation-doc
area: Automation Dashboard
status: evergreen
created: 2026-05-26
updated: 2026-05-26
tags: [brace, automation]
---

        # Backup System


        ## Backup Layers
        - Local vault files.
        - Git history.
        - Private remote repository.
        - Optional Obsidian Sync.
        - Optional encrypted cloud backup.

        ## Exclude From Git
        Add these to `.gitignore` before pushing:
        - `.venv/`
        - `10_AUTOMATION_SYSTEM/state/*.json`
        - `10_AUTOMATION_SYSTEM/logs/*.log`
        - API key files


        ## Intelligence Links
        - Home: [[🧠 B.R.A.C.E Master Dashboard]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
