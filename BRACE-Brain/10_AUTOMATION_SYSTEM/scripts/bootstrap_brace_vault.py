from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from textwrap import dedent


VAULT = Path(__file__).resolve().parents[2]
TODAY = date.today().isoformat()
MARKER = "<!-- BRACE-GENERATED: v1 -->"


def clean(text: str) -> str:
    return dedent(text).strip() + "\n"


def write(path: str, content: str, overwrite: bool = True) -> None:
    target = VAULT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    body = content
    if target.suffix.lower() == ".md" and not content.startswith(MARKER):
        body = f"{MARKER}\n{content}"
    if target.exists() and not overwrite:
        return
    if target.exists():
        old = target.read_text(encoding="utf-8", errors="ignore")
        if MARKER not in old and not overwrite:
            return
    target.write_text(body, encoding="utf-8")


def write_json(path: str, data: object, overwrite: bool = True) -> None:
    target = VAULT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and not overwrite:
        return
    target.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def frontmatter(**fields: object) -> str:
    lines = ["---"]
    for key, value in fields.items():
        if isinstance(value, list):
            values = ", ".join(str(v) for v in value)
            lines.append(f"{key}: [{values}]")
        elif isinstance(value, bool):
            lines.append(f"{key}: {str(value).lower()}")
        elif value is None:
            lines.append(f"{key}:")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    return "\n".join(lines)


def note(title: str, note_type: str, area: str, tags: list[str], body: str, status: str = "evergreen") -> str:
    return clean(
        f"""
        {frontmatter(title=title, type=note_type, area=area, status=status, created=TODAY, updated=TODAY, tags=tags)}

        # {title}

        {body}

        ## Intelligence Links
        - Home: [[🧠 B.R.A.C.E Master Dashboard]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
        """
    )


def placeholder_body(topic: str, area: str) -> str:
    return f"""
    > [!info] Purpose
    > This note is a structured knowledge hub for **{topic}** inside the B.R.A.C.E brain.

    ## Core Summary
    - Capture verified facts, concepts, examples, links, and decisions here.
    - Use simple English first. Add Hinglish explanation only when it helps memory.
    - Connect this note to projects, studies, source notes, and dashboards.

    ## Active Questions
    - [ ] What do I need to understand next about {topic}?
    - [ ] Which reliable sources should be attached?
    - [ ] Which project or exam topic depends on this?

    ## Source Log
    | Source | Type | Reliability | Retrieved | Notes |
    |---|---|---:|---|---|
    |  |  |  |  |  |

    ## Related
    - Area: [[{area}]]
    - Sources: [[Source Database]]
    - Tasks: [[🔥 Today's Command Center]]
    """


def dataview_help() -> str:
    return """
    > [!tip] Dataview
    > Install and enable the Dataview plugin for these dashboard sections to become live tables.
    """


def create_directories() -> None:
    directories = [
        "00_HOME",
        "01_INBOX",
        "02_AI_UNIVERSE/Updates",
        "02_AI_UNIVERSE/Examples",
        "03_WORLD_INTELLIGENCE/Updates",
        "03_WORLD_INTELLIGENCE/Digests",
        "04_CWIT_COLLEGE_PUNE/Updates",
        "04_CWIT_COLLEGE_PUNE/Official Snapshots",
        "05_STUDIES/Examples",
        "06_PROJECTS",
        "07_CODING_AND_TECH",
        "08_PERSONAL_GROWTH",
        "09_RESEARCH_DATABASE/Examples",
        "10_AUTOMATION_SYSTEM/scripts",
        "10_AUTOMATION_SYSTEM/config",
        "10_AUTOMATION_SYSTEM/state",
        "10_AUTOMATION_SYSTEM/logs",
        "10_AUTOMATION_SYSTEM/n8n_workflows",
        "11_ARCHIVE",
        "_TEMPLATES",
        "_ATTACHMENTS",
        "_SYSTEM",
        "Journal",
        ".obsidian/snippets",
    ]
    for directory in directories:
        (VAULT / directory).mkdir(parents=True, exist_ok=True)


