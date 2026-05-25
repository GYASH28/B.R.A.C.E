from __future__ import annotations

from automation.base_tool import ToolCard
from services.security_service import SafetyLevel


TOOLS = [
    ToolCard("Browser Control", "Open sites, search, click, type, capture pages.", "Ready", SafetyLevel.CONFIRMATION, "Use browser control to "),
    ToolCard("Web Search", "Search and compare public web results.", "Ready", SafetyLevel.SAFE, "Research this and cite useful links: "),
    ToolCard("File Control", "List, read, create, move, and trash files.", "Guarded", SafetyLevel.CONFIRMATION, "Use file control to "),
    ToolCard("Code Helper", "Explain, run, improve, and debug code.", "Ready", SafetyLevel.RESTRICTED, "Help me with this code task: "),
    ToolCard("Desktop Control", "Window, clipboard, keyboard, screenshot, and system helpers.", "Guarded", SafetyLevel.CONFIRMATION, "Control the desktop to "),
    ToolCard("YouTube Tools", "Play, inspect, and summarize videos.", "Ready", SafetyLevel.SAFE, "Use YouTube tools to "),
    ToolCard("Reminder", "Schedule local reminders.", "Ready", SafetyLevel.SAFE, "Set a reminder: "),
    ToolCard("Daily Assistant", "Greeting, time, date, Wikipedia, jokes, and assistant name.", "Ready", SafetyLevel.SAFE, "Use daily assistant to "),
    ToolCard("Music Player", "List, search, and play local music from the configured folder.", "Guarded", SafetyLevel.CONFIRMATION, "Use media player to "),
    ToolCard("Note Taker", "Create, append, read, and search local notes.", "Ready", SafetyLevel.SAFE, "Take a note: "),
    ToolCard("Weather", "Fetch current weather information.", "Ready", SafetyLevel.SAFE, "Get weather for "),
    ToolCard("Screen Processor", "Analyze the screen or camera with vision AI.", "Guarded", SafetyLevel.CONFIRMATION, "Analyze my screen and "),
    ToolCard("App Launcher", "Open local desktop applications.", "Guarded", SafetyLevel.CONFIRMATION, "Open this app: "),
    ToolCard("Message Sender", "Send messages through desktop apps.", "Guarded", SafetyLevel.CONFIRMATION, "Send this message after confirmation: "),
    ToolCard("Game Updater", "Manage Steam/Epic updates and installs.", "Guarded", SafetyLevel.CONFIRMATION, "Manage game updates: "),
    ToolCard("Clipboard Tools", "Copy, paste, and transform clipboard content.", "Guarded", SafetyLevel.CONFIRMATION, "Use clipboard tools to "),
    ToolCard("Screenshot Reader", "Capture and interpret screenshots.", "Guarded", SafetyLevel.CONFIRMATION, "Read this screenshot: "),
    ToolCard("PDF Summarizer", "Summarize PDFs and extract notes.", "Ready", SafetyLevel.SAFE, "Summarize this PDF: "),
    ToolCard("Notes Organizer", "Organize notes and action items.", "Ready", SafetyLevel.SAFE, "Organize these notes: "),
    ToolCard("Study Helper", "Create plans, summaries, and quizzes.", "Ready", SafetyLevel.SAFE, "Help me study: "),
    ToolCard("Prompt Generator", "Generate strong prompts for AI tools.", "Ready", SafetyLevel.SAFE, "Create a high-quality prompt for "),
    ToolCard("GitHub Helper", "Summarize repo work and draft README/commit text.", "Ready", SafetyLevel.SAFE, "Help with this GitHub task: "),
    ToolCard("Deployment Helper", "Troubleshoot deployment and build errors.", "Ready", SafetyLevel.SAFE, "Troubleshoot this deployment: "),
]
