from __future__ import annotations

import json
import math
import os
import random
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Callable

import psutil

from PyQt6.QtCore import QObject, QRunnable, QThreadPool, QTimer, Qt, pyqtSignal, pyqtSlot
from PyQt6.QtGui import QColor, QFont, QIcon, QKeySequence, QPainter, QPen, QPixmap, QRadialGradient, QShortcut
from PyQt6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPlainTextEdit,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from automation.registry import TOOLS
from config import (
    app_setting,
    get_assistant_name,
    get_legacy_stt_enabled,
    get_legacy_voice_enabled,
    get_live_model,
    get_music_dir,
    get_notes_dir,
    get_response_style,
    get_safe_mode,
    get_text_model,
    get_voice_enabled,
    get_voice_name,
    is_configured,
    masked_api_key,
    provider_key_status,
)
from integrations.mcp.mcp_manager import McpManager
from integrations.nano_banana.image_prompt_enhancer import enhance_prompt
from integrations.nano_banana.nano_banana_service import NanoBananaResult, NanoBananaService
from integrations.openclaw.openclaw_service import OpenClawService
from memory.memory_store import MemoryStore
from providers.provider_manager import ProviderManager
from services.diagnostics_service import CheckResult, DiagnosticsService
from services.build_service import build_executable
from services.logging_service import clear_logs, read_log_lines
from services.path_utils import app_path
from services.security_service import SecurityService
from services.settings_service import SettingsService, env, ensure_default_configs


ensure_default_configs()
BASE_DIR = app_path()
DEFAULT_W, DEFAULT_H = 1320, 820
MIN_W, MIN_H = 980, 640


class C:
    BG = "#020712"
    BG2 = "#07111f"
    PANEL = "rgba(7, 20, 38, 220)"
    PANEL2 = "#0a1b30"
    LINE = "#16405f"
    LINE2 = "#23779c"
    CYAN = "#00d9ff"
    CYAN2 = "#63f4ff"
    BLUE = "#1677ff"
    PURPLE = "#8f5cff"
    GREEN = "#37ff9d"
    AMBER = "#ffd166"
    RED = "#ff4d6d"
    TEXT = "#e8fbff"
    TEXT2 = "#9bc7d5"
    DIM = "#5b8190"


def set_windows_app_id() -> None:
    if sys.platform != "win32":
        return
    try:
        import ctypes

        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("BRACE.AI.CommandCenter.1")
    except Exception:
        pass