def create_home() -> None:
    master = clean(
        f"""
        {frontmatter(title="B.R.A.C.E Master Dashboard", type="dashboard", area="home", status="active", created=TODAY, updated=TODAY, tags=["brace", "dashboard", "home"])}

        # 🧠 B.R.A.C.E Master Dashboard

        > [!quote] Operating Principle
        > B.R.A.C.E is the command layer for learning, research, projects, college, and future planning. It stores only what is useful, sourced, connected, and reviewable.

        ## Command Strip
        - Today: [[🔥 Today's Command Center]]
        - Start: [[🚀 Start Here]]
        - Navigation: [[🗺️ Vault Navigation Map]]
        - Rules: [[🧩 System Rules]]
        - Quick Capture: [[Quick Capture]]
        - Review: [[Weekly Review Template]]

        ## Priority Panels

        ```dataview
        TABLE status, priority, deadline
        FROM "06_PROJECTS"
        WHERE type = "project" AND status != "completed"
        SORT priority DESC, deadline ASC
        LIMIT 8
        ```

        ```dataview
        TASK
        FROM "04_CWIT_COLLEGE_PUNE" OR "05_STUDIES" OR "06_PROJECTS"
        WHERE !completed
        GROUP BY file.folder
        ```

        ## Latest Intelligence

        ```dataview
        TABLE date, source, reliability, category
        FROM "02_AI_UNIVERSE/Updates"
        WHERE type = "ai-news"
        SORT date DESC
        LIMIT 7
        ```

        ```dataview
        TABLE date, source, reliability, category
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE type = "world-update"
        SORT date DESC
        LIMIT 7
        ```

        ```dataview
        TABLE retrieved, official, category, action_required
        FROM "04_CWIT_COLLEGE_PUNE/Updates"
        WHERE type = "cwit-update"
        SORT retrieved DESC
        LIMIT 7
        ```

        ## Study Radar

        ```dataview
        TABLE semester, difficulty, status
        FROM "05_STUDIES"
        WHERE type = "study-note"
        SORT difficulty DESC, file.name ASC
        ```

        ## Open Questions

        ```dataview
        TASK
        WHERE !completed AND contains(text, "?")
        LIMIT 12
        ```

        ## System Health

        ```dataview
        TABLE file.folder, created, updated
        FROM ""
        WHERE !tags
        SORT file.mtime DESC
        LIMIT 15
        ```

        ```dataview
        TABLE source, reliability, retrieved
        FROM "09_RESEARCH_DATABASE" OR "02_AI_UNIVERSE/Updates" OR "03_WORLD_INTELLIGENCE/Updates"
        WHERE reliability <= 2
        SORT retrieved DESC
        LIMIT 20
        ```
        """
    )
    write("00_HOME/🧠 B.R.A.C.E Master Dashboard.md", master)

    start = note(
        "🚀 Start Here",
        "guide",
        "home",
        ["brace", "onboarding"],
        """
        ## What This Vault Is
        This vault is named **B.R.A.C.E Knowledge Brain**: Brain / Responsive / Autonomous / Cognitive / Engine.

        B.R.A.C.E is designed to work like a personal operating system:
        - **Brain**: stores knowledge, sources, questions, decisions, and lessons.
        - **Responsive**: uses dashboards and Dataview to surface what matters now.
        - **Autonomous**: can pull RSS/news/official pages through scripts or n8n.
        - **Cognitive**: links topics, projects, college work, and research.
        - **Engine**: turns notes into actions, roadmaps, reviews, and outputs.

        ## Daily Use
        1. Open [[🔥 Today's Command Center]].
        2. Capture raw inputs in [[Quick Capture]] or the correct inbox note.
        3. Convert useful inputs into sourced notes using templates from [[Templates Index]].
        4. Review active tasks from the master dashboard.
        5. Run the updater from [[Automation Dashboard]] when you want fresh intelligence.

        ## Golden Rules
        - Never trust unsourced claims.
        - Never fake current events or college notices.
        - Mark weak sources clearly.
        - Link every important note to at least one dashboard, project, subject, or MOC.
        - Keep student-friendly explanations: simple English first, exam points second, deep theory third.
        """,
    )
    write("00_HOME/🚀 Start Here.md", start)

    nav = clean(
        f"""
        {frontmatter(title="Vault Navigation Map", type="moc", area="home", status="active", created=TODAY, updated=TODAY, tags=["brace", "moc", "navigation"])}

        # 🗺️ Vault Navigation Map

        ## Core
        - [[🧠 B.R.A.C.E Master Dashboard]]
        - [[🚀 Start Here]]
        - [[🔥 Today's Command Center]]
        - [[📌 Important Links]]
        - [[🧩 System Rules]]

        ## Knowledge Domains
        - [[AI Master Dashboard]]
        - [[World Intelligence Dashboard]]
        - [[CWIT Master Dashboard]]
        - [[Study Dashboard]]
        - [[Projects Dashboard]]
        - [[Coding Dashboard]]
        - [[Personal Dashboard]]
        - [[Research Dashboard]]
        - [[Automation Dashboard]]

        ## Inbox Flow
        - [[Quick Capture]]
        - [[Articles To Process]]
        - [[Videos To Watch]]
        - [[PDFs To Read]]
        - [[Research Inbox]]

        ## System Files
        - [[Templates Index]]
        - [[Plugin Setup Guide]]
        - [[Dataview Queries]]
        - [[Source Reliability System]]
        - [[B.R.A.C.E Installation Guide]]
        - [[✅ Final System Checklist]]

        ## Folder Map
        | Folder | Role |
        |---|---|
        | `00_HOME` | Command center and navigation |
        | `01_INBOX` | Raw capture before processing |
        | `02_AI_UNIVERSE` | AI knowledge, tools, agents, research |
        | `03_WORLD_INTELLIGENCE` | News, current events, timelines |
        | `04_CWIT_COLLEGE_PUNE` | College dashboard, official info, notices |
        | `05_STUDIES` | Diploma subjects, exam prep, assignments |
        | `06_PROJECTS` | B.R.A.C.E, LERNIO, websites, tools |
        | `07_CODING_AND_TECH` | Programming, web, cloud, cybersecurity, IoT |
        | `08_PERSONAL_GROWTH` | English, habits, fitness, career |
        | `09_RESEARCH_DATABASE` | Source library, citations, deep research |
        | `10_AUTOMATION_SYSTEM` | Scripts, n8n plan, plugin setup, logs |
        | `11_ARCHIVE` | Old or deprecated material |
        | `_TEMPLATES` | Obsidian note templates |
        """
    )
    write("00_HOME/🗺️ Vault Navigation Map.md", nav)

    today = clean(
        f"""
        {frontmatter(title="Today's Command Center", type="dashboard", area="home", status="active", created=TODAY, updated=TODAY, tags=["brace", "daily", "command-center"])}

        # 🔥 Today's Command Center

        ## Today's Focus
        - [ ] One study win:
        - [ ] One project win:
        - [ ] One health/personal win:

        ## Quick Links
        - Daily note folder: [[Journal]]
        - Quick capture: [[Quick Capture]]
        - Assignments: [[Assignment Tracker]]
        - Projects: [[Projects Dashboard]]
        - CWIT: [[CWIT Master Dashboard]]

        ## Pending Tasks

        ```dataview
        TASK
        FROM ""
        WHERE !completed
        SORT due ASC
        LIMIT 25
        ```

        ## Notes Captured Today

        ```dataview
        LIST
        FROM ""
        WHERE file.cday = date(today)
        SORT file.ctime DESC
        LIMIT 20
        ```

        ## Latest Updates To Review

        ```dataview
        TABLE type, source, reliability, retrieved
        FROM "02_AI_UNIVERSE/Updates" OR "03_WORLD_INTELLIGENCE/Updates" OR "04_CWIT_COLLEGE_PUNE/Updates"
        SORT file.ctime DESC
        LIMIT 10
        ```

        ## Shutdown
        - [ ] Move raw captures to proper folders.
        - [ ] Add sources to any claim that matters.
        - [ ] Choose tomorrow's first task.
        """
    )
    write("00_HOME/🔥 Today's Command Center.md", today)

    important_links = note(
        "📌 Important Links",
        "index",
        "home",
        ["brace", "links"],
        """
        ## Official College Links
        | Name | URL | Reliability |
        |---|---|---:|
        | CWIT Official Website | https://cwit.mespune.org/ | 5/5 |
        | CWIT Contact Page | https://cwit.mespune.org/contact-us/ | 5/5 |
        | CWIT About Page | https://cwit.mespune.org/about-us/ | 5/5 |
        | DTE Maharashtra | https://dtemaharashtra.gov.in/ | 5/5 |
        | MSBTE | https://msbte.org.in/ | 5/5 |
        | AICTE | https://www.aicte-india.org/ | 5/5 |

        ## AI and Tech
        | Name | URL | Reliability |
        |---|---|---:|
        | OpenAI News | https://openai.com/news/ | 4/5 |
        | Google AI Blog | https://blog.google/technology/ai/ | 4/5 |
        | Anthropic News | https://www.anthropic.com/news | 4/5 |
        | Google DeepMind Blog | https://deepmind.google/discover/blog/ | 4/5 |
        | arXiv CS.AI | https://arxiv.org/list/cs.AI/recent | 5/5 for papers |

        ## Personal System
        - [[Source Database]]
        - [[Citation Database]]
        - [[Trusted Sources]]
        - [[RSS Feed Sources]]
        - [[Backup System]]
        """,
    )
    write("00_HOME/📌 Important Links.md", important_links)

    rules = note(
        "🧩 System Rules",
        "operating-rules",
        "home",
        ["brace", "rules", "automation"],
        """
        ## Non-Negotiables
        - Do not create fake news, fake CWIT notices, or unsourced claims.
        - If a source fails, write: **Update not verified. Source unavailable.**
        - Every current event note must include source URL, published date, retrieved date, summary, key points, why it matters, reliability score, related notes, and tags.
        - CWIT updates must prioritize official sources: CWIT website, official PDFs, MSBTE, DTE Maharashtra, AICTE, official notices.
        - Unverified social posts are allowed only when marked `#source/unverified` and reliability `1` or `2`.

        ## Note Quality Standard
        A useful B.R.A.C.E note should answer:
        - What is this?
        - Why does it matter?
        - Where did it come from?
        - What should I do next?
        - Which notes does it connect to?

        ## Explanation Style
        - Simple English first.
        - Indian English style for practical college/study explanations.
        - Hinglish optional only as a memory aid.
        - Exam-friendly points when the note is for studies.
        - Project action points when the note affects a build.

        ## Processing Pipeline
        `Inbox -> Source Check -> Template Note -> Links/Tags -> Dashboard -> Review -> Archive`
        """,
    )
    write("00_HOME/🧩 System Rules.md", rules)

    checklist = note(
        "✅ Final System Checklist",
        "checklist",
        "home",
        ["brace", "setup", "review"],
        """
        ## Vault Structure
        - [ ] Required folders exist from `00_HOME` to `11_ARCHIVE`.
        - [ ] `_TEMPLATES` is selected in Obsidian Templates settings.
        - [ ] Daily notes save into `Journal`.
        - [ ] Dashboards open without missing links.

        ## Plugins
        - [ ] Dataview installed and enabled.
        - [ ] Templater installed and folder set to `_TEMPLATES`.
        - [ ] Tasks, Calendar, Periodic Notes, Kanban, QuickAdd, Omnisearch installed.
        - [ ] Obsidian Git configured after a Git repo is initialized.
        - [ ] Smart Connections or Copilot configured only with your chosen AI key.

        ## Automation
        - [ ] Python virtual environment created.
        - [ ] `requirements.txt` installed.
        - [ ] `brace_updater.py --once` runs successfully.
        - [ ] Source failures log without fake summaries.
        - [ ] Windows Task Scheduler task created only after manual test.

        ## CWIT Safety
        - [ ] CWIT official pages are monitored.
        - [ ] MSBTE, DTE, and AICTE links are present.
        - [ ] Every CWIT update includes `official: true/false`.

        ## Backup
        - [ ] Git initialized.
        - [ ] Private remote added if you want cloud backup.
        - [ ] Obsidian Git or manual Git sync tested.
        """,
    )
    write("00_HOME/✅ Final System Checklist.md", checklist)


def create_inbox() -> None:
    inbox_files = [
        "Quick Capture",
        "Raw Ideas",
        "Articles To Process",
        "Videos To Watch",
        "PDFs To Read",
        "Random Thoughts",
        "Voice Notes Transcripts",
    ]
    for name in inbox_files:
        body = f"""
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
        """
        write(f"01_INBOX/{name}.md", note(name, "inbox", "inbox", ["brace", "inbox"], body))


def create_ai_universe() -> None:
    dashboard = clean(
        f"""
        {frontmatter(title="AI Master Dashboard", type="dashboard", area="ai", status="active", created=TODAY, updated=TODAY, tags=["ai", "dashboard", "brace"])}

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
        """
    )
    write("02_AI_UNIVERSE/AI Master Dashboard.md", dashboard)

    files = [
        "Artificial Intelligence Overview",
        "Machine Learning",
        "Deep Learning",
        "Neural Networks",
        "Generative AI",
        "LLMs",
        "AI Agents",
        "Voice Agents",
        "AI Automation",
        "Prompt Engineering",
        "OpenAI",
        "Google Gemini",
        "Anthropic Claude",
        "Perplexity",
        "ElevenLabs Alternatives",
        "Google Cloud TTS",
        "Open Source AI Models",
        "Local AI Models",
        "AI News Tracker",
        "AI Tools Database",
        "AI Research Papers",
        "AI Ethics and Safety",
        "Future of AI",
    ]
    for name in files:
        extra = ""
        if name == "AI Tools Database":
            extra = """
            ## Tool Table
            | Tool | Category | Use Case | Pricing | Privacy Notes | Rating |
            |---|---|---|---|---|---:|
            |  |  |  |  |  |  |
            """
        if name == "AI News Tracker":
            extra = """
            ## Latest Auto-Captured AI Notes
            ```dataview
            TABLE date, source, reliability
            FROM "02_AI_UNIVERSE/Updates"
            SORT date DESC
            LIMIT 30
            ```
            """
        write(
            f"02_AI_UNIVERSE/{name}.md",
            note(name, "knowledge-note", "AI Master Dashboard", ["brace", "ai"], placeholder_body(name, "AI Master Dashboard") + extra),
        )

    example = clean(
        f"""
        {frontmatter(title="EXAMPLE - AI News Note", type="ai-news", area="ai", date=TODAY, source="https://example.com/official-ai-source", published=TODAY, retrieved=TODAY, category="ai/news", reliability=4, tags=["ai", "ai/news", "source/official"])}

        # EXAMPLE - AI News Note

        > [!warning] Example
        > This is a format example, not a real current event.

        ## Summary
        Replace this with a verified summary from the source.

        ## Key Points
        - Point 1
        - Point 2

        ## Why It Matters
        Explain how this affects learning, tools, projects, or society.

        ## Tools / Companies Mentioned
        - 

        ## Possible Impact
        - Study:
        - Project:
        - Career:

        ## Related Notes
        - [[AI News Tracker]]
        - [[AI Master Dashboard]]

        ## My Thoughts
        - 
        """
    )
    write("02_AI_UNIVERSE/Examples/EXAMPLE - AI News Note.md", example)


