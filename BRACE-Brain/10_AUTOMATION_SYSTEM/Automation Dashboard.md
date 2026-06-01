<!-- BRACE-GENERATED: v1 -->
---
title: Automation Dashboard
type: dashboard
area: automation
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [automation, dashboard, brace]
---

        # Automation Dashboard

        ## Systems
        - [[RSS Feed Sources]]
        - [[News Update System]]
        - [[AI Update System]]
        - [[CWIT Update System]]
        - [[Python Automation Scripts]]
        - [[n8n Workflows]]
        - [[GitHub Sync]]
        - [[Backup System]]
        - [[Update Logs]]

        ## Runbook
        1. Install dependencies from [[B.R.A.C.E Installation Guide]].
        2. Review `10_AUTOMATION_SYSTEM/config/sources.json`.
        3. Run `python 10_AUTOMATION_SYSTEM/scripts/brace_updater.py --once`.
        4. Check [[Update Logs]].
        5. Only after successful test, install the Windows scheduled task.

        ## Automation Health
        ```dataview
        TABLE status, updated
        FROM "10_AUTOMATION_SYSTEM"
        WHERE type = "automation-doc"
        SORT updated DESC
        ```
