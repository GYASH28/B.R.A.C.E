import re
from pathlib import Path

ui_path = Path(r"c:\Users\Admin\Desktop\B.R.A.C.E\B.R.A.C.E-main\ui.py")
content = ui_path.read_text(encoding="utf-8")

# 1. Update navigation lists in _build_side_nav and _build_bottom_nav
content = content.replace(
    'for name in ("Dashboard", "AI Chat", "Voice", "Settings", "About"):',
    'for name in ("Dashboard", "AI Chat", "Voice", "Automation", "Memory", "Logs", "Settings", "About"):'
)

# 2. Add page initialization in __init__
pages_init_target = """        self._add_page("Settings", self._build_settings_page())
        self._add_page("About", self._build_about_page(face_path))"""
pages_init_replacement = """        self._add_page("Automation", self._build_automation_page())
        self._add_page("Memory", self._build_memory_page())
        self._add_page("Logs", self._build_logs_page())
        self._add_page("Settings", self._build_settings_page())
        self._add_page("About", self._build_about_page(face_path))"""
content = content.replace(pages_init_target, pages_init_replacement)

# 3. Add the new page methods before _build_settings_page
new_pages = """    def _build_automation_page(self) -> QWidget:
        page, layout = self._page_scaffold(
            "Automation Center",
            "Local execution tools and system control modules."
        )
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        wrap = QWidget()
        grid = QGridLayout(wrap)
        grid.setSpacing(14)
        
        tools = [
            ("Open Apps", "Launch any application"),
            ("Search Web", "Google / DuckDuckGo searches"),
            ("Browser Control", "Automate Chrome/Edge"),
            ("File Control", "Manage files and folders"),
            ("Code Helper", "Write and debug code"),
            ("Desktop Actions", "System stats and wallpapers"),
            ("YouTube Tools", "Play and summarize videos"),
            ("Reminder", "Schedule future tasks"),
            ("Weather Report", "Live weather updates"),
            ("Screen Processor", "Vision AI analysis"),
            ("Game Updater", "Steam/Epic downloads"),
            ("Message Sender", "Send WhatsApp/Telegram")
        ]
        
        for i, (name, desc) in enumerate(tools):
            card = QWidget()
            card.setObjectName("glassPanel")
            cl = QVBoxLayout(card)
            title = QLabel(name)
            title.setFont(_font(11, QFont.Weight.Bold))
            title.setStyleSheet(f"color: {C.CYAN}; background: transparent;")
            subtitle = QLabel(desc)
            subtitle.setFont(_mono(8))
            subtitle.setStyleSheet(f"color: {C.TEXT2}; background: transparent;")
            btn = QPushButton("Available")
            btn.setStyleSheet(f"color: {C.GREEN}; border: 1px solid {C.GREEN}; background: transparent;")
            cl.addWidget(title)
            cl.addWidget(subtitle)
            cl.addStretch()
            cl.addWidget(btn)
            grid.addWidget(card, i // 3, i % 3)
            
        scroll.setWidget(wrap)
        layout.addWidget(scroll, stretch=1)
        return page

    def _build_memory_page(self) -> QWidget:
        page, layout = self._page_scaffold(
            "Memory System",
            "Long-term memory context retained by B.R.A.C.E."
        )
        panel = QWidget()
        panel.setObjectName("glassPanel")
        pl = QVBoxLayout(panel)
        pl.setContentsMargins(18, 18, 18, 18)
        
        info = QLabel("Memory is automatically extracted during conversation and saved to long_term.json.")
        info.setStyleSheet(f"color: {C.TEXT2}; background: transparent;")
        info.setFont(_font(10))
        pl.addWidget(info)
        
        self._memory_feed = ActivityFeed()
        pl.addWidget(self._memory_feed, stretch=1)
        
        btn_row = QHBoxLayout()
        clear_btn = QPushButton("Clear All Memory")
        clear_btn.setStyleSheet(f"color: {C.RED}; border: 1px solid {C.RED};")
        btn_row.addStretch()
        btn_row.addWidget(clear_btn)
        pl.addLayout(btn_row)
        
        layout.addWidget(panel, stretch=1)
        return page

    def _build_logs_page(self) -> QWidget:
        page, layout = self._page_scaffold(
            "System Logs",
            "Real-time event stream and debug information."
        )
        panel = QWidget()
        panel.setObjectName("glassPanel")
        pl = QVBoxLayout(panel)
        pl.setContentsMargins(18, 18, 18, 18)
        self._debug_feed = ActivityFeed()
        pl.addWidget(self._debug_feed, stretch=1)
        layout.addWidget(panel, stretch=1)
        return page

"""

content = content.replace("    def _build_settings_page(self) -> QWidget:", new_pages + "    def _build_settings_page(self) -> QWidget:")

# 4. Also route logs to the new debug feed
log_target = """        elif lower.startswith("sys:"):
            self._dashboard_feed.append(text)
            self._voice_feed.append(text)"""
log_replacement = """        elif lower.startswith("sys:"):
            self._dashboard_feed.append(text)
            self._voice_feed.append(text)
            if hasattr(self, "_debug_feed"):
                self._debug_feed.append(text)"""
content = content.replace(log_target, log_replacement)

# Write back
ui_path.write_text(content, encoding="utf-8")
print("UI updated successfully.")