def create_world() -> None:
    dashboard = clean(
        f"""
        {frontmatter(title="World Intelligence Dashboard", type="dashboard", area="world", status="active", created=TODAY, updated=TODAY, tags=["world", "dashboard", "brace"])}

        # World Intelligence Dashboard

        ## Intelligence Streams
        - [[Global News]]
        - [[India News]]
        - [[Maharashtra News]]
        - [[Pune News]]
        - [[Technology News]]
        - [[Economy and Business]]
        - [[Geopolitics]]
        - [[Climate and Environment]]
        - [[Science Updates]]
        - [[Space Updates]]

        ## Latest World Updates
        ```dataview
        TABLE date, category, source, reliability
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE type = "world-update"
        SORT date DESC
        LIMIT 20
        ```

        ## India / Pune Focus
        ```dataview
        TABLE date, category, source, reliability
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE contains(tags, "india") OR contains(tags, "pune") OR contains(tags, "maharashtra")
        SORT date DESC
        LIMIT 15
        ```

        ## Timeline
        - [[Important Events Timeline]]
        - [[Weekly World Summary]]
        - [[Monthly World Summary]]

        ## Low Reliability Watchlist
        ```dataview
        TABLE source, reliability, retrieved
        FROM "03_WORLD_INTELLIGENCE"
        WHERE reliability <= 2
        SORT retrieved DESC
        ```
        """
    )
    write("03_WORLD_INTELLIGENCE/World Intelligence Dashboard.md", dashboard)

    files = [
        "Global News",
        "India News",
        "Maharashtra News",
        "Pune News",
        "Technology News",
        "Economy and Business",
        "Geopolitics",
        "Climate and Environment",
        "Science Updates",
        "Space Updates",
        "Important Events Timeline",
        "Weekly World Summary",
        "Monthly World Summary",
    ]
    for name in files:
        extra = ""
        if "Summary" in name:
            extra = """
            ## Digest Structure
            - Top 5 events
            - India/Pune relevance
            - Technology relevance
            - What to track next
            """
        if name == "Important Events Timeline":
            extra = """
            ## Timeline
            | Date | Event | Source | Reliability | Related |
            |---|---|---|---:|---|
            |  |  |  |  |  |
            """
        write(
            f"03_WORLD_INTELLIGENCE/{name}.md",
            note(name, "knowledge-note", "World Intelligence Dashboard", ["brace", "world"], placeholder_body(name, "World Intelligence Dashboard") + extra),
        )


def create_cwit() -> None:
    dashboard = clean(
        f"""
        {frontmatter(title="CWIT Master Dashboard", type="dashboard", area="cwit", status="active", created=TODAY, updated=TODAY, tags=["cwit", "dashboard", "study/cwit"])}

        # CWIT Master Dashboard

        ## Official Links
        | Link | URL | Priority |
        |---|---|---|
        | Official Website | https://cwit.mespune.org/ | Highest |
        | Contact Page | https://cwit.mespune.org/contact-us/ | Highest |
        | About Page | https://cwit.mespune.org/about-us/ | Highest |
        | MSBTE | https://msbte.org.in/ | Highest |
        | DTE Maharashtra | https://dtemaharashtra.gov.in/ | Highest |
        | AICTE | https://www.aicte-india.org/ | Highest |

        ## Institute Snapshot
        - Full name: **Modern Education Society's Cusrow Wadia Institute of Technology, Pune**
        - Location: **Wadia College Campus, 19, Bund Garden Road, Pune-411001**
        - Contact: **020-26164814**
        - Email: **cwitpune1@gmail.com**
        - Type: **Polytechnic / diploma engineering institute**
        - Started by: **Modern Education Society, Pune**
        - Beginning: **1938**

        ## Latest Notices
        ```dataview
        TABLE retrieved, category, official, action_required, source
        FROM "04_CWIT_COLLEGE_PUNE/Updates"
        WHERE type = "cwit-update"
        SORT retrieved DESC
        LIMIT 20
        ```

        ## Exam / Timetable / Syllabus
        - [[CWIT Examination Section]]
        - [[CWIT Timetable]]
        - [[CWIT Syllabus]]
        - [[CWIT Subjects]]

        ## Trackers
        - [[CWIT Notices Tracker]]
        - [[CWIT Admission Info]]
        - [[CWIT Placements]]
        - [[CWIT Student Corner]]
        - [[CWIT Questions To Ask Seniors]]

        ## Questions To Ask
        ```dataview
        TASK
        FROM "04_CWIT_COLLEGE_PUNE"
        WHERE !completed AND contains(text, "?")
        LIMIT 20
        ```
        """
    )
    write("04_CWIT_COLLEGE_PUNE/CWIT Master Dashboard.md", dashboard)

    official_info = clean(
        f"""
        {frontmatter(title="CWIT Official Information", type="source-backed-note", area="cwit", status="verified-basics", created=TODAY, updated=TODAY, source="https://cwit.mespune.org/", reliability=5, tags=["cwit", "source/official", "study/cwit"])}

        # CWIT Official Information

        ## Verified Basic Details
        | Field | Detail | Source |
        |---|---|---|
        | Full name | Modern Education Society's Cusrow Wadia Institute of Technology, Pune | Official CWIT site |
        | Address | Wadia College Campus, 19, Bund Garden Road, Pune-411001 | CWIT contact/about pages |
        | Contact | 020-26164814 | CWIT contact page |
        | Email | cwitpune1@gmail.com | CWIT contact page |
        | Type | Polytechnic / diploma engineering institute | CWIT about page |
        | Started by | Modern Education Society, Pune | CWIT about page |
        | Began | 1938 | CWIT about page |

        ## Official Source Priority
        1. CWIT official website and official PDFs.
        2. CWIT contact/admission/department/exam/student-corner/placement pages.
        3. MSBTE, DTE Maharashtra, AICTE.
        4. Trusted news or education portals only when official confirmation is unavailable.
        5. Social media/forum posts only as unverified leads.

        ## Monitoring Rule
        If a CWIT page cannot be checked, write exactly:
        **Update not verified. Source unavailable.**

        ## Related
        - [[CWIT Master Dashboard]]
        - [[CWIT Update System]]
        - [[Source Reliability System]]
        """
    )
    write("04_CWIT_COLLEGE_PUNE/CWIT Official Information.md", official_info)

    files = [
        "About CWIT Pune",
        "CWIT Departments",
        "CWIT Computer Engineering and IoT",
        "CWIT Admission Info",
        "CWIT Examination Section",
        "CWIT Faculty and Staff",
        "CWIT Placements",
        "CWIT Library",
        "CWIT Student Corner",
        "CWIT Notices Tracker",
        "CWIT Timetable",
        "CWIT Syllabus",
        "CWIT Subjects",
        "CWIT Important Contacts",
        "CWIT Campus Map and Facilities",
        "CWIT Events",
        "CWIT Fees and Documents",
        "CWIT Useful Links",
        "CWIT Questions To Ask Seniors",
        "CWIT Personal Notes",
    ]
    for name in files:
        extra = ""
        if name == "CWIT Notices Tracker":
            extra = """
            ## Latest Auto-Detected Changes
            ```dataview
            TABLE retrieved, category, official, source
            FROM "04_CWIT_COLLEGE_PUNE/Updates"
            SORT retrieved DESC
            LIMIT 30
            ```
            """
        if name == "CWIT Important Contacts":
            extra = """
            ## Contacts
            | Department | Contact | Email | Source | Reliability |
            |---|---|---|---|---:|
            | Office | 020-26164814 | cwitpune1@gmail.com | CWIT official contact page | 5 |
            """
        write(
            f"04_CWIT_COLLEGE_PUNE/{name}.md",
            note(name, "college-note", "CWIT Master Dashboard", ["brace", "cwit", "study/cwit"], placeholder_body(name, "CWIT Master Dashboard") + extra),
        )

    example = clean(
        f"""
        {frontmatter(title="EXAMPLE - CWIT Official Update", type="cwit-update", area="cwit", date=TODAY, source="https://cwit.mespune.org/", official=True, retrieved=TODAY, category="notice", action_required="review source manually", reliability=5, tags=["cwit", "cwit/notice", "source/official"])}

        # EXAMPLE - CWIT Official Update

        > [!warning] Example
        > This is a format example, not a real notice.

        ## Update Summary
        Page changed or notice found on an official CWIT source. Confirm details before taking action.

        ## Official Source
        - Source URL: https://cwit.mespune.org/

        ## Important Dates
        - Published:
        - Deadline:

        ## Who It Affects
        - Students:
        - Department:

        ## Action Required
        - [ ] Open official source.
        - [ ] Save PDF/screenshot if important.
        - [ ] Add deadline to tasks.

        ## Related Department
        - [[CWIT Computer Engineering and IoT]]

        ## My Notes
        - 
        """
    )
    write("04_CWIT_COLLEGE_PUNE/Updates/EXAMPLE - CWIT Official Update.md", example)


