<!-- BRACE-GENERATED: v1 -->
---
title: GitHub Sync
type: automation-doc
area: Automation Dashboard
status: evergreen
created: 2026-05-26
updated: 2026-05-26
tags: [brace, automation]
---

        # GitHub Sync


        ## Recommended Backup Flow
        1. Initialize Git in the vault.
        2. Create a private GitHub repository.
        3. Add the remote.
        4. Install Obsidian Git.
        5. Set auto-commit interval after testing.

        ## Suggested Commands
        ```powershell
        git init
        git add .
        git commit -m "Initialize B.R.A.C.E Knowledge Brain"
        git remote add origin <your-private-repo-url>
        git push -u origin main
        ```

        ## Safety
        Keep API keys out of the vault. Use environment variables.


        ## Intelligence Links
        - Home: [[🧠 B.R.A.C.E Master Dashboard]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
