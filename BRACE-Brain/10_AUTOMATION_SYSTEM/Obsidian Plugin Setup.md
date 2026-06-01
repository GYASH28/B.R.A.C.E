<!-- BRACE-GENERATED: v1 -->
---
title: Plugin Setup Guide
type: setup-guide
area: automation
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [brace, plugins, automation]
---

        # Plugin Setup Guide

        ## Required Community Plugins
        | Plugin | Purpose | Setup |
        |---|---|---|
        | Dataview | Live dashboards and database-style queries | Enable JavaScript only if you understand the risk. Refresh dashboards after install. |
        | Templater | Advanced templates | Set template folder to `_TEMPLATES`. |
        | Periodic Notes | Daily/weekly/monthly notes | Daily: `Journal`; weekly/monthly can use `Journal/Reviews`. |
        | Calendar | Daily note calendar | Link with Periodic Notes. |
        | Tasks | Better task queries | Use due dates and priorities in Markdown tasks. |
        | Kanban | Project boards | Use for LERNIO, B.R.A.C.E, and study boards. |
        | Excalidraw | Diagrams | Use for study diagrams and architecture maps. |
        | Omnisearch | Fast search | Index all vault files. |
        | Advanced Tables | Cleaner Markdown tables | Enable table formatting shortcuts. |
        | Tag Wrangler | Rename/manage tags | Keep taxonomy clean. |
        | Outliner | Better nested lists | Useful for study notes. |
        | QuickAdd | Capture commands | Add quick capture, project note, study note macros. |
        | Readwise Official or alternative | Highlights import | Import only useful highlights. |
        | RSS Reader plugin | Manual feed reading | Optional if Python/n8n handles feeds. |
        | Obsidian Git | Backup/sync | Use after Git is initialized. |
        | Iconize | Folder/file icons | Optional; use carefully. |
        | Homepage | Open master dashboard on launch | Set homepage to `00_HOME/🧠 B.R.A.C.E Master Dashboard.md`. |
        | Commander | Toolbar commands | Add buttons for daily note, quick capture, update logs. |
        | Local REST API | External automation | Optional; protect API token. |
        | Copilot / Smart Connections | AI semantic search | Use your own API key; do not index private content to unknown services. |

        ## Theme Recommendation
        - Use a dark theme such as **Minimal**, **Things**, **AnuPpuccin**, or **Catppuccin**.
        - Enable the CSS snippet `brace-dashboard.css`.
        - Keep dashboards functional, not decorative.

        ## QuickAdd Macro Ideas
        | Macro | Template | Target Folder |
        |---|---|---|
        | New AI News | AI News Template | `02_AI_UNIVERSE/Updates` |
        | New CWIT Update | CWIT Update Template | `04_CWIT_COLLEGE_PUNE/Updates` |
        | New Study Note | Study Note Template | `05_STUDIES` |
        | New Project | Project Note Template | `06_PROJECTS` |
        | New Research Source | Research Source Template | `09_RESEARCH_DATABASE` |