def create_studies() -> None:
    dashboard = clean(
        f"""
        {frontmatter(title="Study Dashboard", type="dashboard", area="studies", status="active", created=TODAY, updated=TODAY, tags=["study", "dashboard", "study/cwit"])}

        # Study Dashboard

        ## Diploma Roadmap
        - [[Diploma Roadmap]]
        - [[Semester 1]]
        - [[Semester 2]]
        - [[Computer Engineering and IoT]]

        ## Subjects
        - [[Programming in C]]
        - [[BEEE]]
        - [[Web Design]]
        - [[Mathematics]]
        - [[Physics]]
        - [[Chemistry]]
        - [[English]]

        ## Subject Progress
        ```dataview
        TABLE semester, unit, difficulty, status
        FROM "05_STUDIES"
        WHERE type = "study-note"
        SORT semester ASC, difficulty DESC
        ```

        ## Assignments and Practical Files
        ```dataview
        TASK
        FROM "05_STUDIES"
        WHERE !completed
        GROUP BY file.link
        ```

        ## Exam Prep
        - [[Exam Preparation]]
        - [[Viva Preparation]]
        - [[Important Questions]]
        - [[MCQs]]
        - [[Study Timetable]]

        ## Weak Topics
        ```dataview
        TABLE subject, unit, difficulty, status
        FROM "05_STUDIES"
        WHERE difficulty >= 4 OR status = "weak"
        SORT difficulty DESC
        ```
        """
    )
    write("05_STUDIES/Study Dashboard.md", dashboard)

    files = [
        "Diploma Roadmap",
        "Semester 1",
        "Semester 2",
        "Computer Engineering and IoT",
        "Programming in C",
        "BEEE",
        "Web Design",
        "Mathematics",
        "Physics",
        "Chemistry",
        "English",
        "Exam Preparation",
        "Viva Preparation",
        "Important Questions",
        "MCQs",
        "Notes From College",
        "Assignment Tracker",
        "Practical File Tracker",
        "Study Timetable",
    ]
    for name in files:
        extra = ""
        if name in {"Assignment Tracker", "Practical File Tracker"}:
            extra = """
            ## Tracker
            | Item | Subject | Due | Status | Link |
            |---|---|---|---|---|
            |  |  |  |  |  |
            """
        write(
            f"05_STUDIES/{name}.md",
            note(name, "study-note", "Study Dashboard", ["brace", "study"], placeholder_body(name, "Study Dashboard") + extra),
        )

    example = clean(
        f"""
        {frontmatter(title="EXAMPLE - Programming in C - Pointers", type="study-note", area="studies", subject="Programming in C", semester=1, unit=0, topic="Pointers", difficulty=4, status="learning", created=TODAY, updated=TODAY, tags=["study", "study/c", "coding"])}

        # EXAMPLE - Programming in C - Pointers

        ## Concept Explanation
        A pointer stores the memory address of another variable.

        ## Simple Explanation
        Think of a variable as a house and a pointer as the address written on paper.

        ## Important Definitions
        - Pointer variable
        - Address operator `&`
        - Dereference operator `*`

        ## Diagrams
        Add Excalidraw or image here.

        ## Formulae
        Not applicable.

        ## Examples
        ```c
        int x = 10;
        int *p = &x;
        printf("%d", *p);
        ```

        ## Viva Questions
        - What is a pointer?
        - Difference between `&` and `*`?

        ## MCQs
        - [ ] Which operator gives address of a variable?

        ## Previous Year Questions
        - 

        ## Revision Summary
        Pointer = address holder. Dereferencing = value at that address.
        """
    )
    write("05_STUDIES/Examples/EXAMPLE - Programming in C - Pointers.md", example)


def create_projects() -> None:
    dashboard = clean(
        f"""
        {frontmatter(title="Projects Dashboard", type="dashboard", area="projects", status="active", created=TODAY, updated=TODAY, tags=["project", "dashboard", "brace"])}

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
        """
    )
    write("06_PROJECTS/Projects Dashboard.md", dashboard)

    project_details = {
        "B.R.A.C.E Project": ("active", 5, "Obsidian, Python, n8n, AI APIs"),
        "LERNIO Project": ("active", 5, "Web app, AI tutor, learning workflows"),
        "Portfolio Website": ("planned", 3, "HTML, CSS, JavaScript, React"),
        "CampusMate": ("idea", 3, "Student assistant, college tools"),
        "AI Voice Agent": ("planned", 4, "STT, TTS, LLM, automation"),
        "n8n Chatbot": ("planned", 4, "n8n, webhooks, AI APIs"),
        "OpenClaw Setup": ("research", 2, "local AI / automation"),
        "Google Cloud TTS Setup": ("research", 3, "Google Cloud TTS"),
        "Firebase Notes": ("reference", 3, "Firebase"),
        "Vercel Notes": ("reference", 3, "Vercel"),
        "Netlify Notes": ("reference", 2, "Netlify"),
        "GitHub Notes": ("reference", 4, "GitHub"),
        "Project Ideas": ("active", 4, "mixed"),
        "Bugs and Fixes": ("active", 4, "debugging"),
        "Feature Roadmap": ("active", 5, "planning"),
    }
    for name, (status, priority, stack) in project_details.items():
        body = f"""
        ## Project Goal
        Define the goal for **{name}**.

        ## Current Status
        Status: **{status}**

        ## Features
        - [ ] Feature idea:

        ## Bugs
        - [ ] Bug:

        ## Improvements
        - [ ] Improvement:

        ## Tech Stack
        {stack}

        ## Important Links
        | Link | URL | Notes |
        |---|---|---|
        |  |  |  |

        ## Next Actions
        - [ ] Decide next useful step.

        ## Roadmap
        | Phase | Outcome | Status |
        |---|---|---|
        | 1 | Define | todo |
        | 2 | Build | todo |
        | 3 | Test | todo |
        """
        content = clean(
            f"""
            {frontmatter(title=name, type="project", area="projects", project=name, status=status, priority=priority, started=TODAY, deadline="", **{"tech-stack": stack}, tags=["project", "brace"])}

            # {name}

            {body}

            ## Related
            - [[Projects Dashboard]]
            - [[Feature Roadmap]]
            """
        )
        write(f"06_PROJECTS/{name}.md", content)


def create_coding_personal_research() -> None:
    coding_dashboard = clean(
        f"""
        {frontmatter(title="Coding Dashboard", type="dashboard", area="coding", status="active", created=TODAY, updated=TODAY, tags=["coding", "dashboard"])}

        # Coding Dashboard

        ## Languages and Tools
        - [[C Language]]
        - [[Python]]
        - [[JavaScript]]
        - [[HTML CSS]]
        - [[React]]
        - [[Node.js]]
        - [[Firebase]]
        - [[APIs]]
        - [[Databases]]
        - [[Git and GitHub]]
        - [[Cybersecurity Basics]]
        - [[IoT]]

        ## Code Snippets
        - [[Useful Code Snippets]]

        ## Coding Tasks
        ```dataview
        TASK
        FROM "07_CODING_AND_TECH" OR "06_PROJECTS"
        WHERE !completed
        LIMIT 25
        ```
        """
    )
    write("07_CODING_AND_TECH/Coding Dashboard.md", coding_dashboard)

    coding_files = [
        "C Language",
        "Python",
        "JavaScript",
        "HTML CSS",
        "React",
        "Node.js",
        "Firebase",
        "APIs",
        "Databases",
        "Git and GitHub",
        "Web Development",
        "App Development",
        "Cybersecurity Basics",
        "IoT",
        "Cloud Computing",
        "Linux Commands",
        "Useful Code Snippets",
    ]
    for name in coding_files:
        write(
            f"07_CODING_AND_TECH/{name}.md",
            note(name, "tech-note", "Coding Dashboard", ["brace", "coding"], placeholder_body(name, "Coding Dashboard")),
        )

    personal_dashboard = clean(
        f"""
        {frontmatter(title="Personal Dashboard", type="dashboard", area="personal-growth", status="active", created=TODAY, updated=TODAY, tags=["personal", "dashboard", "brace"])}

        # Personal Dashboard

        ## Growth Areas
        - [[English Fluency]]
        - [[Indian English Practice]]
        - [[Vocabulary Bank]]
        - [[Speaking Practice]]
        - [[Confidence Building]]
        - [[Fitness]]
        - [[Meditation]]
        - [[Daily Routine]]
        - [[Habits]]
        - [[Goals]]
        - [[Career Planning]]
        - [[Financial Learning]]

        ## Habits
        ```dataview
        TASK
        FROM "08_PERSONAL_GROWTH"
        WHERE !completed
        LIMIT 30
        ```
        """
    )
    write("08_PERSONAL_GROWTH/Personal Dashboard.md", personal_dashboard)

    personal_files = [
        "English Fluency",
        "Indian English Practice",
        "Vocabulary Bank",
        "Speaking Practice",
        "Confidence Building",
        "Fitness",
        "Meditation",
        "Daily Routine",
        "Habits",
        "Goals",
        "Career Planning",
        "Financial Learning",
    ]
    for name in personal_files:
        write(
            f"08_PERSONAL_GROWTH/{name}.md",
            note(name, "growth-note", "Personal Dashboard", ["brace", "personal"], placeholder_body(name, "Personal Dashboard")),
        )

    research_dashboard = clean(
        f"""
        {frontmatter(title="Research Dashboard", type="dashboard", area="research", status="active", created=TODAY, updated=TODAY, tags=["research", "dashboard", "brace"])}

        # Research Dashboard

        ## Research Areas
        - [[Research Inbox]]
        - [[Research Papers]]
        - [[Important Articles]]
        - [[YouTube Learning Notes]]
        - [[PDF Summaries]]
        - [[Book Notes]]
        - [[Source Database]]
        - [[Citation Database]]
        - [[Trusted Sources]]
        - [[Question Bank]]
        - [[Deep Research Topics]]

        ## Unprocessed Research Inbox
        ```dataview
        TABLE file.mtime, status, source
        FROM "09_RESEARCH_DATABASE"
        WHERE status = "inbox" OR contains(tags, "inbox")
        SORT file.mtime DESC
        ```

        ## Sources With Low Reliability
        ```dataview
        TABLE source, reliability, topic
        FROM "09_RESEARCH_DATABASE"
        WHERE reliability <= 2
        SORT reliability ASC
        ```

        ## Notes Without Source Links
        ```dataview
        LIST
        FROM "09_RESEARCH_DATABASE" OR "02_AI_UNIVERSE" OR "03_WORLD_INTELLIGENCE"
        WHERE !source AND type != "dashboard"
        LIMIT 50
        ```
        """
    )
    write("09_RESEARCH_DATABASE/Research Dashboard.md", research_dashboard)

    research_files = [
        "Research Inbox",
        "Research Papers",
        "Important Articles",
        "YouTube Learning Notes",
        "PDF Summaries",
        "Book Notes",
        "Source Database",
        "Citation Database",
        "Trusted Sources",
        "Question Bank",
        "Deep Research Topics",
    ]
    for name in research_files:
        extra = ""
        if name == "Source Database":
            extra = """
            ## Source Database
            | Source | URL | Category | Reliability | Notes |
            |---|---|---|---:|---|
            | CWIT Official Website | https://cwit.mespune.org/ | college | 5 | Official |
            | MSBTE | https://msbte.org.in/ | education/government | 5 | Official |
            | DTE Maharashtra | https://dtemaharashtra.gov.in/ | education/government | 5 | Official |
            | AICTE | https://www.aicte-india.org/ | education/government | 5 | Official |
            """
        if name == "Citation Database":
            extra = """
            ## Citation Table
            | Citation Key | Title | Author | Year | URL | Note |
            |---|---|---|---|---|---|
            |  |  |  |  |  |  |
            """
        if name == "Trusted Sources":
            extra = """
            ## Reliability Scale
            - 5/5 = Official source, government, college website, original research paper.
            - 4/5 = Trusted news outlet or verified company blog.
            - 3/5 = Known blog, educational site, YouTube educational source.
            - 2/5 = Social media, forum, unofficial article.
            - 1/5 = Unknown, unverified, rumor.
            """
        write(
            f"09_RESEARCH_DATABASE/{name}.md",
            note(name, "research-note", "Research Dashboard", ["brace", "research"], placeholder_body(name, "Research Dashboard") + extra),
        )