def icon_path() -> Path:
    candidates = [
        app_path("assets", "icons", "brace.ico"),
        app_path("assets", "brace_icon.ico"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def qcolor(value: str, alpha: int = 255) -> QColor:
    color = QColor(value)
    color.setAlpha(alpha)
    return color


def font(size: int, weight: QFont.Weight = QFont.Weight.Normal) -> QFont:
    return QFont("Segoe UI", size, weight)


def mono(size: int, weight: QFont.Weight = QFont.Weight.Normal) -> QFont:
    return QFont("Cascadia Mono", size, weight)


def fmt_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{value:.1f}{unit}" if unit != "B" else f"{int(value)}B"
        value /= 1024
    return f"{size}B"


class WorkerSignals(QObject):
    result = pyqtSignal(object)
    error = pyqtSignal(str)
    finished = pyqtSignal()


class Worker(QRunnable):
    def __init__(self, fn: Callable, *args, **kwargs):
        super().__init__()
        self.fn = fn
        self.args = args
        self.kwargs = kwargs
        self.signals = WorkerSignals()

    @pyqtSlot()
    def run(self):
        try:
            self.signals.result.emit(self.fn(*self.args, **self.kwargs))
        except Exception:
            self.signals.error.emit(traceback.format_exc())
        finally:
            self.signals.finished.emit()


class ActivityFeed(QScrollArea):
    def __init__(self):
        super().__init__()
        self.setWidgetResizable(True)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self._wrap = QWidget()
        self._layout = QVBoxLayout(self._wrap)
        self._layout.setContentsMargins(0, 0, 0, 0)
        self._layout.setSpacing(8)
        self._layout.addStretch()
        self.setWidget(self._wrap)

    def append(self, text: object):
        label = QLabel(str(text))
        label.setWordWrap(True)
        label.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        label.setFont(font(9))
        label.setStyleSheet(
            f"color:{C.TEXT2}; background:rgba(6,22,40,180); border:1px solid {C.LINE}; "
            "border-radius:8px; padding:8px;"
        )
        self._layout.insertWidget(max(0, self._layout.count() - 1), label)
        QTimer.singleShot(0, lambda: self.verticalScrollBar().setValue(self.verticalScrollBar().maximum()))

    def clear(self):
        while self._layout.count() > 1:
            item = self._layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()


class ChatBubble(QLabel):
    def __init__(self, role: str, text: str):
        super().__init__(text)
        self.setWordWrap(True)
        self.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        self.setFont(font(10))
        color = C.CYAN if role == "assistant" else C.PURPLE
        bg = "rgba(4,28,48,220)" if role == "assistant" else "rgba(35,18,64,220)"
        self.setStyleSheet(
            f"color:{C.TEXT}; background:{bg}; border:1px solid {color}; "
            "border-radius:8px; padding:11px;"
        )
        self.setMaximumWidth(820)


class ChatStream(QScrollArea):
    def __init__(self):
        super().__init__()
        self.messages: list[tuple[str, str]] = []
        self.setWidgetResizable(True)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self._wrap = QWidget()
        self._layout = QVBoxLayout(self._wrap)
        self._layout.setContentsMargins(0, 0, 0, 0)
        self._layout.setSpacing(12)
        self._layout.addStretch()
        self.setWidget(self._wrap)

    def add_message(self, role: str, text: str):
        self.messages.append((role, text))
        row = QWidget()
        layout = QHBoxLayout(row)
        layout.setContentsMargins(0, 0, 0, 0)
        bubble = ChatBubble(role, text)
        if role == "user":
            layout.addStretch()
            layout.addWidget(bubble)
        else:
            layout.addWidget(bubble)
            layout.addStretch()
        self._layout.insertWidget(max(0, self._layout.count() - 1), row)
        QTimer.singleShot(0, lambda: self.verticalScrollBar().setValue(self.verticalScrollBar().maximum()))

    def clear_messages(self):
        self.messages.clear()
        while self._layout.count() > 1:
            item = self._layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def markdown(self) -> str:
        return "\n\n".join(f"**{role.upper()}**\n{text}" for role, text in self.messages)


class FileDropZone(QWidget):
    file_selected = pyqtSignal(str)

    def __init__(self, label: str = "Drop a file here or click to attach"):
        super().__init__()
        self._path = ""
        self.setAcceptDrops(True)
        self.setMinimumHeight(108)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self._label = QLabel(label)
        self._label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._label.setWordWrap(True)
        self._label.setFont(font(10, QFont.Weight.Bold))
        self._label.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        layout = QVBoxLayout(self)
        layout.addStretch()
        layout.addWidget(self._label)
        layout.addStretch()
        self._normal_style()

    def _normal_style(self):
        self.setStyleSheet(
            f"background:rgba(5,18,34,185); border:1px dashed {C.LINE2}; border-radius:8px;"
        )

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet(
                f"background:rgba(0,217,255,38); border:1px solid {C.CYAN}; border-radius:8px;"
            )

    def dragLeaveEvent(self, _event):
        self._normal_style()

    def dropEvent(self, event):
        urls = event.mimeData().urls()
        if urls:
            self._set_file(urls[0].toLocalFile())
        self._normal_style()

    def mousePressEvent(self, _event):
        path, _ = QFileDialog.getOpenFileName(self, "Attach file for B.R.A.C.E.", str(Path.home()))
        if path:
            self._set_file(path)

    def _set_file(self, path: str):
        p = Path(path)
        self._path = str(p)
        try:
            size = fmt_size(p.stat().st_size)
        except Exception:
            size = "unknown size"
        self._label.setText(f"{p.name}\n{size}")
        self.file_selected.emit(str(p))

    def current_file(self) -> str:
        return self._path


class CoreOrb(QWidget):
    def __init__(self, face_path: str = "", parent=None):
        super().__init__(parent)
        self.state = "INITIALIZING"
        self.muted = not get_voice_enabled()
        self.speaking = False
        self._tick = 0
        self._face = QPixmap()
        if face_path:
            p = Path(face_path)
            if not p.is_absolute():
                p = app_path(face_path)
            if p.exists():
                self._face = QPixmap(str(p))
        self.setMinimumSize(240, 240)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._step)
        self._timer.start(16)

    def _step(self):
        self._tick += 1
        self.update()

    def paintEvent(self, _event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height()
        cx, cy = w / 2, h / 2
        span = min(w, h)
        radius = span * 0.22
        pulse = 1 + 0.07 * math.sin(self._tick * (0.1 if self.speaking else 0.045))

        painter.setPen(QPen(qcolor(C.LINE, 60), 1))
        for x in range(0, w, 42):
            painter.drawLine(x, 0, x, h)
        for y in range(0, h, 42):
            painter.drawLine(0, y, w, y)

        glow_color = C.RED if self.muted else C.CYAN
        for i in range(8, 0, -1):
            r = radius * pulse * (1 + i * 0.13)
            painter.setPen(QPen(qcolor(glow_color, max(10, 70 - i * 7)), 2))
            painter.drawEllipse(int(cx - r), int(cy - r), int(r * 2), int(r * 2))

        for i in range(3):
            r = radius * (1.55 + i * 0.28)
            start = int((self._tick * (1.3 + i * 0.4) + i * 90) * 16)
            painter.setPen(QPen(qcolor(C.PURPLE if i == 1 else C.CYAN2, 210 - i * 40), 2))
            painter.drawArc(int(cx - r), int(cy - r), int(r * 2), int(r * 2), start, int((95 - i * 16) * 16))

        grad = QRadialGradient(cx, cy, radius * 1.2)
        grad.setColorAt(0.0, qcolor("#cfffff", 245))
        grad.setColorAt(0.32, qcolor(C.CYAN, 190))
        grad.setColorAt(0.72, qcolor(C.BLUE, 110))
        grad.setColorAt(1.0, qcolor(C.BG, 30))
        painter.setBrush(grad)
        painter.setPen(QPen(qcolor(C.CYAN2), 2))
        painter.drawEllipse(int(cx - radius), int(cy - radius), int(radius * 2), int(radius * 2))

        if not self._face.isNull():
            size = int(radius * 1.35)
            px = self._face.scaled(size, size, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            painter.setOpacity(0.38)
            painter.drawPixmap(int(cx - px.width() / 2), int(cy - px.height() / 2), px)
            painter.setOpacity(1.0)
        else:
            painter.setFont(mono(18, QFont.Weight.Bold))
            painter.setPen(QPen(qcolor(C.TEXT), 1))
            painter.drawText(0, int(cy - 12), w, 28, Qt.AlignmentFlag.AlignCenter, "B")

        painter.setFont(mono(9, QFont.Weight.Bold))
        painter.setPen(QPen(qcolor(C.RED if self.muted else C.GREEN if self.state == "LISTENING" else C.CYAN), 1))
        painter.drawText(0, int(cy + span * 0.32), w, 24, Qt.AlignmentFlag.AlignCenter, self.state)


class StatusCard(QWidget):
    def __init__(self, title: str, value: str, color: str = C.CYAN):
        super().__init__()
        self.setObjectName("statusCard")
        self.setMinimumHeight(104)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.setSpacing(6)
        title_label = QLabel(title.upper())
        title_label.setFont(mono(8, QFont.Weight.Bold))
        title_label.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        self.value_label = QLabel(value)
        self.value_label.setWordWrap(True)
        self.value_label.setFont(font(15, QFont.Weight.Bold))
        self.value_label.setStyleSheet(f"color:{color}; background:transparent;")
        layout.addWidget(title_label)
        layout.addWidget(self.value_label)
        layout.addStretch()

    def set_value(self, value: str):
        self.value_label.setText(value)


class BootOverlay(QWidget):
    finished = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setStyleSheet("background:rgba(1,6,14,246);")
        layout = QVBoxLayout(self)
        layout.setContentsMargins(42, 42, 42, 42)
        layout.addStretch()
        self._orb = CoreOrb(parent=self)
        self._orb.setFixedSize(260, 260)
        self._title = QLabel("Initializing B.R.A.C.E...")
        self._title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._title.setFont(font(24, QFont.Weight.Bold))
        self._title.setStyleSheet(f"color:{C.CYAN}; background:transparent;")
        self._sub = QLabel("Brain-like Responsive Assistant for Creation and Execution")
        self._sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._sub.setFont(font(11))
        self._sub.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        layout.addWidget(self._orb, alignment=Qt.AlignmentFlag.AlignCenter)
        layout.addSpacing(16)
        layout.addWidget(self._title)
        layout.addWidget(self._sub)
        layout.addStretch()
        self._messages = [
            "Initializing B.R.A.C.E...",
            "Loading Neural Core...",
            "Checking Provider Router...",
            "Loading Voice Engine...",
            "Scanning MCP Servers...",
            "Checking OpenClaw Gateway...",
            "Syncing Memory Vault...",
            "Execution Layer Ready...",
            "System Online.",
        ]
        self._idx = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._next)

    def start(self):
        self.setGeometry(self.parentWidget().rect())
        self.show()
        self.raise_()
        self._idx = 0
        self._timer.start(230)

    def _next(self):
        if self._idx < len(self._messages):
            msg = self._messages[self._idx]
            self._title.setText(msg)
            self._orb.state = "BOOT"
            self._idx += 1
        else:
            self._timer.stop()
            self.hide()
            self.finished.emit()


class MainWindow(QMainWindow):
    _log_sig = pyqtSignal(str)
    _state_sig = pyqtSignal(str)

    def __init__(self, face_path: str):
        super().__init__()
        self.settings = SettingsService()
        self.providers = ProviderManager()
        self.diagnostics = DiagnosticsService()
        self.openclaw = OpenClawService()
        self.mcp = McpManager()
        self.nano = NanoBananaService()
        self.memory = MemoryStore()
        self.security = SecurityService()
        self.pool = QThreadPool.globalInstance()

        self.on_text_command = None
        self._muted = not get_voice_enabled()
        self._audio_output_enabled = get_voice_enabled()
        self._state = "INITIALIZING"
        self._current_file = ""
        self._latest_diagnostic_report = ""
        self._nano_reference = ""

        self.setWindowTitle("B.R.A.C.E. - Brain-like Responsive Assistant for Creation and Execution")
        self.setWindowIcon(QIcon(str(icon_path())))
        self.setMinimumSize(MIN_W, MIN_H)
        self.resize(DEFAULT_W, DEFAULT_H)
        self._center()

        root = QWidget()
        root.setObjectName("root")
        self.setCentralWidget(root)
        root_layout = QVBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)
        root_layout.addWidget(self._build_header())

        body = QHBoxLayout()
        body.setContentsMargins(0, 0, 0, 0)
        body.setSpacing(0)
        self._side_nav = self._build_side_nav()
        body.addWidget(self._side_nav)
        self._stack = QStackedWidget()
        body.addWidget(self._stack, stretch=1)
        root_layout.addLayout(body, stretch=1)
        self._bottom_nav = self._build_bottom_nav()
        root_layout.addWidget(self._bottom_nav)

        self._pages: dict[str, int] = {}
        self._build_pages(face_path)
        self._apply_styles()
        self._log_sig.connect(self._handle_log)
        self._state_sig.connect(self._apply_state)

        self._clock_timer = QTimer(self)
        self._clock_timer.timeout.connect(self._tick_clock)
        self._clock_timer.start(1000)
        self._tick_clock()

        self._metric_timer = QTimer(self)
        self._metric_timer.timeout.connect(self._update_metrics)
        self._metric_timer.start(1800)
        self._update_metrics()

        QShortcut(QKeySequence("F4"), self).activated.connect(self._toggle_mute)
        QShortcut(QKeySequence("F11"), self).activated.connect(self._toggle_fullscreen)

        self._boot = BootOverlay(self.centralWidget())
        self._boot.finished.connect(self._after_boot)
        QTimer.singleShot(80, self._boot.start)

        startup = app_setting("startup_page", "Dashboard")
        self._set_page(startup if startup in self._pages else "Dashboard")
        if not is_configured():
            self._apply_state("CONFIG REQUIRED")
            self._handle_log("SYS: GEMINI_API_KEY is missing. Add a real key to .env and restart B.R.A.C.E.")

    def _center(self):
        screen = QApplication.primaryScreen()
        if not screen:
            return
        geo = screen.availableGeometry()
        self.move((geo.width() - DEFAULT_W) // 2, (geo.height() - DEFAULT_H) // 2)

    def _apply_styles(self):
        self.setStyleSheet(
            f"""
            QWidget#root {{
                background:qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 {C.BG}, stop:.55 {C.BG2}, stop:1 #03040a);
                color:{C.TEXT};
            }}
            QScrollArea {{ background:transparent; border:none; }}
            QScrollBar:vertical {{ background:transparent; width:8px; margin:3px; }}
            QScrollBar::handle:vertical {{ background:{C.LINE2}; border-radius:4px; }}
            QLineEdit, QPlainTextEdit, QComboBox {{
                background:rgba(5,18,34,235);
                color:{C.TEXT};
                border:1px solid {C.LINE2};
                border-radius:8px;
                padding:8px;
                selection-background-color:{C.BLUE};
            }}
            QPlainTextEdit {{ padding:10px; }}
            QCheckBox {{ color:{C.TEXT2}; spacing:8px; }}
            QCheckBox::indicator {{
                width:18px; height:18px; border:1px solid {C.LINE2}; border-radius:4px; background:#06101e;
            }}
            QCheckBox::indicator:checked {{ background:{C.CYAN}; border-color:{C.CYAN}; }}
            QWidget#glassPanel, QWidget#statusCard {{
                background:rgba(7,20,38,220);
                border:1px solid {C.LINE};
                border-radius:8px;
            }}
            QPushButton {{
                background:rgba(7,22,42,225);
                color:{C.TEXT};
                border:1px solid {C.LINE2};
                border-radius:8px;
                padding:9px 12px;
                font-weight:650;
            }}
            QPushButton:hover {{ background:rgba(0,217,255,36); border:1px solid {C.CYAN}; color:{C.CYAN2}; }}
            QPushButton:pressed {{ background:rgba(20,125,255,75); }}
            """
        )

    def _build_header(self) -> QWidget:
        header = QWidget()
        header.setFixedHeight(72)
        header.setStyleSheet(f"background:rgba(2,8,19,245); border-bottom:1px solid {C.LINE2};")
        layout = QHBoxLayout(header)
        layout.setContentsMargins(20, 0, 20, 0)
        layout.setSpacing(16)

        title_col = QVBoxLayout()
        title_col.setSpacing(0)
        title = QLabel("B.R.A.C.E.")
        title.setFont(font(23, QFont.Weight.Bold))
        title.setStyleSheet(f"color:{C.CYAN}; background:transparent;")
        subtitle = QLabel("Brain-like Responsive Assistant for Creation and Execution")
        subtitle.setFont(mono(8))
        subtitle.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        title_col.addWidget(title)
        title_col.addWidget(subtitle)
        layout.addLayout(title_col)
        layout.addStretch()

        self._status_chip = QLabel("INITIALIZING")
        self._status_chip.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._status_chip.setMinimumWidth(160)
        self._status_chip.setFont(mono(9, QFont.Weight.Bold))
        self._status_chip.setStyleSheet(self._chip_style(C.AMBER))
        layout.addWidget(self._status_chip)

        self._clock_lbl = QLabel("00:00:00")
        self._clock_lbl.setFont(mono(15, QFont.Weight.Bold))
        self._clock_lbl.setStyleSheet(f"color:{C.TEXT}; background:transparent;")
        layout.addWidget(self._clock_lbl)
        return header

    def _chip_style(self, color: str) -> str:
        return f"color:{color}; background:rgba(7,19,36,190); border:1px solid {color}; border-radius:12px; padding:5px 10px;"

    def _build_side_nav(self) -> QWidget:
        nav = QWidget()
        nav.setFixedWidth(224)
        nav.setStyleSheet(f"background:rgba(2,8,19,226); border-right:1px solid {C.LINE};")
        outer = QVBoxLayout(nav)
        outer.setContentsMargins(10, 12, 10, 12)
        outer.setSpacing(8)

        scroller = QScrollArea()
        scroller.setWidgetResizable(True)
        wrap = QWidget()
        layout = QVBoxLayout(wrap)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        self._side_buttons = {}
        for name in self._nav_names():
            btn = self._nav_button(name)
            btn.clicked.connect(lambda _=False, page=name: self._set_page(page))
            self._side_buttons[name] = btn
            layout.addWidget(btn)
        layout.addStretch()
        scroller.setWidget(wrap)
        outer.addWidget(scroller, stretch=1)

        self._api_side = QLabel(masked_api_key())
        self._api_side.setWordWrap(True)
        self._api_side.setFont(mono(8))
        self._api_side.setStyleSheet(f"color:{C.DIM}; background:transparent;")
        outer.addWidget(self._api_side)
        return nav

    def _build_bottom_nav(self) -> QWidget:
        nav = QWidget()
        nav.setFixedHeight(64)
        nav.setStyleSheet(f"background:rgba(2,8,19,245); border-top:1px solid {C.LINE};")
        layout = QHBoxLayout(nav)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(8)
        self._bottom_buttons = {}
        for name in ("Dashboard", "AI Chat", "Voice Assistant", "Automation Center", "Settings"):
            btn = self._nav_button(name)
            btn.clicked.connect(lambda _=False, page=name: self._set_page(page))
            self._bottom_buttons[name] = btn
            layout.addWidget(btn)
        nav.hide()
        return nav

    def _nav_names(self) -> tuple[str, ...]:
        return (
            "Dashboard",
            "AI Chat",
            "Voice Assistant",
            "Automation Center",
            "OpenClaw Control",
            "MCP Server Manager",
            "Nano Banana Studio",
            "NVIDIA AI Hub",
            "Provider Router",
            "Memory Vault",
            "File Intelligence",
            "Prompt Lab",
            "Code Copilot",
            "Web Intelligence",
            "System Diagnostics",
            "Settings",
            "About B.R.A.C.E.",
        )

    def _nav_button(self, text: str) -> QPushButton:
        btn = QPushButton(text)
        btn.setCursor(Qt.CursorShape.PointingHandCursor)
        btn.setMinimumHeight(40)
        btn.setFont(font(9, QFont.Weight.Bold))
        return btn

    def _build_pages(self, face_path: str):
        self._add_page("Dashboard", self._build_dashboard_page(face_path))
        self._add_page("AI Chat", self._build_chat_page())
        self._add_page("Voice Assistant", self._build_voice_page(face_path))
        self._add_page("Automation Center", self._build_automation_page())
        self._add_page("OpenClaw Control", self._build_openclaw_page())
        self._add_page("MCP Server Manager", self._build_mcp_page())
        self._add_page("Nano Banana Studio", self._build_nano_page())
        self._add_page("NVIDIA AI Hub", self._build_nvidia_page())
        self._add_page("Provider Router", self._build_provider_page())
        self._add_page("Memory Vault", self._build_memory_page())
        self._add_page("File Intelligence", self._build_file_intelligence_page())
        self._add_page("Prompt Lab", self._build_prompt_lab_page())
        self._add_page("Code Copilot", self._build_code_copilot_page())
        self._add_page("Web Intelligence", self._build_web_intelligence_page())
        self._add_page("System Diagnostics", self._build_diagnostics_page())
        self._add_page("Settings", self._build_settings_page())
        self._add_page("About B.R.A.C.E.", self._build_about_page(face_path))

    def _add_page(self, name: str, page: QWidget):
        self._pages[name] = self._stack.addWidget(page)

    def _set_page(self, name: str):
        if name not in self._pages:
            return
        self._stack.setCurrentIndex(self._pages[name])
        for mapping in (getattr(self, "_side_buttons", {}), getattr(self, "_bottom_buttons", {})):
            for key, btn in mapping.items():
                btn.setStyleSheet(
                    f"background:rgba(0,217,255,45); color:{C.CYAN2}; border:1px solid {C.CYAN};"
                    if key == name
                    else ""
                )

    def _page(self, title: str, subtitle: str = "") -> tuple[QWidget, QVBoxLayout]:
        page = QWidget()
        outer = QVBoxLayout(page)
        outer.setContentsMargins(0, 0, 0, 0)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        wrap = QWidget()
        layout = QVBoxLayout(wrap)
        layout.setContentsMargins(22, 22, 22, 22)
        layout.setSpacing(16)
        head = QLabel(title)
        head.setFont(font(24, QFont.Weight.Bold))
        head.setStyleSheet(f"color:{C.TEXT}; background:transparent;")
        layout.addWidget(head)
        if subtitle:
            sub = QLabel(subtitle)
            sub.setWordWrap(True)
            sub.setFont(font(10))
            sub.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
            layout.addWidget(sub)
        scroll.setWidget(wrap)
        outer.addWidget(scroll)
        return page, layout

    def _panel(self, layout_cls=QVBoxLayout) -> tuple[QWidget, QVBoxLayout | QGridLayout | QHBoxLayout]:
        panel = QWidget()
        panel.setObjectName("glassPanel")
        layout = layout_cls(panel)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)
        return panel, layout

    def _label(self, text: str, color: str = C.TEXT2, size: int = 9, bold: bool = False) -> QLabel:
        label = QLabel(text)
        label.setWordWrap(True)
        label.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        label.setFont(font(size, QFont.Weight.Bold if bold else QFont.Weight.Normal))
        label.setStyleSheet(f"color:{color}; background:transparent;")
        return label

    def _small_title(self, text: str) -> QLabel:
        label = QLabel(text.upper())
        label.setFont(mono(8, QFont.Weight.Bold))
        label.setStyleSheet(f"color:{C.CYAN}; background:transparent;")
        return label

    def _build_dashboard_page(self, face_path: str) -> QWidget:
        page, layout = self._page("Dashboard", "B.R.A.C.E. online status, telemetry, provider readiness, and quick execution actions.")
        top = QHBoxLayout()
        left = QVBoxLayout()
        card_grid = QGridLayout()
        card_grid.setSpacing(12)
        self._dashboard_cards = {
            "neural": StatusCard("Neural Core Active", "Ready", C.GREEN),
            "voice": StatusCard("Voice Engine", "Ready" if get_voice_enabled() else "Standby", C.PURPLE),
            "openclaw": StatusCard("OpenClaw Gateway", "Check required", C.AMBER),
            "mcp": StatusCard("MCP Servers", "Configured", C.CYAN),
            "nano": StatusCard("Nano Banana Studio", provider_key_status("GEMINI_API_KEY"), C.CYAN),
            "nvidia": StatusCard("NVIDIA Model Hub", provider_key_status("NVIDIA_API_KEY"), C.GREEN),
            "memory": StatusCard("Memory Vault", "Local", C.PURPLE),
            "safe": StatusCard("Safe Mode", "Enabled" if get_safe_mode() else "Disabled", C.AMBER if get_safe_mode() else C.RED),
            "health": StatusCard("System Health", "Nominal", C.GREEN),
        }
        for i, card in enumerate(self._dashboard_cards.values()):
            card_grid.addWidget(card, i // 3, i % 3)
        left.addLayout(card_grid)

        quick_panel, quick_layout = self._panel(QGridLayout)
        actions = [
            ("Start Chat", lambda: self._set_page("AI Chat")),
            ("Voice Command", lambda: self._set_page("Voice Assistant")),
            ("Generate Image", lambda: self._set_page("Nano Banana Studio")),
            ("Run Diagnostic", self._run_diagnostics),
            ("Open Tools", lambda: self._set_page("Automation Center")),
            ("Check APIs", self._test_all_providers),
            ("Build Executable", self._build_exe),
        ]
        for i, (text, cb) in enumerate(actions):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            quick_layout.addWidget(btn, i // 4, i % 4)
        left.addWidget(quick_panel)

        metrics_panel, metrics_layout = self._panel(QGridLayout)
        self._metric_labels = {}
        for i, name in enumerate(("CPU", "Memory", "Network", "GPU", "Temp")):
            lbl = self._label(f"{name}: --", C.TEXT, 11, True)
            self._metric_labels[name] = lbl
            metrics_layout.addWidget(lbl, i // 3, i % 3)
        left.addWidget(metrics_panel)

        self._dashboard_feed = ActivityFeed()
        feed_panel, feed_layout = self._panel()
        feed_layout.addWidget(self._small_title("Activity Stream"))
        feed_layout.addWidget(self._dashboard_feed, stretch=1)
        left.addWidget(feed_panel, stretch=1)
        top.addLayout(left, stretch=3)
        self._dashboard_orb = CoreOrb(face_path)
        top.addWidget(self._dashboard_orb, stretch=2)
        layout.addLayout(top)
        return page

    def _build_chat_page(self) -> QWidget:
        page, layout = self._page("AI Chat", "Modern chat workspace with provider controls, quick prompts, export, and live assistant transcript.")
        controls, controls_layout = self._panel(QGridLayout)
        self._chat_provider = QComboBox()
        self._chat_provider.addItems(["Gemini Live", "Provider Router", "NVIDIA", "Local AI"])
        self._chat_mode = QComboBox()
        self._chat_mode.addItems(list(ProviderManager.modes.keys()))
        self._chat_model = QLineEdit(get_text_model())
        controls_layout.addWidget(self._small_title("Provider"), 0, 0)
        controls_layout.addWidget(self._chat_provider, 0, 1)
        controls_layout.addWidget(self._small_title("Mode"), 0, 2)
        controls_layout.addWidget(self._chat_mode, 0, 3)
        controls_layout.addWidget(self._small_title("Model"), 1, 0)
        controls_layout.addWidget(self._chat_model, 1, 1, 1, 3)
        layout.addWidget(controls)

        quick_grid = QGridLayout()
        prompts = [
            "Fix Code", "Explain Code", "Create Website Prompt", "Debug Error", "Write Email", "Summarize Text",
            "Study Plan", "Generate Ideas", "Make README", "Create Resume Line", "Translate to Hinglish",
            "Create Video Prompt", "Make GitHub Description", "Build App Feature Plan",
        ]
        for i, label in enumerate(prompts):
            btn = QPushButton(label)
            btn.clicked.connect(lambda _=False, t=label: self._use_quick_action(t))
            quick_grid.addWidget(btn, i // 4, i % 4)
        layout.addLayout(quick_grid)

        self._chat = ChatStream()
        self._chat.add_message("assistant", "B.R.A.C.E. online. Task received when you are ready.")
        layout.addWidget(self._chat, stretch=1)
        self._typing_lbl = self._label("", C.DIM, 8)
        layout.addWidget(self._typing_lbl)

        input_row = QHBoxLayout()
        self._input = QLineEdit()
        self._input.setPlaceholderText("Message B.R.A.C.E.")
        self._input.returnPressed.connect(self._send)
        input_row.addWidget(self._input, stretch=1)
        for text, cb in (("Send", self._send), ("Stop", lambda: self._apply_state("STOP REQUESTED")), ("Clear", self._clear_chat), ("Export", self._export_chat)):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            input_row.addWidget(btn)
        layout.addLayout(input_row)
        return page

    def _build_voice_page(self, face_path: str) -> QWidget:
        page, layout = self._page("Voice Assistant", "Live microphone input, spoken responses, language settings, and voice status monitoring.")
        row = QHBoxLayout()
        self._voice_orb = CoreOrb(face_path)
        row.addWidget(self._voice_orb, stretch=2)
        panel, panel_layout = self._panel()
        self._voice_status = self._label("Voice Module Ready" if not self._muted else "Voice Input Muted", C.CYAN, 20, True)
        panel_layout.addWidget(self._voice_status)
        self._mic_btn = QPushButton("Microphone Active")
        self._mic_btn.setMinimumHeight(48)
        self._mic_btn.clicked.connect(self._toggle_mute)
        panel_layout.addWidget(self._mic_btn)
        self._voice_output_check = QCheckBox("Play spoken responses")
        self._voice_output_check.setChecked(self._audio_output_enabled)
        self._voice_output_check.stateChanged.connect(self._set_audio_output_from_checkbox)
        panel_layout.addWidget(self._voice_output_check)
        quick_grid = QGridLayout()
        quick_actions = [
            ("Greet", lambda _=False: self._run_daily_action("greet")),
            ("Time", lambda _=False: self._run_daily_action("time")),
            ("Date", lambda _=False: self._run_daily_action("date")),
            ("Joke", lambda _=False: self._run_daily_action("joke")),
            ("List Music", lambda _=False: self._run_media_action("list")),
            ("Open Notes", lambda _=False: self._open_folder(Path(get_notes_dir()).expanduser())),
        ]
        for i, (text, cb) in enumerate(quick_actions):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            quick_grid.addWidget(btn, i // 3, i % 3)
        panel_layout.addWidget(self._small_title("Jarvis Quick Actions"))
        panel_layout.addLayout(quick_grid)
        for label, values in (
            ("Mode", ["Push to Talk", "Always Listening (disabled by default)", "Silent Mode"]),
            ("Language", ["Auto", "English", "Hindi", "Hinglish"]),
            ("Voice speed", ["Normal", "Slow", "Fast"]),
            ("Voice pitch", ["Normal", "Low", "High"]),
        ):
            combo = QComboBox()
            combo.addItems(values)
            panel_layout.addWidget(self._small_title(label))
            panel_layout.addWidget(combo)
        self._voice_feed = ActivityFeed()
        panel_layout.addWidget(self._voice_feed, stretch=1)
        row.addWidget(panel, stretch=3)
        layout.addLayout(row)
        self._style_mic_btn()
        return page

    def _build_automation_page(self) -> QWidget:
        page, layout = self._page("Automation Center", "Controlled local tools with safety labels and prompt handoff.")
        grid = QGridLayout()
        grid.setSpacing(12)
        for i, tool in enumerate(TOOLS):
            card, cl = self._panel()
            cl.addWidget(self._small_title(tool.name))
            cl.addWidget(self._label(tool.description))
            cl.addWidget(self._label(f"Status: {tool.status}", C.GREEN if tool.status == "Ready" else C.AMBER, 9, True))
            cl.addWidget(self._label(f"Safety: {tool.safety.value}", C.AMBER if "Confirmation" in tool.safety.value else C.RED if "Restricted" in tool.safety.value else C.GREEN, 9, True))
            row = QHBoxLayout()
            run = QPushButton("Run")
            setup = QPushButton("Setup")
            run.clicked.connect(lambda _=False, p=tool.prompt: self._send_prompt(p))
            setup.clicked.connect(lambda _=False, n=tool.name: self._handle_log(f"SYS: {n} setup is available from Settings or Diagnostics when required."))
            row.addWidget(run)
            row.addWidget(setup)
            cl.addLayout(row)
            grid.addWidget(card, i // 3, i % 3)
        layout.addLayout(grid)
        return page

    def _build_openclaw_page(self) -> QWidget:
        page, layout = self._page("OpenClaw Control Center", "Optional OpenClaw gateway detection and controlled management. Install/start actions require confirmation.")
        panel, grid = self._panel(QGridLayout)
        self._openclaw_labels = {}
        labels = ("Installed", "OpenClaw version", "Node version", "npm version", "Gateway status", "Gateway URL")
        for i, name in enumerate(labels):
            grid.addWidget(self._small_title(name), i, 0)
            lbl = self._label("Not checked")
            self._openclaw_labels[name] = lbl
            grid.addWidget(lbl, i, 1)
        layout.addWidget(panel)
        buttons = QHBoxLayout()
        for text, cb in (
            ("Check OpenClaw", self._check_openclaw),
            ("Run Doctor", self._openclaw_doctor),
            ("Start Gateway", self._openclaw_start),
            ("Stop Gateway", self._openclaw_stop),
            ("Open Onboarding", self._openclaw_onboard),
            ("Copy Gateway URL", lambda: self._copy_text(env("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789"))),
        ):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            buttons.addWidget(btn)
        layout.addLayout(buttons)
        self._openclaw_feed = ActivityFeed()
        layout.addWidget(self._openclaw_feed, stretch=1)
        return page

    def _build_mcp_page(self) -> QWidget:
        page, layout = self._page("MCP Server Manager", "Validate, inspect, and manage local MCP server configuration without storing secrets.")
        buttons = QHBoxLayout()
        for text, cb in (
            ("Validate JSON", self._validate_mcp),
            ("Add Nano Banana Default", self._add_nano_mcp_default),
            ("Start Nano Server", lambda: self._mcp_start("nano-banana")),
            ("Stop Nano Server", lambda: self._mcp_stop("nano-banana")),
            ("Copy Config", self._copy_mcp_config),
        ):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            buttons.addWidget(btn)
        layout.addLayout(buttons)
        self._mcp_feed = ActivityFeed()
        layout.addWidget(self._mcp_feed, stretch=1)
        QTimer.singleShot(0, self._show_mcp_config)
        return page

    def _build_nano_page(self) -> QWidget:
        page, layout = self._page("Nano Banana Image Studio", "Direct Gemini image generation/editing with optional Nano Banana MCP configuration.")
        form, form_layout = self._panel(QGridLayout)
        self._nano_prompt = QPlainTextEdit()
        self._nano_prompt.setPlaceholderText("Describe the image or edit you want.")
        self._nano_prompt.setMinimumHeight(120)
        self._nano_model = QComboBox()
        self._nano_model.addItems(["gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"])
        self._nano_aspect = QComboBox()
        self._nano_aspect.addItems(["1:1", "16:9", "9:16", "4:3", "3:4"])
        self._nano_quality = QComboBox()
        self._nano_quality.addItems(["1K", "2K", "4K"])
        form_layout.addWidget(self._small_title("Prompt"), 0, 0)
        form_layout.addWidget(self._nano_prompt, 0, 1, 1, 3)
        form_layout.addWidget(self._small_title("Model"), 1, 0)
        form_layout.addWidget(self._nano_model, 1, 1)
        form_layout.addWidget(self._small_title("Aspect"), 1, 2)
        form_layout.addWidget(self._nano_aspect, 1, 3)
        form_layout.addWidget(self._small_title("Image size"), 2, 0)
        form_layout.addWidget(self._nano_quality, 2, 1)
        layout.addWidget(form)
        buttons = QHBoxLayout()
        for text, cb in (
            ("Reference Image", self._select_nano_reference),
            ("Enhance Prompt", self._enhance_nano_prompt),
            ("Generate Image", self._generate_image),
            ("Reveal Output", lambda: self._open_folder(app_path("outputs", "images"))),
        ):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            buttons.addWidget(btn)
        layout.addLayout(buttons)
        self._nano_status = self._label("Status: waiting", C.TEXT2)
        layout.addWidget(self._nano_status)
        preview_row = QHBoxLayout()
        self._nano_preview = QLabel("Image preview")
        self._nano_preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._nano_preview.setMinimumHeight(280)
        self._nano_preview.setStyleSheet(f"border:1px solid {C.LINE}; border-radius:8px; color:{C.DIM}; background:rgba(5,18,34,150);")
        preview_row.addWidget(self._nano_preview, stretch=2)
        self._nano_history = ActivityFeed()
        preview_row.addWidget(self._nano_history, stretch=1)
        layout.addLayout(preview_row)
        QTimer.singleShot(0, self._refresh_nano_history)
        return page

    def _build_nvidia_page(self) -> QWidget:
        page, layout = self._page("NVIDIA AI Model Hub", "NVIDIA NIM / Build API support through the OpenAI-compatible endpoint.")
        panel, grid = self._panel(QGridLayout)
        self._nvidia_status = self._label(provider_key_status("NVIDIA_API_KEY"), C.AMBER)
        self._nvidia_base = QLineEdit(env("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"))
        self._nvidia_model = QLineEdit(env("NVIDIA_DEFAULT_MODEL", "paste_model_id_from_build_nvidia_com"))
        grid.addWidget(self._small_title("API key"), 0, 0)
        grid.addWidget(self._nvidia_status, 0, 1)
        grid.addWidget(self._small_title("Base URL"), 1, 0)
        grid.addWidget(self._nvidia_base, 1, 1)
        grid.addWidget(self._small_title("Default model"), 2, 0)
        grid.addWidget(self._nvidia_model, 2, 1)
        layout.addWidget(panel)
        buttons = QHBoxLayout()
        for text, cb in (
            ("Test NVIDIA API", self._test_nvidia),
            ("Run Sample Prompt", self._sample_nvidia),
            ("Copy Env Name", lambda: self._copy_text("NVIDIA_API_KEY")),
            ("Open NVIDIA Model Setup Guide", lambda: self._open_url("https://build.nvidia.com/")),
        ):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            buttons.addWidget(btn)
        layout.addLayout(buttons)
        self._nvidia_feed = ActivityFeed()
        layout.addWidget(self._nvidia_feed, stretch=1)
        return page

    def _build_provider_page(self) -> QWidget:
        page, layout = self._page("Provider Router", "Route tasks across Gemini, NVIDIA, local OpenAI-compatible servers, and future OpenClaw providers.")
        controls = QHBoxLayout()
        self._provider_mode = QComboBox()
        self._provider_mode.addItems(list(ProviderManager.modes.keys()))
        controls.addWidget(self._small_title("Routing mode"))
        controls.addWidget(self._provider_mode)
        test = QPushButton("Test All Providers")
        test.clicked.connect(self._test_all_providers)
        refresh = QPushButton("Refresh Status")
        refresh.clicked.connect(self._refresh_provider_status)
        controls.addWidget(test)
        controls.addWidget(refresh)
        layout.addLayout(controls)
        self._provider_feed = ActivityFeed()
        layout.addWidget(self._provider_feed, stretch=1)
        QTimer.singleShot(0, self._refresh_provider_status)
        return page

    def _build_memory_page(self) -> QWidget:
        page, layout = self._page("Memory Vault", "Local long-term memory viewer with search, export, and safe clearing.")
        controls = QHBoxLayout()
        self._memory_search = QLineEdit()
        self._memory_search.setPlaceholderText("Search memory")
        self._memory_search.returnPressed.connect(self._refresh_memory)
        controls.addWidget(self._memory_search, stretch=1)
        for text, cb in (("Refresh", self._refresh_memory), ("Export", self._export_memory), ("Clear All", self._clear_memory)):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            controls.addWidget(btn)
        layout.addLayout(controls)
        self._memory_feed = ActivityFeed()
        layout.addWidget(self._memory_feed, stretch=1)
        QTimer.singleShot(0, self._refresh_memory)
        return page

    def _build_file_intelligence_page(self) -> QWidget:
        page, layout = self._page("File Intelligence", "Select a file, then send summarization, code analysis, log explanation, or action extraction prompts safely.")
        self._file_intake = FileDropZone("Drop a PDF, code file, log, text, or data file")
        self._file_intake.file_selected.connect(self._on_file_selected)
        layout.addWidget(self._file_intake)
        grid = QGridLayout()
        actions = [
            ("Summarize File", "Summarize this file clearly: "),
            ("Analyze Code", "Analyze this code file and find issues: "),
            ("Explain Errors", "Explain errors in this log file: "),
            ("Extract Action Items", "Extract action items from this file: "),
            ("Search Inside", "Search inside this file for: "),
            ("Generate Notes", "Generate study notes from this file: "),
        ]
        for i, (label, prompt) in enumerate(actions):
            btn = QPushButton(label)
            btn.clicked.connect(lambda _=False, p=prompt: self._file_prompt(p))
            grid.addWidget(btn, i // 3, i % 3)
        layout.addLayout(grid)
        return page

    def _build_prompt_lab_page(self) -> QWidget:
        page, layout = self._page("Prompt Lab", "Prompt builder, improver, categories, quality hints, and one-click copy/export.")
        self._prompt_input = QPlainTextEdit()
        self._prompt_input.setPlaceholderText("Draft or paste a prompt here.")
        self._prompt_output = QPlainTextEdit()
        self._prompt_output.setPlaceholderText("Improved prompt appears here.")
        self._prompt_output.setMinimumHeight(160)
        layout.addWidget(self._prompt_input)
        buttons = QGridLayout()
        actions = [
            ("Improve", self._prompt_improve),
            ("More Detailed", self._prompt_detail),
            ("Shorter", self._prompt_shorter),
            ("Hindi/Hinglish", self._prompt_hinglish),
            ("Professional", self._prompt_professional),
            ("Copy", lambda: self._copy_text(self._prompt_output.toPlainText())),
            ("Export", self._export_prompt),
        ]
        for i, (text, cb) in enumerate(actions):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            buttons.addWidget(btn, i // 4, i % 4)
        layout.addLayout(buttons)
        layout.addWidget(self._prompt_output)
        return page

    def _build_code_copilot_page(self) -> QWidget:
        page, layout = self._page("Code Copilot", "Coding helper for explanations, bug finding, README drafts, terminal errors, and project structure prompts.")
        self._code_input = QPlainTextEdit()
        self._code_input.setPlaceholderText("Paste code, terminal errors, or a coding request.")
        self._code_input.setMinimumHeight(220)
        layout.addWidget(self._code_input)
        grid = QGridLayout()
        actions = [
            ("Explain Code", "Explain this code clearly:\n"),
            ("Find Bugs", "Find bugs and risky edge cases in this code:\n"),
            ("Improve Code", "Improve this code while preserving behavior:\n"),
            ("Convert Code", "Convert this code to the requested language:\n"),
            ("Generate README", "Create a README for this project/code:\n"),
            ("Commit Message", "Generate a concise commit message for this change:\n"),
            ("Explain Error", "Explain this terminal error and give fix steps:\n"),
            ("Deployment Help", "Troubleshoot this deployment problem:\n"),
        ]
        for i, (text, prefix) in enumerate(actions):
            btn = QPushButton(text)
            btn.clicked.connect(lambda _=False, p=prefix: self._code_to_chat(p))
            grid.addWidget(btn, i // 4, i % 4)
        layout.addLayout(grid)
        return page

    def _build_web_intelligence_page(self) -> QWidget:
        page, layout = self._page("Web Intelligence", "Research prompts with source-link discipline and no hallucinated citations.")
        self._web_topic = QLineEdit()
        self._web_topic.setPlaceholderText("Research topic or URL")
        layout.addWidget(self._web_topic)
        grid = QGridLayout()
        actions = [
            ("Summarize Results", "Search the web and summarize key points with source links: "),
            ("Compare Sources", "Compare multiple sources and show disagreements: "),
            ("Create Report", "Create a concise research report with citations: "),
            ("Extract Key Points", "Extract key points and useful links for: "),
        ]
        for i, (text, prefix) in enumerate(actions):
            btn = QPushButton(text)
            btn.clicked.connect(lambda _=False, p=prefix: self._web_to_chat(p))
            grid.addWidget(btn, i // 2, i % 2)
        layout.addLayout(grid)
        return page

    def _build_diagnostics_page(self) -> QWidget:
        page, layout = self._page("System Diagnostics", "Check runtime, providers, microphone, folders, Node/npm, OpenClaw, MCP, and build tools.")
        row = QHBoxLayout()
        for text, cb in (("Run Full Check", self._run_diagnostics), ("Copy Report", self._copy_diagnostic_report), ("Export Report", self._export_diagnostic_report), ("Open Logs", lambda: self._open_folder(app_path("logs")))):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            row.addWidget(btn)
        layout.addLayout(row)
        self._diagnostics_feed = ActivityFeed()
        layout.addWidget(self._diagnostics_feed, stretch=1)
        return page

    def _build_settings_page(self) -> QWidget:
        page, layout = self._page("Settings", "Configuration status, Safe Mode, provider key vault, and local app preferences. Secrets stay in .env.")
        panel, grid = self._panel(QGridLayout)
        rows = [
            ("Gemini API", masked_api_key()),
            ("NVIDIA API", provider_key_status("NVIDIA_API_KEY")),
            ("OpenAI API", provider_key_status("OPENAI_API_KEY")),
            ("Anthropic API", provider_key_status("ANTHROPIC_API_KEY")),
            ("Groq API", provider_key_status("GROQ_API_KEY")),
            ("OpenRouter API", provider_key_status("OPENROUTER_API_KEY")),
            ("Live model", get_live_model()),
            ("Text model", get_text_model()),
            ("Voice", get_voice_name()),
        ]
        for i, (name, value) in enumerate(rows):
            grid.addWidget(self._small_title(name), i, 0)
            grid.addWidget(self._label(value), i, 1)
        layout.addWidget(panel)

        prefs, prefs_layout = self._panel(QGridLayout)
        self._safe_mode_check = QCheckBox("Safe Mode enabled")
        self._safe_mode_check.setChecked(bool(self.settings.get("safe_mode", True)))
        self._safe_mode_check.stateChanged.connect(lambda state: self.settings.set("safe_mode", state == int(Qt.CheckState.Checked.value)))
        self._memory_check = QCheckBox("Memory enabled")
        self._memory_check.setChecked(bool(self.settings.get("memory_enabled", True)))
        self._memory_check.stateChanged.connect(lambda state: self.settings.set("memory_enabled", state == int(Qt.CheckState.Checked.value)))
        prefs_layout.addWidget(self._safe_mode_check, 0, 0)
        prefs_layout.addWidget(self._memory_check, 0, 1)
        self._theme_combo = QComboBox()
        self._theme_combo.addItems(["Neon dark", "Deep space", "High contrast"])
        self._theme_combo.setCurrentText(str(self.settings.get("theme", "Neon dark")))
        self._theme_combo.currentTextChanged.connect(lambda value: self.settings.set("theme", value))
        self._startup_combo = QComboBox()
        self._startup_combo.addItems(self._nav_names())
        self._startup_combo.setCurrentText(str(self.settings.get("startup_page", "Dashboard")))
        self._startup_combo.currentTextChanged.connect(lambda value: self.settings.set("startup_page", value))
        self._assistant_name_input = QLineEdit(get_assistant_name())
        self._assistant_name_input.editingFinished.connect(lambda: self.settings.set("assistant_name", self._assistant_name_input.text().strip() or "B.R.A.C.E."))
        self._music_dir_input = QLineEdit(get_music_dir())
        self._music_dir_input.editingFinished.connect(lambda: self.settings.set("music_dir", self._music_dir_input.text().strip() or "~/Music"))
        music_browse = QPushButton("Browse")
        music_browse.clicked.connect(self._choose_music_dir)
        self._notes_dir_input = QLineEdit(get_notes_dir())
        self._notes_dir_input.editingFinished.connect(lambda: self.settings.set("notes_dir", self._notes_dir_input.text().strip() or "./outputs/notes"))
        notes_browse = QPushButton("Browse")
        notes_browse.clicked.connect(self._choose_notes_dir)
        self._legacy_voice_check = QCheckBox("Legacy offline TTS")
        self._legacy_voice_check.setChecked(get_legacy_voice_enabled())
        self._legacy_voice_check.stateChanged.connect(lambda state: self.settings.set("legacy_voice_enabled", state == int(Qt.CheckState.Checked.value)))
        self._legacy_stt_check = QCheckBox("Legacy speech recognition")
        self._legacy_stt_check.setChecked(get_legacy_stt_enabled())
        self._legacy_stt_check.stateChanged.connect(lambda state: self.settings.set("legacy_stt_enabled", state == int(Qt.CheckState.Checked.value)))
        prefs_layout.addWidget(self._small_title("Theme"), 1, 0)
        prefs_layout.addWidget(self._theme_combo, 1, 1)
        prefs_layout.addWidget(self._small_title("Startup page"), 2, 0)
        prefs_layout.addWidget(self._startup_combo, 2, 1)
        prefs_layout.addWidget(self._small_title("Assistant name"), 3, 0)
        prefs_layout.addWidget(self._assistant_name_input, 3, 1)
        prefs_layout.addWidget(self._small_title("Music folder"), 4, 0)
        prefs_layout.addWidget(self._music_dir_input, 4, 1)
        prefs_layout.addWidget(music_browse, 4, 2)
        prefs_layout.addWidget(self._small_title("Notes folder"), 5, 0)
        prefs_layout.addWidget(self._notes_dir_input, 5, 1)
        prefs_layout.addWidget(notes_browse, 5, 2)
        prefs_layout.addWidget(self._legacy_voice_check, 6, 0)
        prefs_layout.addWidget(self._legacy_stt_check, 6, 1)
        layout.addWidget(prefs)

        row = QHBoxLayout()
        for text, cb in (
            ("Copy GEMINI_API_KEY", lambda: self._copy_text("GEMINI_API_KEY")),
            ("Open .env.example", lambda: self._open_path(app_path(".env.example"))),
            ("Validate Environment", self._run_diagnostics),
            ("Reset Settings", self._reset_settings),
            ("Clear Logs", self._clear_logs),
        ):
            btn = QPushButton(text)
            btn.clicked.connect(cb)
            row.addWidget(btn)
        layout.addLayout(row)
        return page

    def _build_about_page(self, face_path: str) -> QWidget:
        page, layout = self._page("About B.R.A.C.E.")
        row = QHBoxLayout()
        row.addWidget(CoreOrb(face_path), stretch=2)
        panel, pl = self._panel()
        pl.addWidget(self._label("B.R.A.C.E.", C.CYAN, 26, True))
        pl.addWidget(self._label("Brain-like Responsive Assistant for Creation and Execution", C.TEXT, 16, True))
        pl.addWidget(self._label("Version: 1.0.0"))
        pl.addWidget(self._label("Tech stack: Python, PyQt6, Gemini Live, local automation tools, OpenAI-compatible providers, MCP process management."))
        pl.addWidget(self._label(f"Safety Mode: {'Enabled' if get_safe_mode() else 'Disabled'}"))
        pl.addWidget(self._label("Creator: Your name here"))
        pl.addWidget(self._label("Credits and licenses should be reviewed before distribution. No secrets are shown here."))
        row.addWidget(panel, stretch=3)
        layout.addLayout(row)
        return page

    def _run_worker(self, label: str, fn: Callable, on_result: Callable | None = None):
        self._handle_log(f"SYS: {label} started.")
        worker = Worker(fn)
        worker.signals.result.connect(lambda result: self._worker_result(label, result, on_result))
        worker.signals.error.connect(lambda error: self._handle_log(f"ERR: {label} failed: {error[-900:]}"))
        self.pool.start(worker)

    def _worker_result(self, label: str, result: object, on_result: Callable | None):
        self._handle_log(f"SYS: {label} complete.")
        if on_result:
            on_result(result)
        else:
            self._handle_log(result)

    def _confirm(self, action: str, preview: str) -> bool:
        params = {"action": "write"} if action == "file_controller" else {}
        decision = self.security.evaluate_tool(action, params)
        if decision.level.value == "Safe":
            return True
        msg = QMessageBox(self)
        msg.setIcon(QMessageBox.Icon.Warning)
        msg.setWindowTitle("B.R.A.C.E. Permission Required")
        msg.setText("B.R.A.C.E. needs permission before executing this action. Continue?")
        msg.setInformativeText(preview)
        msg.setStandardButtons(QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        return msg.exec() == QMessageBox.StandardButton.Yes

    def _check_openclaw(self):
        self._run_worker("OpenClaw check", self.openclaw.detect, self._show_openclaw_status)

    def _show_openclaw_status(self, status):
        values = {
            "Installed": "Yes" if status.installed else "No",
            "OpenClaw version": status.openclaw_version,
            "Node version": status.node_version,
            "npm version": status.npm_version,
            "Gateway status": status.gateway_status,
            "Gateway URL": status.gateway_url,
        }
        for key, value in values.items():
            self._openclaw_labels[key].setText(str(value))
        self._openclaw_feed.append(json.dumps(values, indent=2))
        self._dashboard_cards["openclaw"].set_value(values["Installed"])

    def _openclaw_doctor(self):
        if self._confirm("openclaw", "Run openclaw doctor in the background."):
            self._run_worker("OpenClaw doctor", self.openclaw.run_doctor, self._openclaw_feed.append)

    def _openclaw_start(self):
        if self._confirm("openclaw", "Start openclaw gateway on the configured local port."):
            self._run_worker("OpenClaw gateway start", self.openclaw.start_gateway, self._openclaw_feed.append)

    def _openclaw_stop(self):
        if self._confirm("openclaw", "Stop the B.R.A.C.E.-managed OpenClaw gateway process."):
            self._run_worker("OpenClaw gateway stop", self.openclaw.stop_gateway, self._openclaw_feed.append)

    def _openclaw_onboard(self):
        if self._confirm("openclaw", "Run openclaw onboard --install-daemon. This may change OpenClaw local configuration."):
            self._run_worker("OpenClaw onboarding", self.openclaw.onboard, self._openclaw_feed.append)

    def _validate_mcp(self):
        result = self.mcp.validate()
        self._mcp_feed.append(f"{'OK' if result.ok else 'ERROR'}: {result.message}")
        self._show_mcp_config()

    def _show_mcp_config(self):
        self._mcp_feed.clear()
        self._mcp_feed.append(json.dumps(self.mcp.config.load(), indent=2))

    def _add_nano_mcp_default(self):
        package = env("NANO_BANANA_MCP_PACKAGE", "nano-banana-mcp")
        self.mcp.ensure_nano_banana_default(package)
        self._mcp_feed.append(f"Nano Banana MCP config saved with package: {package}")
        self._show_mcp_config()

    def _mcp_start(self, name: str):
        if self._confirm("mcp_server", f"Start MCP server: {name}"):
            self._run_worker(f"MCP start {name}", lambda: self.mcp.start(name), self._mcp_feed.append)

    def _mcp_stop(self, name: str):
        if self._confirm("mcp_server", f"Stop MCP server: {name}"):
            self._run_worker(f"MCP stop {name}", lambda: self.mcp.stop(name), self._mcp_feed.append)

    def _copy_mcp_config(self):
        self._copy_text(json.dumps(self.mcp.config.load(), indent=2))

    def _select_nano_reference(self):
        path, _ = QFileDialog.getOpenFileName(self, "Select reference image", str(Path.home()), "Images (*.png *.jpg *.jpeg *.webp)")
        if path:
            self._nano_reference = path
            self._nano_status.setText(f"Reference: {Path(path).name}")

    def _enhance_nano_prompt(self):
        self._nano_prompt.setPlainText(enhance_prompt(self._nano_prompt.toPlainText()))

    def _generate_image(self):
        prompt = self._nano_prompt.toPlainText().strip()
        model = self._nano_model.currentText()
        aspect = self._nano_aspect.currentText()
        size = self._nano_quality.currentText()
        self._nano_status.setText("Generating image...")
        self._run_worker(
            "Nano Banana generation",
            lambda: self.nano.generate(prompt, model=model, reference_path=self._nano_reference, aspect_ratio=aspect, image_size=size),
            self._show_nano_result,
        )

    def _show_nano_result(self, result: NanoBananaResult):
        self._nano_status.setText(result.message)
        if result.ok and result.image_path:
            px = QPixmap(result.image_path)
            if not px.isNull():
                self._nano_preview.setPixmap(px.scaled(self._nano_preview.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        self._refresh_nano_history()

    def _refresh_nano_history(self):
        self._nano_history.clear()
        for record in self.nano.recent()[:12]:
            self._nano_history.append(f"{Path(record.path).name}\n{record.model}\n{record.prompt[:120]}")

    def _test_nvidia(self):
        provider = self.providers.providers["nvidia"]
        self._run_worker("NVIDIA test", provider.test_connection, lambda status: self._nvidia_feed.append(status))

    def _sample_nvidia(self):
        provider = self.providers.providers["nvidia"]
        self._run_worker("NVIDIA sample", lambda: provider.chat("Reply with a short B.R.A.C.E. readiness line."), self._nvidia_feed.append)

    def _refresh_provider_status(self):
        self._provider_feed.clear()
        for status in self.providers.statuses():
            self._provider_feed.append(
                f"{status.name.upper()} | enabled={status.enabled} | configured={status.configured} | "
                f"model={status.model or 'not set'} | latency={status.latency_ms or '-'} | last_error={status.last_error or '-'}"
            )

    def _test_all_providers(self):
        self._run_worker("Provider tests", self.providers.test_all, self._show_provider_tests)

    def _show_provider_tests(self, statuses):
        self._provider_feed.clear()
        for status in statuses:
            self._provider_feed.append(
                f"{status.name.upper()} | configured={status.configured} | latency={status.latency_ms or '-'} ms | "
                f"error={status.last_error or '-'}"
            )

    def _refresh_memory(self):
        query = self._memory_search.text() if hasattr(self, "_memory_search") else ""
        self._memory_feed.clear()
        entries = self.memory.search(query)
        if not entries:
            self._memory_feed.append("No matching memory entries.")
            return
        for entry in entries:
            self._memory_feed.append(entry)

    def _export_memory(self):
        path, _ = QFileDialog.getSaveFileName(self, "Export memory", str(Path.home() / "brace_memory.json"), "JSON (*.json)")
        if path:
            self._memory_feed.append(f"Exported: {self.memory.export(path)}")

    def _clear_memory(self):
        if self._confirm("file_controller", "Clear all local B.R.A.C.E. memory."):
            self.memory.clear()
            self._refresh_memory()
            self._handle_log("SYS: Memory cleared.")

    def _file_prompt(self, prefix: str):
        path = self.current_file
        if not path:
            self._handle_log("SYS: Select a file first.")
            return
        self._send_prompt(f"{prefix}{path}")

    def _prompt_text(self) -> str:
        return self._prompt_input.toPlainText().strip()

    def _set_prompt_output(self, text: str):
        self._prompt_output.setPlainText(text)

    def _prompt_improve(self):
        self._set_prompt_output(f"Act as an expert prompt engineer. Improve this prompt for clarity, constraints, output format, and success criteria:\n\n{self._prompt_text()}")

    def _prompt_detail(self):
        self._set_prompt_output(f"{self._prompt_text()}\n\nAdd detailed context, constraints, examples, edge cases, and the exact desired output format.")

    def _prompt_shorter(self):
        text = self._prompt_text()
        self._set_prompt_output(f"Condense this prompt while preserving the goal and constraints:\n\n{text}")

    def _prompt_hinglish(self):
        self._set_prompt_output(f"Rewrite this prompt in natural Hindi/Hinglish while keeping technical terms clear:\n\n{self._prompt_text()}")

    def _prompt_professional(self):
        self._set_prompt_output(f"Rewrite this prompt in a professional, direct, production-ready style:\n\n{self._prompt_text()}")

    def _export_prompt(self):
        path, _ = QFileDialog.getSaveFileName(self, "Export prompt", str(Path.home() / "brace_prompt.md"), "Markdown (*.md);;Text (*.txt)")
        if path:
            Path(path).write_text(self._prompt_output.toPlainText(), encoding="utf-8")

    def _code_to_chat(self, prefix: str):
        self._send_prompt(prefix + self._code_input.toPlainText())

    def _web_to_chat(self, prefix: str):
        topic = self._web_topic.text().strip()
        if topic:
            self._send_prompt(prefix + topic)

    def _run_daily_action(self, action: str):
        from actions.daily_assistant import daily_assistant

        self._run_worker(
            f"Daily assistant {action}",
            lambda: daily_assistant({"action": action}, player=self),
            self._show_voice_tool_result,
        )

    def _run_media_action(self, action: str):
        from actions.media_player import media_player

        self._run_worker(
            f"Media {action}",
            lambda: media_player({"action": action}, player=self),
            self._show_voice_tool_result,
        )

    def _show_voice_tool_result(self, result: object):
        text = str(result)
        if hasattr(self, "_voice_feed"):
            self._voice_feed.append(text)
        if hasattr(self, "_dashboard_feed"):
            self._dashboard_feed.append(text)

    def _run_diagnostics(self):
        self._run_worker("Diagnostics", self.diagnostics.run_full, self._show_diagnostics)

    def _show_diagnostics(self, results: list[CheckResult]):
        report = self.diagnostics.format_report(results)
        self._latest_diagnostic_report = report
        if hasattr(self, "_diagnostics_feed"):
            self._diagnostics_feed.clear()
            for result in results:
                color = C.GREEN if result.status == "ok" else C.AMBER if result.status == "warn" else C.RED
                self._diagnostics_feed.append(f"{result.name}: {result.status.upper()} - {result.detail}")
        self._dashboard_cards["health"].set_value("Checked")
        self._handle_log("SYS: Diagnostics complete.")

    def _copy_diagnostic_report(self):
        self._copy_text(self._latest_diagnostic_report or "Run diagnostics first.")

    def _export_diagnostic_report(self):
        path, _ = QFileDialog.getSaveFileName(self, "Export diagnostic report", str(Path.home() / "brace_diagnostics.txt"), "Text (*.txt)")
        if path:
            Path(path).write_text(self._latest_diagnostic_report or "Run diagnostics first.", encoding="utf-8")

    def _choose_music_dir(self):
        path = QFileDialog.getExistingDirectory(self, "Choose music folder", self._music_dir_input.text() or str(Path.home() / "Music"))
        if path:
            self._music_dir_input.setText(path)
            self.settings.set("music_dir", path)

    def _choose_notes_dir(self):
        path = QFileDialog.getExistingDirectory(self, "Choose notes folder", self._notes_dir_input.text() or str(app_path("outputs", "notes")))
        if path:
            self._notes_dir_input.setText(path)
            self.settings.set("notes_dir", path)

    def _reset_settings(self):
        if self._confirm("file_controller", "Reset local app_settings.json to defaults."):
            self.settings.data = dict(SettingsService.defaults)
            self.settings.save()
            self._handle_log("SYS: Settings reset. Restart B.R.A.C.E. to reload all preferences.")

    def _clear_logs(self):
        if self._confirm("file_controller", "Clear local B.R.A.C.E. logs."):
            clear_logs()
            self._handle_log("SYS: Logs cleared.")

    def _build_exe(self):
        if self._confirm("generated_code", "Run PyInstaller through build.py to create BRACE.exe."):
            self._run_worker("Executable build", build_executable, self._show_build_result)

    def _show_build_result(self, result):
        self._handle_log(f"SYS: Build {'complete' if result.ok else 'failed'}: {result.exe_path or 'no executable'}")
        if hasattr(self, "_diagnostics_feed"):
            self._diagnostics_feed.append(result.output or result.exe_path)

    def _send_prompt(self, text: str):
        self._set_page("AI Chat")
        self._input.setText(text)
        self._input.setFocus()
        self._input.setCursorPosition(len(text))

    def _use_quick_action(self, label: str):
        templates = {
            "Fix Code": "Fix this code and explain the changes:\n",
            "Explain Code": "Explain this code clearly:\n",
            "Create Website Prompt": "Create a detailed website prompt for:\n",
            "Debug Error": "Debug this error and give exact fix steps:\n",
            "Write Email": "Write a clear email about:\n",
            "Summarize Text": "Summarize this text:\n",
            "Study Plan": "Create a practical study plan for:\n",
            "Generate Ideas": "Generate strong ideas for:\n",
            "Make README": "Create a professional README for:\n",
            "Create Resume Line": "Create a resume bullet for:\n",
            "Translate to Hinglish": "Translate this naturally to Hinglish:\n",
            "Create Video Prompt": "Create a cinematic AI video prompt for:\n",
            "Make GitHub Description": "Create a GitHub repo description for:\n",
            "Build App Feature Plan": "Create a feature implementation plan for:\n",
        }
        self._send_prompt(templates.get(label, label + ": "))

    def _send(self):
        text = self._input.text().strip()
        if not text:
            return
        self._input.clear()
        self._chat.add_message("user", text)
        self._dashboard_feed.append(f"USER: {text}")
        if hasattr(self, "_voice_feed"):
            self._voice_feed.append(f"USER: {text}")
        if not is_configured():
            message = "GEMINI_API_KEY is not configured. Add a real key to .env and restart B.R.A.C.E."
            self._chat.add_message("assistant", message)
            self._dashboard_feed.append(f"B.R.A.C.E.: {message}")
            self._apply_state("CONFIG REQUIRED")
            self._set_page("Settings")
            return
        self._typing_lbl.setText("B.R.A.C.E. is processing...")
        self._apply_state("THINKING")
        if self.on_text_command:
            self.on_text_command(text)

    def _clear_chat(self):
        self._chat.clear_messages()
        self._chat.add_message("assistant", "Chat cleared. B.R.A.C.E. is ready.")

    def _export_chat(self):
        path, _ = QFileDialog.getSaveFileName(self, "Export chat", str(Path.home() / "brace_chat.md"), "Markdown (*.md);;Text (*.txt);;JSON (*.json)")
        if not path:
            return
        target = Path(path)
        if target.suffix.lower() == ".json":
            target.write_text(json.dumps(self._chat.messages, indent=2, ensure_ascii=False), encoding="utf-8")
        else:
            target.write_text(self._chat.markdown(), encoding="utf-8")
        self._handle_log(f"SYS: Chat exported to {target}")

    def _on_file_selected(self, path: str):
        self._current_file = path
        try:
            size = fmt_size(Path(path).stat().st_size)
        except Exception:
            size = "unknown size"
        self._dashboard_feed.append(f"FILE: {Path(path).name} attached ({size})")
        if hasattr(self, "_chat"):
            self._chat.add_message("assistant", f"I can access {Path(path).name}. Tell me what you want done with it.")

    def _after_boot(self):
        self._apply_state("SYSTEM ONLINE" if is_configured() else "CONFIG REQUIRED")
        if hasattr(self, "_dashboard_feed"):
            self._dashboard_feed.append("SYS: B.R.A.C.E. interface initialized.")

    def resizeEvent(self, event):
        super().resizeEvent(event)
        compact = self.width() < 1040
        self._side_nav.setVisible(not compact)
        self._bottom_nav.setVisible(compact)
        if hasattr(self, "_boot") and self._boot.isVisible():
            self._boot.setGeometry(self.centralWidget().rect())

    def _toggle_fullscreen(self):
        self.showNormal() if self.isFullScreen() else self.showFullScreen()

    def _tick_clock(self):
        self._clock_lbl.setText(time.strftime("%H:%M:%S"))

    def _update_metrics(self):
        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory().percent
            net = psutil.net_io_counters()
            values = {
                "CPU": f"CPU: {cpu:.0f}%",
                "Memory": f"Memory: {mem:.0f}%",
                "Network": f"Network: {(net.bytes_sent + net.bytes_recv) / (1024 ** 2):.0f}MB total",
                "GPU": "GPU: detect via diagnostics",
                "Temp": "Temp: N/A",
            }
            for name, value in values.items():
                if name in self._metric_labels:
                    self._metric_labels[name].setText(value)
        except Exception:
            pass

    def _toggle_mute(self):
        self._muted = not self._muted
        if hasattr(self, "_voice_input_check"):
            self._voice_input_check.blockSignals(True)
            self._voice_input_check.setChecked(not self._muted)
            self._voice_input_check.blockSignals(False)
        self._style_mic_btn()
        self._apply_state("MUTED" if self._muted else "LISTENING")
        self._handle_log("SYS: Microphone muted." if self._muted else "SYS: Microphone active.")

    def _set_audio_output_from_checkbox(self, state: int):
        self._audio_output_enabled = state == int(Qt.CheckState.Checked.value)
        self._handle_log("SYS: Spoken responses enabled." if self._audio_output_enabled else "SYS: Spoken responses disabled.")

    def _style_mic_btn(self):
        if not hasattr(self, "_mic_btn"):
            return
        if self._muted:
            self._mic_btn.setText("Microphone Muted")
            self._mic_btn.setStyleSheet(f"color:{C.RED}; border:1px solid {C.RED};")
            self._voice_status.setText("Voice Input Muted")
        else:
            self._mic_btn.setText("Microphone Active")
            self._mic_btn.setStyleSheet(f"color:{C.GREEN}; border:1px solid {C.GREEN};")
            self._voice_status.setText("Listening Channel Ready")
        for orb in (getattr(self, "_dashboard_orb", None), getattr(self, "_voice_orb", None)):
            if orb:
                orb.muted = self._muted

    def _apply_state(self, state: str):
        self._state = state.upper()
        if hasattr(self, "_status_chip"):
            self._status_chip.setText(self._state)
            if "CONFIG" in self._state or "ERROR" in self._state:
                self._status_chip.setStyleSheet(self._chip_style(C.RED))
            elif self._state in {"LISTENING", "SYSTEM ONLINE"}:
                self._status_chip.setStyleSheet(self._chip_style(C.GREEN))
            elif self._state in {"THINKING", "PROCESSING", "SPEAKING"}:
                self._status_chip.setStyleSheet(self._chip_style(C.AMBER))
            else:
                self._status_chip.setStyleSheet(self._chip_style(C.CYAN))
        for orb in (getattr(self, "_dashboard_orb", None), getattr(self, "_voice_orb", None)):
            if orb:
                orb.state = self._state
                orb.speaking = self._state == "SPEAKING"

    def _handle_log(self, raw: object):
        text = str(raw or "").strip()
        if not text:
            return
        if hasattr(self, "_typing_lbl"):
            self._typing_lbl.setText("")
        lower = text.lower()
        if lower.startswith("you:") and hasattr(self, "_chat"):
            self._chat.add_message("user", text.split(":", 1)[1].strip())
        elif (lower.startswith("b.r.a.c.e.:") or lower.startswith("brace:")) and hasattr(self, "_chat"):
            msg = text.split(":", 1)[1].strip()
            self._chat.add_message("assistant", msg)
            if hasattr(self, "_voice_feed"):
                self._voice_feed.append(text)
        else:
            if hasattr(self, "_dashboard_feed"):
                self._dashboard_feed.append(text)
            if hasattr(self, "_voice_feed"):
                self._voice_feed.append(text)

    def _copy_text(self, text: str):
        QApplication.clipboard().setText(str(text))
        self._handle_log("SYS: Copied to clipboard.")

    def _open_folder(self, path: Path):
        path.mkdir(parents=True, exist_ok=True)
        self._open_path(path)

    def _open_path(self, path: Path):
        try:
            if sys.platform == "win32":
                os.startfile(str(path))
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(path)])
            else:
                subprocess.Popen(["xdg-open", str(path)])
        except Exception as exc:
            self._handle_log(f"ERR: Could not open path: {exc}")

    def _open_url(self, url: str):
        import webbrowser

        webbrowser.open(url)

    @property
    def muted(self) -> bool:
        return self._muted

    @muted.setter
    def muted(self, value: bool):
        if bool(value) != self._muted:
            self._toggle_mute()

    @property
    def audio_output_enabled(self) -> bool:
        return self._audio_output_enabled

    @property
    def current_file(self) -> str:
        drop = getattr(self, "_file_intake", None)
        return self._current_file or (drop.current_file() if drop else "")


class _RootShim:
    def __init__(self, app: QApplication):
        self.app = app

    def mainloop(self):
        sys.exit(self.app.exec())


class BraceUI:
    def __init__(self, face_path: str = "", size=None):
        set_windows_app_id()
        self._app = QApplication.instance() or QApplication(sys.argv)
        self._app.setStyle("Fusion")
        self._app.setWindowIcon(QIcon(str(icon_path())))
        self._win = MainWindow(face_path)
        self._win.show()
        self.root = _RootShim(self._app)

    @property
    def muted(self) -> bool:
        return self._win.muted

    @muted.setter
    def muted(self, value: bool):
        self._win.muted = value

    @property
    def audio_output_enabled(self) -> bool:
        return self._win.audio_output_enabled

    @property
    def current_file(self) -> str:
        return self._win.current_file

    @property
    def on_text_command(self):
        return self._win.on_text_command

    @on_text_command.setter
    def on_text_command(self, callback):
        self._win.on_text_command = callback

    def set_state(self, state: str):
        self._win._state_sig.emit(state)

    def write_log(self, text: str):
        self._win._log_sig.emit(str(text))

    def wait_for_api_key(self):
        return

    def start_speaking(self):
        self.set_state("SPEAKING")

    def stop_speaking(self):
        if not self.muted:
            self.set_state("LISTENING")
