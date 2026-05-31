<!-- BRACE-GENERATED: v1 -->
---
title: Study Dashboard
type: dashboard
area: studies
status: active
created: 2026-05-26
updated: 2026-05-26
tags: [study, dashboard, study/cwit]
---

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