def create_templates() -> None:
    templates = {
        "Daily Note Template.md": f"""
        ---
        date: <% tp.date.now("YYYY-MM-DD") %>
        type: daily-note
        mood:
        energy:
        focus:
        tags: [daily, brace]
        ---
        # Daily Note - <% tp.date.now("dddd, MMMM D, YYYY") %>

        ## Today's Focus
        - 

        ## College Tasks
        - [ ] 

        ## Study Tasks
        - [ ] 

        ## Project Tasks
        - [ ] 

        ## AI Updates
        ```dataview
        TABLE source, reliability, category
        FROM "02_AI_UNIVERSE/Updates"
        WHERE date = date(today)
        SORT file.ctime DESC
        ```

        ## World Updates
        ```dataview
        TABLE source, reliability, category
        FROM "03_WORLD_INTELLIGENCE/Updates"
        WHERE date = date(today)
        SORT file.ctime DESC
        ```

        ## CWIT Updates
        ```dataview
        TABLE source, official, category
        FROM "04_CWIT_COLLEGE_PUNE/Updates"
        WHERE retrieved = date(today)
        SORT file.ctime DESC
        ```

        ## Notes Captured Today
        - 

        ## Questions I Asked
        - 

        ## Things I Learned
        - 

        ## Tomorrow Plan
        - [ ] 
        """,
        "AI News Template.md": """
        ---
        title:
        date:
        source:
        published:
        retrieved:
        category:
        reliability:
        type: ai-news
        tags: [ai, news]
        ---
        # <% tp.file.title %>

        ## Summary

        ## Key Points

        ## Why It Matters

        ## Tools / Companies Mentioned

        ## Possible Impact

        ## Related Notes

        ## My Thoughts
        """,
        "CWIT Update Template.md": """
        ---
        title:
        date:
        source:
        official: true
        retrieved:
        category:
        action_required:
        reliability: 5
        type: cwit-update
        tags: [cwit, college]
        ---
        # <% tp.file.title %>

        ## Update Summary

        ## Official Source

        ## Important Dates

        ## Who It Affects

        ## Action Required

        ## Related Department

        ## My Notes
        """,
        "Study Note Template.md": """
        ---
        subject:
        semester:
        unit:
        topic:
        difficulty:
        status:
        type: study-note
        tags: [study]
        ---
        # <% tp.file.title %>

        ## Concept Explanation

        ## Simple Explanation

        ## Important Definitions

        ## Diagrams

        ## Formulae

        ## Examples

        ## Viva Questions

        ## MCQs

        ## Previous Year Questions

        ## Revision Summary
        """,
        "Project Note Template.md": """
        ---
        project:
        status:
        priority:
        started:
        deadline:
        tech-stack:
        type: project
        tags: [project]
        ---
        # <% tp.file.title %>

        ## Project Goal

        ## Current Status

        ## Features

        ## Bugs

        ## Improvements

        ## Tech Stack

        ## Important Links

        ## Next Actions

        ## Roadmap
        """,
        "Research Source Template.md": """
        ---
        source:
        author:
        published:
        retrieved:
        reliability:
        topic:
        type: research-source
        tags: [research]
        ---
        # <% tp.file.title %>

        ## Summary

        ## Main Claims

        ## Evidence

        ## Useful Quotes

        ## Limitations

        ## Related Notes

        ## Final Understanding
        """,
        "Weekly Review Template.md": """
        ---
        week:
        type: weekly-review
        tags: [review, weekly, brace]
        ---
        # Weekly Review - <% tp.date.now("YYYY-[W]WW") %>

        ## Wins

        ## College Progress

        ## Study Progress

        ## Project Progress

        ## AI / Tech Lessons

        ## World Intelligence Summary

        ## Open Loops
        ```dataview
        TASK
        WHERE !completed
        LIMIT 50
        ```

        ## Next Week Focus
        - [ ] 
        """,
        "Monthly Review Template.md": """
        ---
        month:
        type: monthly-review
        tags: [review, monthly, brace]
        ---
        # Monthly Review - <% tp.date.now("MMMM YYYY") %>

        ## Month Summary

        ## Best Learning

        ## Projects Moved Forward

        ## College / Exam Status

        ## Health / Routine

        ## Career Direction

        ## Next Month Roadmap
        - [ ] 
        """,
    }
    for filename, content in templates.items():
        write(f"_TEMPLATES/{filename}", clean(content))

    index = note(
        "Templates Index",
        "index",
        "system",
        ["brace", "templates"],
        """
        ## Core Templates
        - [[Daily Note Template]]
        - [[AI News Template]]
        - [[CWIT Update Template]]
        - [[Study Note Template]]
        - [[Project Note Template]]
        - [[Research Source Template]]
        - [[Weekly Review Template]]
        - [[Monthly Review Template]]

        ## Suggested Use
        - Daily notes: use every morning.
        - AI/CWIT/world updates: created by updater or manually from templates.
        - Study notes: one concept per note when possible.
        - Research source notes: one source per note.
        """,
    )
    write("_TEMPLATES/Templates Index.md", index)


