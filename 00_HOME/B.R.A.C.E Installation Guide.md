<!-- BRACE-GENERATED: v1 -->
---
title: B.R.A.C.E Installation Guide
type: setup-guide
area: automation
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [brace, setup, automation]
---

        # B.R.A.C.E Installation Guide

        ## 1. Open Vault
        Open this folder in Obsidian:
        `C:/Users/Admin/Documents/BRACE-Brain`

        ## 2. Install Plugins
        Follow [[Plugin Setup Guide]].

        ## 3. Enable CSS Snippet
        In Obsidian:
        `Settings -> Appearance -> CSS snippets -> brace-dashboard.css`

        ## 4. Install Python Dependencies
        ```powershell
        cd "C:/Users/Admin/Documents/BRACE-Brain"
        python -m venv .venv
        ./.venv/Scripts/Activate.ps1
        pip install -r "10_AUTOMATION_SYSTEM/scripts/requirements.txt"
        ```

        ## 5. Test Updater
        ```powershell
        python "10_AUTOMATION_SYSTEM/scripts/brace_updater.py" --once
        ```

        ## 6. Optional Scheduled Task
        Only after the manual test works:
        ```powershell
        powershell -ExecutionPolicy Bypass -File "10_AUTOMATION_SYSTEM/scripts/install_windows_task.ps1"
        ```

        ## 7. Git Backup
        Follow [[GitHub Sync]].

        ## 8. Validate
        Open [[✅ Final System Checklist]] and tick items as you confirm them.