def create_automation_docs() -> None:
    dashboard = clean(
        f"""
        {frontmatter(title="Automation Dashboard", type="dashboard", area="automation", status="active", created=TODAY, updated=TODAY, tags=["automation", "dashboard", "brace"])}

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
        """
    )
    write("10_AUTOMATION_SYSTEM/Automation Dashboard.md", dashboard)

    source_reliability = note(
        "Source Reliability System",
        "automation-doc",
        "Automation Dashboard",
        ["brace", "source/official", "research"],
        """
        ## Reliability Scale
        | Score | Meaning | Examples |
        |---:|---|---|
        | 5/5 | Official source, government, college website, original research paper | CWIT, MSBTE, DTE, AICTE, arXiv paper |
        | 4/5 | Trusted news outlet or verified company blog | Official company blogs, established news |
        | 3/5 | Known blog, educational site, YouTube educational source | Tutorials, educational channels |
        | 2/5 | Social media, forum, unofficial article | Reddit, X posts, forum claims |
        | 1/5 | Unknown, unverified, rumor | No clear source |

        ## CWIT Rule
        CWIT data gets `5/5` only when it comes from:
        - CWIT official website or PDF.
        - MSBTE.
        - DTE Maharashtra.
        - AICTE.
        - Official college notices.

        ## Current Event Required Fields
        - Source URL
        - Published date
        - Retrieved date
        - Summary
        - Key points
        - Why it matters
        - Reliability score
        - Related notes
        - Tags
        """,
    )
    write("10_AUTOMATION_SYSTEM/Source Reliability System.md", source_reliability)

    docs = {
        "RSS Feed Sources": """
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
        """,
        "News Update System": """
        ## Flow
        `RSS sources -> duplicate check -> markdown note -> daily digest -> weekly/monthly digest`

        ## Required Metadata
        - `type: world-update`
        - `source`
        - `published`
        - `retrieved`
        - `reliability`
        - `category`
        - `tags`

        ## Human Review
        Read the original source before using a news item in an assignment, project, or serious decision.
        """,
        "AI Update System": """
        ## Flow
        `AI RSS/company blogs/research feeds -> updates folder -> AI dashboard`

        ## Trusted AI Source Types
        - Official company blog.
        - Research paper.
        - Trusted technology publication.
        - Product documentation.

        ## Never Do
        - Do not summarize a broken link.
        - Do not treat a social media rumor as confirmed.
        """,
        "CWIT Update System": """
        ## Official Pages To Monitor
        - CWIT home page: https://cwit.mespune.org/
        - Contact page: https://cwit.mespune.org/contact-us/
        - About page: https://cwit.mespune.org/about-us/
        - Examination section from official site navigation.
        - Admission page / official PDFs from official site.
        - Students' Corner from official site navigation.
        - Placements from official site navigation.
        - MSBTE: https://msbte.org.in/
        - DTE Maharashtra: https://dtemaharashtra.gov.in/
        - AICTE: https://www.aicte-india.org/

        ## Monitoring Rule
        The script tracks page hashes. A change creates a note saying a source changed and asks for manual confirmation.

        ## Safety
        If a page cannot be reached, log:
        **Update not verified. Source unavailable.**
        """,
        "Obsidian Plugin Setup": "",
        "Dataview Queries": "",
        "Templater Scripts": """
        ## Useful Templater Ideas
        - Create daily note with mood/energy/focus prompts.
        - Create AI news note from clipboard URL.
        - Create CWIT update note with `official: true`.
        - Create project note with priority and deadline fields.

        ## Template Folder
        Set Templater template folder to `_TEMPLATES`.
        """,
        "Python Automation Scripts": """
        ## Scripts
        - `10_AUTOMATION_SYSTEM/scripts/brace_updater.py`
        - `10_AUTOMATION_SYSTEM/scripts/install_windows_task.ps1`
        - `10_AUTOMATION_SYSTEM/scripts/requirements.txt`

        ## Capabilities
        - Fetch RSS feeds.
        - Save markdown notes into Obsidian.
        - Remove duplicates using a saved seen database.
        - Add YAML properties.
        - Create daily digest.
        - Create weekly/monthly digest when requested.
        - Check CWIT official pages for changes.
        - Save update logs.
        - Run through Windows Task Scheduler.
        - Optional AI summarization if API keys are available later.
        """,
        "n8n Workflows": """
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
        """,
        "GitHub Sync": """
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
        """,
        "Backup System": """
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
        """,
        "Update Logs": """
        ## Update Log Index
        The updater appends logs here:
        - `10_AUTOMATION_SYSTEM/logs/update-log.md`

        ## Recent Generated Updates
        ```dataview
        TABLE type, source, retrieved, reliability
        FROM "02_AI_UNIVERSE/Updates" OR "03_WORLD_INTELLIGENCE/Updates" OR "04_CWIT_COLLEGE_PUNE/Updates"
        SORT file.ctime DESC
        LIMIT 30
        ```
        """,
    }
    for title, body in docs.items():
        if title == "Obsidian Plugin Setup":
            continue
        if title == "Dataview Queries":
            continue
        write(
            f"10_AUTOMATION_SYSTEM/{title}.md",
            note(title, "automation-doc", "Automation Dashboard", ["brace", "automation"], body),
        )

    plugin_setup = clean(
        f"""
        {frontmatter(title="Plugin Setup Guide", type="setup-guide", area="automation", status="active", created=TODAY, updated=TODAY, tags=["brace", "plugins", "automation"])}

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
        """
    )
    write("10_AUTOMATION_SYSTEM/Plugin Setup Guide.md", plugin_setup)
    write("10_AUTOMATION_SYSTEM/Obsidian Plugin Setup.md", plugin_setup)

    dataview_queries = clean(
        f"""
        {frontmatter(title="Dataview Queries", type="query-library", area="automation", status="active", created=TODAY, updated=TODAY, tags=["brace", "dataview", "automation"])}

        # Dataview Queries

        ## Latest Notes
        ```dataview
        TABLE file.folder, file.mtime
        FROM ""
        SORT file.mtime DESC
        LIMIT 20
        ```

        ## Notes Created Today
        ```dataview
        LIST
        FROM ""
        WHERE file.cday = date(today)
        SORT file.ctime DESC
        ```

        ## AI News From Last 7 Days
        ```dataview
        TABLE date, source, reliability
        FROM "02_AI_UNIVERSE/Updates"
        WHERE type = "ai-news" AND date >= date(today) - dur(7 days)
        SORT date DESC
        ```

        ## CWIT Updates From Last 30 Days
        ```dataview
        TABLE retrieved, official, source, action_required
        FROM "04_CWIT_COLLEGE_PUNE/Updates"
        WHERE type = "cwit-update" AND retrieved >= date(today) - dur(30 days)
        SORT retrieved DESC
        ```

        ## Pending Tasks
        ```dataview
        TASK
        FROM ""
        WHERE !completed
        SORT due ASC
        ```

        ## Project Tasks By Priority
        ```dataview
        TASK
        FROM "06_PROJECTS"
        WHERE !completed
        GROUP BY file.frontmatter.priority
        ```

        ## Study Topics By Difficulty
        ```dataview
        TABLE subject, unit, topic, difficulty, status
        FROM "05_STUDIES"
        WHERE type = "study-note"
        SORT difficulty DESC
        ```

        ## Sources With Low Reliability
        ```dataview
        TABLE source, reliability, topic
        FROM ""
        WHERE reliability <= 2
        SORT reliability ASC
        ```

        ## Unprocessed Inbox Notes
        ```dataview
        TABLE file.mtime
        FROM "01_INBOX"
        WHERE status != "processed"
        SORT file.mtime DESC
        ```

        ## Notes Without Tags
        ```dataview
        LIST
        FROM ""
        WHERE !tags
        SORT file.mtime DESC
        ```

        ## Notes Without Source Links
        ```dataview
        LIST
        FROM "02_AI_UNIVERSE" OR "03_WORLD_INTELLIGENCE" OR "04_CWIT_COLLEGE_PUNE" OR "09_RESEARCH_DATABASE"
        WHERE !source AND type != "dashboard"
        SORT file.mtime DESC
        LIMIT 50
        ```
        """
    )
    write("10_AUTOMATION_SYSTEM/Dataview Queries.md", dataview_queries)

    tags_doc = note(
        "Tag Taxonomy",
        "system-doc",
        "Automation Dashboard",
        ["brace", "tags"],
        """
        ## Core Tags
        `#brace`
        `#ai`
        `#ai/news`
        `#ai/tools`
        `#ai/agents`
        `#ai/research`
        `#world`
        `#world/news`
        `#india`
        `#maharashtra`
        `#pune`
        `#cwit`
        `#cwit/notice`
        `#cwit/exam`
        `#cwit/admission`
        `#cwit/placement`
        `#study`
        `#study/cwit`
        `#study/c`
        `#study/beee`
        `#study/webdesign`
        `#coding`
        `#project`
        `#project/brace`
        `#project/lernio`
        `#automation`
        `#research`
        `#source/official`
        `#source/unverified`
        `#todo`
        `#review`
        `#important`

        ## Tag Rules
        - Use broad tag + specific tag when helpful: `#ai` and `#ai/news`.
        - Use `#source/unverified` immediately for weak or unknown sources.
        - Use `#review` for notes that need human checking.
        """,
    )
    write("_SYSTEM/Tag Taxonomy.md", tags_doc)

    install = clean(
        f"""
        {frontmatter(title="B.R.A.C.E Installation Guide", type="setup-guide", area="automation", status="active", created=TODAY, updated=TODAY, tags=["brace", "setup", "automation"])}

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
        """
    )
    write("00_HOME/B.R.A.C.E Installation Guide.md", install)

    review_system = note(
        "Review System",
        "system-doc",
        "Automation Dashboard",
        ["brace", "review"],
        """
        ## Daily Review
        - Open daily note.
        - Move quick captures.
        - Review tasks due today.
        - Add one lesson learned.

        ## Weekly Review
        - Create a weekly note from [[Weekly Review Template]].
        - Review projects, studies, CWIT, AI, world intelligence.
        - Archive stale tasks.

        ## Monthly Review
        - Create a monthly note from [[Monthly Review Template]].
        - Review goals, career direction, skills, and project roadmap.

        ## Automation Digest
        The Python updater can generate daily/weekly/monthly digest notes from captured updates.
        """,
    )
    write("10_AUTOMATION_SYSTEM/Review System.md", review_system)


def create_archive() -> None:
    files = [
        "Old Notes",
        "Completed Projects",
        "Old News",
        "Old Study Material",
        "Deprecated Information",
    ]
    for name in files:
        write(
            f"11_ARCHIVE/{name}.md",
            note(name, "archive", "Archive", ["brace", "archive"], placeholder_body(name, "Archive")),
        )


def create_sources_config() -> None:
    sources = {
        "rss_sources": [
            {
                "name": "OpenAI News",
                "url": "https://openai.com/news/rss.xml",
                "category": "ai/news",
                "target": "02_AI_UNIVERSE/Updates",
                "type": "ai-news",
                "reliability": 4,
                "tags": ["ai", "ai/news", "source/official"],
            },
            {
                "name": "Google AI Blog",
                "url": "https://blog.google/technology/ai/rss/",
                "category": "ai/news",
                "target": "02_AI_UNIVERSE/Updates",
                "type": "ai-news",
                "reliability": 4,
                "tags": ["ai", "ai/news", "source/official"],
            },
            {
                "name": "MIT Technology Review AI",
                "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed",
                "category": "technology",
                "target": "02_AI_UNIVERSE/Updates",
                "type": "ai-news",
                "reliability": 4,
                "tags": ["ai", "ai/news"],
            },
            {
                "name": "BBC World",
                "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
                "category": "world/news",
                "target": "03_WORLD_INTELLIGENCE/Updates",
                "type": "world-update",
                "reliability": 4,
                "tags": ["world", "world/news"],
            },
            {
                "name": "The Hindu National",
                "url": "https://www.thehindu.com/news/national/feeder/default.rss",
                "category": "india",
                "target": "03_WORLD_INTELLIGENCE/Updates",
                "type": "world-update",
                "reliability": 4,
                "tags": ["world", "india"],
            },
            {
                "name": "Indian Express India",
                "url": "https://indianexpress.com/section/india/feed/",
                "category": "india",
                "target": "03_WORLD_INTELLIGENCE/Updates",
                "type": "world-update",
                "reliability": 4,
                "tags": ["world", "india"],
            },
        ],
        "page_monitors": [
            {
                "name": "CWIT Home",
                "url": "https://cwit.mespune.org/",
                "category": "cwit/notice",
                "target": "04_CWIT_COLLEGE_PUNE/Updates",
                "type": "cwit-update",
                "reliability": 5,
                "official": True,
                "tags": ["cwit", "cwit/notice", "source/official"],
            },
            {
                "name": "CWIT Contact",
                "url": "https://cwit.mespune.org/contact-us/",
                "category": "cwit/contact",
                "target": "04_CWIT_COLLEGE_PUNE/Updates",
                "type": "cwit-update",
                "reliability": 5,
                "official": True,
                "tags": ["cwit", "source/official"],
            },
            {
                "name": "CWIT About",
                "url": "https://cwit.mespune.org/about-us/",
                "category": "cwit/about",
                "target": "04_CWIT_COLLEGE_PUNE/Updates",
                "type": "cwit-update",
                "reliability": 5,
                "official": True,
                "tags": ["cwit", "source/official"],
            },
            {
                "name": "MSBTE",
                "url": "https://msbte.org.in/",
                "category": "cwit/exam",
                "target": "04_CWIT_COLLEGE_PUNE/Updates",
                "type": "cwit-update",
                "reliability": 5,
                "official": True,
                "tags": ["cwit", "cwit/exam", "source/official"],
            },
            {
                "name": "DTE Maharashtra",
                "url": "https://dtemaharashtra.gov.in/",
                "category": "cwit/admission",
                "target": "04_CWIT_COLLEGE_PUNE/Updates",
                "type": "cwit-update",
                "reliability": 5,
                "official": True,
                "tags": ["cwit", "cwit/admission", "source/official"],
            },
            {
                "name": "AICTE",
                "url": "https://www.aicte-india.org/",
                "category": "education",
                "target": "04_CWIT_COLLEGE_PUNE/Updates",
                "type": "cwit-update",
                "reliability": 5,
                "official": True,
                "tags": ["cwit", "source/official"],
            },
        ],
    }
    write_json("10_AUTOMATION_SYSTEM/config/sources.json", sources)


def create_updater_script() -> None:
    updater = r'''
from __future__ import annotations

import argparse
import email.utils
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
VAULT = SCRIPT_DIR.parents[1]
CONFIG = VAULT / "10_AUTOMATION_SYSTEM" / "config" / "sources.json"
STATE_DIR = VAULT / "10_AUTOMATION_SYSTEM" / "state"
LOG_DIR = VAULT / "10_AUTOMATION_SYSTEM" / "logs"
SEEN_FILE = STATE_DIR / "seen_items.json"
HASH_FILE = STATE_DIR / "page_hashes.json"
LOG_FILE = LOG_DIR / "update-log.md"
INBOX_LINKS = VAULT / "01_INBOX" / "Articles To Process.md"
USER_AGENT = "BRACE Knowledge Brain Updater/1.0"


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def today() -> str:
    return datetime.now().date().isoformat()


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def log(message: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    line = f"- {now_iso()} - {message}\n"
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line)
    print(message)


def fetch(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def slugify(text: str, max_len: int = 90) -> str:
    text = html.unescape(text)
    text = re.sub(r"[\\/:*?\"<>|#^[\]]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text[:max_len].strip()
    return text or "untitled"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def strip_html(text: str) -> str:
    text = re.sub(r"(?is)<script.*?</script>|<style.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_date(value: str | None) -> str:
    if not value:
        return ""
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone().date().isoformat()
    except Exception:
        return value[:30]


@dataclass
class FeedItem:
    title: str
    link: str
    published: str
    summary: str
    guid: str


def parse_rss(xml_text: str) -> list[FeedItem]:
    root = ET.fromstring(xml_text)
    items: list[FeedItem] = []

    channel_items = root.findall(".//item")
    if channel_items:
        for item in channel_items:
            title = (item.findtext("title") or "Untitled").strip()
            link = (item.findtext("link") or "").strip()
            published = parse_date(item.findtext("pubDate") or item.findtext("published"))
            summary = strip_html(item.findtext("description") or item.findtext("summary") or "")
            guid = (item.findtext("guid") or link or title).strip()
            items.append(FeedItem(title, link, published, summary, guid))
        return items

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    for entry in root.findall(".//atom:entry", ns):
        title = (entry.findtext("atom:title", default="", namespaces=ns) or "Untitled").strip()
        link_el = entry.find("atom:link", ns)
        link = link_el.attrib.get("href", "") if link_el is not None else ""
        published = parse_date(entry.findtext("atom:published", default="", namespaces=ns) or entry.findtext("atom:updated", default="", namespaces=ns))
        summary = strip_html(entry.findtext("atom:summary", default="", namespaces=ns) or entry.findtext("atom:content", default="", namespaces=ns) or "")
        guid = (entry.findtext("atom:id", default="", namespaces=ns) or link or title).strip()
        items.append(FeedItem(title, link, published, summary, guid))
    return items


def yaml_list(values: list[str]) -> str:
    return "[" + ", ".join(values) + "]"


def maybe_ai_summary(title: str, source_url: str, source_text: str) -> str:
    # This intentionally avoids pretending to summarize when no API key is configured.
    # Add your own OpenAI/Gemini/Claude call here when ready.
    if os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"):
        return "AI summary key detected, but summarization is not enabled in this starter script yet. Review source manually."
    if source_text:
        return f"Auto-summary pending. Source fetched successfully; review the original item before using it. Title: {title}"
    return "Update not verified. Source unavailable."


def markdown_for_feed(source: dict[str, Any], item: FeedItem) -> str:
    retrieved = today()
    item_summary = item.summary[:700] if item.summary else maybe_ai_summary(item.title, item.link, "")
    tags = source.get("tags", [])
    note_type = source.get("type", "world-update")
    category = source.get("category", "")
    reliability = source.get("reliability", 3)
    return f"""---
title: "{item.title.replace('"', "'")}"
date: {retrieved}
source: "{item.link}"
published: {item.published or ""}
retrieved: {retrieved}
category: {category}
reliability: {reliability}
type: {note_type}
tags: {yaml_list(tags)}
---
# {item.title}

## Summary
{item_summary}

## Key Points
- Source captured from {source.get("name", "RSS source")}.
- Published date: {item.published or "Not provided by feed"}.
- Retrieved date: {retrieved}.

## Why It Matters
- Review manually and connect to studies, projects, or current affairs if useful.

## Source URL
{item.link}

## Related Notes
- [[B.R.A.C.E Master Dashboard]]
- [[Source Reliability System]]

## My Thoughts
- [ ] Read original source before using this information.
"""


def markdown_for_page_change(source: dict[str, Any], old_hash: str | None, new_hash: str) -> str:
    retrieved = today()
    title = f"{source.get('name', 'Official page')} changed - {retrieved}"
    tags = source.get("tags", ["cwit", "source/official"])
    return f"""---
title: "{title}"
date: {retrieved}
source: "{source.get("url", "")}"
official: {str(source.get("official", True)).lower()}
retrieved: {retrieved}
category: {source.get("category", "cwit/notice")}
action_required: "Open source and verify exact change"
reliability: {source.get("reliability", 5)}
type: {source.get("type", "cwit-update")}
tags: {yaml_list(tags)}
---
# {title}

## Update Summary
An official monitored page changed. B.R.A.C.E detected a content hash change and created this review note.

## Official Source
{source.get("url", "")}

## Important Dates
- Retrieved: {retrieved}

## Who It Affects
- Review manually. It may affect students, admissions, exams, timetable, placements, or general college information.

## Action Required
- [ ] Open the official source.
- [ ] Identify the exact change.
- [ ] Save important PDFs or screenshots.
- [ ] Add deadlines to [[🔥 Today's Command Center]] if needed.

## Change Hash
- Previous: {old_hash or "first baseline"}
- Current: {new_hash}

## My Notes
- 
"""


def write_note(folder: str, filename: str, body: str) -> Path:
    path = VAULT / folder / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        base = path.stem
        suffix = path.suffix
        counter = 2
        while path.exists():
            path = path.with_name(f"{base} {counter}{suffix}")
            counter += 1
    path.write_text(body, encoding="utf-8")
    return path


def append_raw_link(source_name: str, title: str, url: str, note_path: Path) -> None:
    if not url:
        return
    INBOX_LINKS.parent.mkdir(parents=True, exist_ok=True)
    existing = INBOX_LINKS.read_text(encoding="utf-8", errors="ignore") if INBOX_LINKS.exists() else ""
    if url in existing:
        return
    entry = f"- [ ] {today()} | {source_name} | [{title}]({url}) | note: [[{note_path.stem}]]\n"
    if "## Auto-Captured Links" not in existing:
        with INBOX_LINKS.open("a", encoding="utf-8") as f:
            if existing and not existing.endswith("\n"):
                f.write("\n")
            f.write("\n## Auto-Captured Links\n")
            f.write(entry)
    else:
        with INBOX_LINKS.open("a", encoding="utf-8") as f:
            f.write(entry)


def process_rss(config: dict[str, Any], seen: dict[str, Any], limit_per_feed: int) -> list[Path]:
    created: list[Path] = []
    for source in config.get("rss_sources", []):
        name = source.get("name", source.get("url"))
        try:
            xml_text = fetch(source["url"])
            items = parse_rss(xml_text)
        except Exception as exc:
            log(f"{name}: Update not verified. Source unavailable. Error: {exc}")
            continue

        for item in items[:limit_per_feed]:
            unique = sha256(f"{source.get('name')}|{item.guid}|{item.link}|{item.title}")
            if unique in seen:
                continue
            seen[unique] = {"source": name, "title": item.title, "link": item.link, "seen_at": now_iso()}
            filename = f"{today()} - {slugify(item.title)}.md"
            path = write_note(source.get("target", "01_INBOX"), filename, markdown_for_feed(source, item))
            append_raw_link(str(name), item.title, item.link, path)
            created.append(path)
            log(f"{name}: created {path.relative_to(VAULT)}")
    return created


def process_pages(config: dict[str, Any], hashes: dict[str, Any], baseline_only: bool = False) -> list[Path]:
    created: list[Path] = []
    for source in config.get("page_monitors", []):
        name = source.get("name", source.get("url"))
        url = source["url"]
        try:
            text = strip_html(fetch(url))
        except Exception as exc:
            log(f"{name}: Update not verified. Source unavailable. Error: {exc}")
            continue
        new_hash = sha256(text)
        old_hash = hashes.get(url, {}).get("hash")
        hashes[url] = {"hash": new_hash, "checked_at": now_iso(), "name": name}

        if old_hash is None:
            log(f"{name}: baseline stored")
            continue
        if old_hash != new_hash and not baseline_only:
            filename = f"{today()} - {slugify(name)} changed.md"
            path = write_note(source.get("target", "04_CWIT_COLLEGE_PUNE/Updates"), filename, markdown_for_page_change(source, old_hash, new_hash))
            append_raw_link(str(name), f"{name} changed", url, path)
            created.append(path)
            log(f"{name}: change detected, created {path.relative_to(VAULT)}")
        else:
            log(f"{name}: no change")
    return created


def create_digest(created: list[Path], kind: str = "daily") -> Path | None:
    if not created:
        log(f"{kind.title()} digest skipped: no new items")
        return None
    digest_dir = VAULT / "03_WORLD_INTELLIGENCE" / "Digests"
    digest_dir.mkdir(parents=True, exist_ok=True)
    stamp = today()
    filename = f"{stamp} - B.R.A.C.E {kind.title()} Intelligence Digest.md"
    lines = [
        "---",
        f"date: {stamp}",
        f"type: {kind}-digest",
        "tags: [brace, review, world/news]",
        "---",
        f"# B.R.A.C.E {kind.title()} Intelligence Digest - {stamp}",
        "",
        "## New Items",
    ]
    for path in created:
        lines.append(f"- [[{path.stem}]]")
    lines.extend([
        "",
        "## Manual Review",
        "- [ ] Check high-impact items.",
        "- [ ] Add source notes for anything used in study/project work.",
        "- [ ] Move irrelevant items to archive.",
    ])
    path = digest_dir / filename
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    log(f"Created digest {path.relative_to(VAULT)}")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="B.R.A.C.E Obsidian vault updater")
    parser.add_argument("--once", action="store_true", help="Run RSS and page monitor once")
    parser.add_argument("--baseline-pages", action="store_true", help="Store page hashes without creating change notes")
    parser.add_argument("--limit-per-feed", type=int, default=5)
    parser.add_argument("--weekly", action="store_true", help="Create weekly digest from new items in this run")
    parser.add_argument("--monthly", action="store_true", help="Create monthly digest from new items in this run")
    args = parser.parse_args()

    if not CONFIG.exists():
        print(f"Missing config: {CONFIG}", file=sys.stderr)
        return 2

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    config = load_json(CONFIG, {})
    seen = load_json(SEEN_FILE, {})
    hashes = load_json(HASH_FILE, {})

    created: list[Path] = []
    if args.once or not (args.weekly or args.monthly or args.baseline_pages):
        created.extend(process_rss(config, seen, args.limit_per_feed))
        created.extend(process_pages(config, hashes))
        create_digest(created, "daily")
    if args.baseline_pages:
        created.extend(process_pages(config, hashes, baseline_only=True))
    if args.weekly:
        create_digest(created, "weekly")
    if args.monthly:
        create_digest(created, "monthly")

    save_json(SEEN_FILE, seen)
    save_json(HASH_FILE, hashes)
    log("Run complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''
    write("10_AUTOMATION_SYSTEM/scripts/brace_updater.py", updater)

    requirements = clean(
        """
        # B.R.A.C.E updater uses Python standard library by default.
        # Optional packages for future enhancement:
        beautifulsoup4>=4.12.0
        requests>=2.32.0
        feedparser>=6.0.11
        python-dateutil>=2.9.0
        """
    )
    write("10_AUTOMATION_SYSTEM/scripts/requirements.txt", requirements)

    ps1 = clean(
        r"""
        $Vault = Resolve-Path "$PSScriptRoot\..\.."
        $Script = Join-Path $Vault "10_AUTOMATION_SYSTEM\scripts\brace_updater.py"
        $Python = Join-Path $Vault ".venv\Scripts\python.exe"
        if (!(Test-Path $Python)) {
          $Python = "python"
        }

        $Action = New-ScheduledTaskAction -Execute $Python -Argument "`"$Script`" --once" -WorkingDirectory $Vault
        $Trigger = New-ScheduledTaskTrigger -Daily -At 7:00AM
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
        Register-ScheduledTask -TaskName "BRACE Daily Knowledge Update" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily B.R.A.C.E Obsidian knowledge update" -Force
        Write-Host "Installed scheduled task: BRACE Daily Knowledge Update"
        """
    )
    write("10_AUTOMATION_SYSTEM/scripts/install_windows_task.ps1", ps1)

    workflow = {
        "name": "B.R.A.C.E Daily Intelligence Workflow - Skeleton",
        "nodes": [
            {"name": "Daily Cron", "type": "n8n-nodes-base.cron", "notes": "Run daily at 07:00"},
            {"name": "RSS AI Sources", "type": "n8n-nodes-base.rssFeedRead", "notes": "Read AI and technology feeds"},
            {"name": "RSS World Sources", "type": "n8n-nodes-base.rssFeedRead", "notes": "Read world and India feeds"},
            {"name": "HTTP CWIT Official Pages", "type": "n8n-nodes-base.httpRequest", "notes": "Fetch CWIT/MSBTE/DTE/AICTE pages"},
            {"name": "Normalize Metadata", "type": "n8n-nodes-base.function", "notes": "Add category, reliability, tags"},
            {"name": "Duplicate Check", "type": "n8n-nodes-base.dataStore", "notes": "Skip existing URL/hash"},
            {"name": "Optional AI Summary", "type": "n8n-nodes-base.openAi", "notes": "Only summarize fetched source text"},
            {"name": "Write Markdown", "type": "n8n-nodes-base.writeBinaryFile", "notes": "Save notes into vault or Git checkout"},
            {"name": "Error Log", "type": "n8n-nodes-base.function", "notes": "Write Update not verified. Source unavailable."},
        ],
        "connections": {},
        "brace_rules": [
            "Never fake updates.",
            "Every current-event note requires source, published date, retrieved date, reliability, summary, key points, why it matters, related notes, tags.",
            "CWIT pages must be official or marked unverified.",
        ],
    }
    write_json("10_AUTOMATION_SYSTEM/n8n_workflows/brace_daily_intelligence_workflow.json", workflow)


def create_obsidian_config() -> None:
    daily_notes = {
        "folder": "Journal",
        "format": "YYYY-MM-DD",
        "template": "_TEMPLATES/Daily Note Template.md",
    }
    templates = {
        "folder": "_TEMPLATES",
    }
    write_json(".obsidian/daily-notes.json", daily_notes)
    write_json(".obsidian/templates.json", templates)

    css = clean(
        """
        /* B.R.A.C.E dashboard polish. Enable in Settings -> Appearance -> CSS snippets. */
        body {
          --brace-accent: #54d6ff;
          --brace-accent-2: #ffd166;
          --brace-panel: rgba(21, 27, 35, 0.72);
        }

        .markdown-preview-view h1,
        .markdown-source-view.mod-cm6 .cm-line.HyperMD-header-1 {
          letter-spacing: 0;
        }

        .markdown-preview-view .callout {
          border-radius: 8px;
        }

        .markdown-preview-view table {
          width: 100%;
        }

        .markdown-preview-view code {
          border-radius: 6px;
        }

        .markdown-preview-view .dataview.table-view-table {
          border-radius: 8px;
          overflow: hidden;
        }
        """
    )
    write(".obsidian/snippets/brace-dashboard.css", css)


def create_misc_system_files() -> None:
    readme = clean(
        """
        # B.R.A.C.E Knowledge Brain

        Brain / Responsive / Autonomous / Cognitive / Engine

        Open [[00_HOME/🧠 B.R.A.C.E Master Dashboard.md]] in Obsidian to begin.
        """
    )
    write("README.md", readme, overwrite=True)

    gitignore = clean(
        """
        .venv/
        __pycache__/
        *.pyc
        10_AUTOMATION_SYSTEM/state/*.json
        10_AUTOMATION_SYSTEM/logs/*.log
        .env
        *.key
        """
    )
    write(".gitignore", gitignore)


def main() -> None:
    create_directories()
    create_home()
    create_inbox()
    create_ai_universe()
    create_world()
    create_cwit()
    create_studies()
    create_projects()
    create_coding_personal_research()
    create_templates()
    create_automation_docs()
    create_archive()
    create_sources_config()
    create_updater_script()
    create_obsidian_config()
    create_misc_system_files()
    print(f"B.R.A.C.E vault generated at {VAULT}")


if __name__ == "__main__":
    main()
