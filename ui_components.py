# B.R.A.C.E. Premium UI Components
from __future__ import annotations

import math
import time
from pathlib import Path
from typing import Callable, Optional

from PyQt6.QtCore import (
    QEasingCurve, QPoint, QPropertyAnimation, QRect, QSize, Qt,
    QTimer, pyqtProperty, pyqtSignal, pyqtSlot, QObject, QRunnable,
)
from PyQt6.QtGui import (
    QColor, QFont, QIcon, QPainter, QPen, QPixmap, QRadialGradient,
    QLinearGradient, QBrush, QPainterPath,
)
from PyQt6.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QFileDialog, QFrame,
    QGraphicsDropShadowEffect, QGridLayout, QHBoxLayout, QLabel,
    QLineEdit, QMainWindow, QPlainTextEdit, QPushButton, QScrollArea,
    QSizePolicy, QStackedWidget, QVBoxLayout, QWidget, QGraphicsOpacityEffect,
)

from ui_design import C, S, qcolor, heading, body, mono, caption, label_font, NAV_ICONS


# ── Worker (thread pool helper) ──────────────────────────────────

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
        import traceback
        try:
            self.signals.result.emit(self.fn(*self.args, **self.kwargs))
        except Exception:
            self.signals.error.emit(traceback.format_exc())
        finally:
            self.signals.finished.emit()


# ── Glow Effect Helper ───────────────────────────────────────────

def glow_effect(color: str = C.CYAN, radius: int = 18, offset: int = 0) -> QGraphicsDropShadowEffect:
    """Create a glowing drop shadow."""
    effect = QGraphicsDropShadowEffect()
    effect.setColor(qcolor(color, 80))
    effect.setBlurRadius(radius)
    effect.setOffset(offset, offset)
    return effect


# ── Section Header ───────────────────────────────────────────────

class SectionHeader(QWidget):
    """Uppercase label with accent underline."""

    def __init__(self, text: str, color: str = C.CYAN):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, S.SM, 0, S.SM)
        layout.setSpacing(S.XXS)

        lbl = QLabel(text.upper())
        lbl.setFont(label_font())
        lbl.setStyleSheet(f"color:{color}; background:transparent;")
        layout.addWidget(lbl)

        line = QFrame()
        line.setFixedHeight(2)
        line.setStyleSheet(f"background: qlineargradient(x1:0,y1:0,x2:1,y2:0, stop:0 {color}, stop:1 transparent);")
        layout.addWidget(line)


# ── Glass Card ───────────────────────────────────────────────────

class GlassCard(QWidget):
    """Premium glassmorphism card with hover glow effect."""

    clicked = pyqtSignal()

    def __init__(self, clickable: bool = False, parent=None):
        super().__init__(parent)
        self._clickable = clickable
        self._hovered = False
        self.setObjectName("glassCard")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._apply_base_style()
        if clickable:
            self.setCursor(Qt.CursorShape.PointingHandCursor)

    def _apply_base_style(self):
        self.setStyleSheet(f"""
            QWidget#glassCard {{
                background: {C.GLASS};
                border: 1px solid {C.BORDER};
                border-radius: 10px;
            }}
        """)

    def enterEvent(self, event):
        self._hovered = True
        self.setStyleSheet(f"""
            QWidget#glassCard {{
                background: {C.GLASS_HOVER};
                border: 1px solid {C.BORDER_HI};
                border-radius: 10px;
            }}
        """)
        super().enterEvent(event)

    def leaveEvent(self, event):
        self._hovered = False
        self._apply_base_style()
        super().leaveEvent(event)

    def mousePressEvent(self, event):
        if self._clickable:
            self.clicked.emit()
        super().mousePressEvent(event)


# ── Neon Button ──────────────────────────────────────────────────

class NeonButton(QPushButton):
    """Glowing button with hover effect."""

    def __init__(self, text: str, color: str = C.CYAN, icon_text: str = "", parent=None):
        display = f"{icon_text}  {text}" if icon_text else text
        super().__init__(display, parent)
        self._color = color
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(38)
        self.setFont(body(9, bold=True))
        self._apply_base_style()

    def _apply_base_style(self):
        self.setStyleSheet(f"""
            QPushButton {{
                background: {C.GLASS};
                color: {C.TEXT};
                border: 1px solid {C.BORDER2};
                border-radius: 8px;
                padding: 8px 16px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                background: rgba({_hex_to_rgb(self._color)},35);
                border: 1px solid {self._color};
                color: {self._color};
            }}
            QPushButton:pressed {{
                background: rgba({_hex_to_rgb(self._color)},55);
            }}
        """)


def _hex_to_rgb(hex_color: str) -> str:
    """Convert #RRGGBB to 'R,G,B' string."""
    c = QColor(hex_color)
    return f"{c.red()},{c.green()},{c.blue()}"


# ── Primary Action Button ───────────────────────────────────────

class PrimaryButton(QPushButton):
    """Filled accent button for primary actions."""

    def __init__(self, text: str, color: str = C.CYAN, parent=None):
        super().__init__(text, parent)
        self._color = color
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(40)
        self.setFont(body(10, bold=True))
        self.setStyleSheet(f"""
            QPushButton {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 {color}, stop:1 {C.BLUE});
                color: {C.BG};
                border: none;
                border-radius: 8px;
                padding: 10px 24px;
                font-weight: 700;
            }}
            QPushButton:hover {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 {C.CYAN2}, stop:1 {color});
            }}
            QPushButton:pressed {{
                background: {color};
            }}
        """)


# ── Status Badge ─────────────────────────────────────────────────

class StatusBadge(QWidget):
    """Colored dot + label status indicator."""

    def __init__(self, text: str = "Ready", status: str = "ok"):
        super().__init__()
        self.setFixedHeight(26)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(S.XS)

        self._dot = QLabel()
        self._dot.setFixedSize(8, 8)
        layout.addWidget(self._dot)

        self._label = QLabel(text)
        self._label.setFont(caption())
        layout.addWidget(self._label)
        layout.addStretch()
        self.set_status(status, text)

    def set_status(self, status: str, text: str = ""):
        colors = {"ok": C.GREEN, "warn": C.AMBER, "error": C.RED, "off": C.DIM, "info": C.CYAN}
        color = colors.get(status, C.DIM)
        self._dot.setStyleSheet(f"background:{color}; border-radius:4px; border:none;")
        self._label.setStyleSheet(f"color:{color}; background:transparent;")
        if text:
            self._label.setText(text)


# ── Pulse Indicator ──────────────────────────────────────────────

class PulseIndicator(QWidget):
    """Small animated pulsing dot for live status."""

    def __init__(self, color: str = C.GREEN, size: int = 10, parent=None):
        super().__init__(parent)
        self._color = color
        self._size = size
        self._phase = 0.0
        self.setFixedSize(size * 3, size * 3)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(50)

    def _tick(self):
        self._phase += 0.08
        self.update()

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        cx, cy = self.width() / 2, self.height() / 2
        pulse = 0.5 + 0.5 * math.sin(self._phase)
        # Outer glow
        r_outer = self._size * (1.0 + pulse * 0.6)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(qcolor(self._color, int(30 + 30 * pulse)))
        p.drawEllipse(int(cx - r_outer), int(cy - r_outer), int(r_outer * 2), int(r_outer * 2))
        # Inner dot
        r = self._size * 0.4
        p.setBrush(qcolor(self._color, 220))
        p.drawEllipse(int(cx - r), int(cy - r), int(r * 2), int(r * 2))


# ── Metric Card ──────────────────────────────────────────────────

class MetricCard(GlassCard):
    """Dashboard metric card with label, value, and status color."""

    def __init__(self, label: str, value: str = "--", color: str = C.CYAN, icon: str = ""):
        super().__init__(clickable=False)
        self.setMinimumHeight(100)
        self.setMinimumWidth(180)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(S.LG, S.MD, S.LG, S.MD)
        layout.setSpacing(S.XS)

        # Label
        title_row = QHBoxLayout()
        if icon:
            icon_lbl = QLabel(icon)
            icon_lbl.setFont(body(14))
            icon_lbl.setStyleSheet(f"color:{C.TEXT3}; background:transparent;")
            title_row.addWidget(icon_lbl)
        lbl = QLabel(label.upper())
        lbl.setFont(label_font())
        lbl.setStyleSheet(f"color:{C.TEXT3}; background:transparent;")
        title_row.addWidget(lbl)
        title_row.addStretch()
        layout.addLayout(title_row)

        # Value
        self._value = QLabel(value)
        self._value.setFont(heading(16))
        self._value.setStyleSheet(f"color:{color}; background:transparent;")
        self._value.setWordWrap(True)
        layout.addWidget(self._value)
        layout.addStretch()

        self._color = color

    def set_value(self, value: str, color: str = ""):
        self._value.setText(value)
        if color:
            self._color = color
            self._value.setStyleSheet(f"color:{color}; background:transparent;")


# ── Empty State ──────────────────────────────────────────────────

class EmptyState(QWidget):
    """Beautiful empty state with icon, title, subtitle, and optional action."""

    def __init__(self, icon: str = "\u25CE", title: str = "Nothing here yet",
                 subtitle: str = "", action_text: str = "", parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(S.HUGE, S.HUGE, S.HUGE, S.HUGE)
        layout.setSpacing(S.MD)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        icon_lbl = QLabel(icon)
        icon_lbl.setFont(heading(42))
        icon_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon_lbl.setStyleSheet(f"color:{C.DIM}; background:transparent;")
        layout.addWidget(icon_lbl)

        t = QLabel(title)
        t.setFont(heading(16))
        t.setAlignment(Qt.AlignmentFlag.AlignCenter)
        t.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        layout.addWidget(t)

        if subtitle:
            s = QLabel(subtitle)
            s.setFont(body(10))
            s.setAlignment(Qt.AlignmentFlag.AlignCenter)
            s.setWordWrap(True)
            s.setStyleSheet(f"color:{C.TEXT3}; background:transparent;")
            layout.addWidget(s)

        if action_text:
            self._action_btn = PrimaryButton(action_text)
            layout.addWidget(self._action_btn, alignment=Qt.AlignmentFlag.AlignCenter)


# ── Error Card ───────────────────────────────────────────────────

class ErrorCard(GlassCard):
    """Premium error display with title, message, and action button."""

    def __init__(self, title: str, message: str, action_text: str = "", parent=None):
        super().__init__(parent=parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(S.XL, S.LG, S.XL, S.LG)
        layout.setSpacing(S.SM)

        header = QHBoxLayout()
        dot = QLabel()
        dot.setFixedSize(8, 8)
        dot.setStyleSheet(f"background:{C.RED}; border-radius:4px; border:none;")
        header.addWidget(dot)
        t = QLabel(title)
        t.setFont(body(12, bold=True))
        t.setStyleSheet(f"color:{C.RED}; background:transparent;")
        header.addWidget(t)
        header.addStretch()
        layout.addLayout(header)

        msg = QLabel(message)
        msg.setFont(body(10))
        msg.setWordWrap(True)
        msg.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        layout.addWidget(msg)

        if action_text:
            self.action_btn = NeonButton(action_text, color=C.RED)
            layout.addWidget(self.action_btn)


# ── Nav Item ─────────────────────────────────────────────────────

class NavItem(QPushButton):
    """Sidebar navigation item with icon and glow indicator."""

    def __init__(self, text: str, parent=None):
        icon = NAV_ICONS.get(text, "\u25C7")
        super().__init__(f"  {icon}   {text}", parent)
        self._text = text
        self._active = False
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(38)
        self.setFont(body(9))
        self.setStyleSheet(self._style(False))

    def set_active(self, active: bool):
        self._active = active
        self.setStyleSheet(self._style(active))

    def _style(self, active: bool) -> str:
        if active:
            return f"""
                QPushButton {{
                    background: rgba(0,217,255,20);
                    color: {C.CYAN2};
                    border: none;
                    border-left: 3px solid {C.CYAN};
                    border-radius: 0px;
                    padding: 8px 12px;
                    text-align: left;
                    font-weight: 600;
                }}
            """
        return f"""
            QPushButton {{
                background: transparent;
                color: {C.TEXT2};
                border: none;
                border-left: 3px solid transparent;
                border-radius: 0px;
                padding: 8px 12px;
                text-align: left;
            }}
            QPushButton:hover {{
                background: rgba(0,217,255,10);
                color: {C.TEXT};
                border-left: 3px solid {C.BORDER_HI};
            }}
        """


# ── Activity Feed ────────────────────────────────────────────────

class ActivityFeed(QScrollArea):
    """Scrollable activity/log feed with styled entries."""

    def __init__(self):
        super().__init__()
        self.setWidgetResizable(True)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self._wrap = QWidget()
        self._layout = QVBoxLayout(self._wrap)
        self._layout.setContentsMargins(0, 0, 0, 0)
        self._layout.setSpacing(S.XS)
        self._layout.addStretch()
        self.setWidget(self._wrap)

    def append(self, text: object):
        label = QLabel(str(text))
        label.setWordWrap(True)
        label.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        label.setFont(body(9))
        label.setStyleSheet(
            f"color:{C.TEXT2}; background:{C.GLASS}; border:1px solid {C.BORDER}; "
            "border-radius:6px; padding:8px 10px;"
        )
        self._layout.insertWidget(max(0, self._layout.count() - 1), label)
        QTimer.singleShot(0, lambda: self.verticalScrollBar().setValue(self.verticalScrollBar().maximum()))

    def clear(self):
        while self._layout.count() > 1:
            item = self._layout.takeAt(0)
            w = item.widget()
            if w:
                w.deleteLater()


# ── Chat Components ──────────────────────────────────────────────

class ChatBubble(QWidget):
    """Premium chat bubble with role distinction and copy button."""

    def __init__(self, role: str, text: str):
        super().__init__()
        self._role = role
        self._text = text
        is_ai = role == "assistant"
        color = C.CYAN if is_ai else C.PURPLE
        bg = "rgba(4,28,48,200)" if is_ai else "rgba(35,18,64,200)"
        align = Qt.AlignmentFlag.AlignLeft if is_ai else Qt.AlignmentFlag.AlignRight

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(S.XXS)

        # Role label
        role_lbl = QLabel("B.R.A.C.E." if is_ai else "You")
        role_lbl.setFont(caption())
        role_lbl.setStyleSheet(f"color:{C.TEXT3}; background:transparent;")
        role_lbl.setAlignment(align)
        layout.addWidget(role_lbl)

        # Message card
        card = QWidget()
        card.setMaximumWidth(780)
        card.setStyleSheet(
            f"background:{bg}; border:1px solid rgba({_hex_to_rgb(color)},40); "
            "border-radius:10px; padding:0px;"
        )
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(S.MD, S.SM, S.MD, S.SM)
        card_layout.setSpacing(S.XXS)

        msg = QLabel(text)
        msg.setWordWrap(True)
        msg.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        msg.setFont(body(10))
        msg.setStyleSheet(f"color:{C.TEXT}; background:transparent; border:none; padding:0px;")
        card_layout.addWidget(msg)

        # Copy button
        copy_btn = QPushButton("Copy")
        copy_btn.setFixedSize(50, 22)
        copy_btn.setFont(caption())
        copy_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        copy_btn.setStyleSheet(
            f"color:{C.DIM}; background:transparent; border:1px solid {C.BORDER}; "
            "border-radius:4px; padding:2px 6px;"
        )
        copy_btn.clicked.connect(lambda: QApplication.clipboard().setText(text))
        card_layout.addWidget(copy_btn, alignment=Qt.AlignmentFlag.AlignRight)

        # Align bubble
        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        if is_ai:
            row.addWidget(card)
            row.addStretch()
        else:
            row.addStretch()
            row.addWidget(card)
        layout.addLayout(row)


class ChatStream(QScrollArea):
    """Premium chat message container."""

    def __init__(self):
        super().__init__()
        self.messages: list[tuple[str, str]] = []
        self.setWidgetResizable(True)
        self.setFrameShape(QFrame.Shape.NoFrame)
        self._wrap = QWidget()
        self._layout = QVBoxLayout(self._wrap)
        self._layout.setContentsMargins(S.SM, S.SM, S.SM, S.SM)
        self._layout.setSpacing(S.MD)
        self._layout.addStretch()
        self.setWidget(self._wrap)

    def add_message(self, role: str, text: str):
        self.messages.append((role, text))
        bubble = ChatBubble(role, text)
        self._layout.insertWidget(max(0, self._layout.count() - 1), bubble)
        QTimer.singleShot(0, lambda: self.verticalScrollBar().setValue(self.verticalScrollBar().maximum()))

    def clear_messages(self):
        self.messages.clear()
        while self._layout.count() > 1:
            item = self._layout.takeAt(0)
            w = item.widget()
            if w:
                w.deleteLater()

    def markdown(self) -> str:
        return "\n\n".join(f"**{role.upper()}**\n{text}" for role, text in self.messages)


# ── File Drop Zone ───────────────────────────────────────────────

class FileDropZone(QWidget):
    file_selected = pyqtSignal(str)

    def __init__(self, label: str = "Drop a file here or click to attach"):
        super().__init__()
        self._path = ""
        self.setAcceptDrops(True)
        self.setMinimumHeight(100)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self._label = QLabel(label)
        self._label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._label.setWordWrap(True)
        self._label.setFont(body(10, bold=True))
        self._label.setStyleSheet(f"color:{C.TEXT2}; background:transparent;")
        layout = QVBoxLayout(self)
        layout.addStretch()
        layout.addWidget(self._label)
        layout.addStretch()
        self._normal()

    def _normal(self):
        self.setStyleSheet(
            f"background:{C.GLASS}; border:1px dashed {C.BORDER_HI}; border-radius:10px;"
        )

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet(
                f"background:rgba(0,217,255,25); border:1px solid {C.CYAN}; border-radius:10px;"
            )

    def dragLeaveEvent(self, _):
        self._normal()

    def dropEvent(self, event):
        urls = event.mimeData().urls()
        if urls:
            self._set_file(urls[0].toLocalFile())
        self._normal()

    def mousePressEvent(self, _):
        path, _ = QFileDialog.getOpenFileName(self, "Attach file for B.R.A.C.E.", str(Path.home()))
        if path:
            self._set_file(path)

    def _set_file(self, path: str):
        p = Path(path)
        self._path = str(p)
        try:
            size = _fmt_size(p.stat().st_size)
        except Exception:
            size = "unknown size"
        self._label.setText(f"{p.name}\n{size}")
        self.file_selected.emit(str(p))

    def current_file(self) -> str:
        return self._path


# ── Core Orb ─────────────────────────────────────────────────────

class CoreOrb(QWidget):
    """Animated AI core orb with state-based glow and rings."""

    def __init__(self, face_path: str = "", parent=None):
        super().__init__(parent)
        self.state = "INITIALIZING"
        self.muted = False
        self.speaking = False
        self._tick = 0
        self._face = QPixmap()
        if face_path:
            from services.path_utils import app_path
            p = Path(face_path)
            if not p.is_absolute():
                p = app_path(face_path)
            if p.exists():
                self._face = QPixmap(str(p))
        self.setMinimumSize(220, 220)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._step)
        self._timer.start(33)  # ~30fps for smooth animation

    def _step(self):
        self._tick += 1
        self.update()

    def paintEvent(self, _event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height()
        cx, cy = w / 2, h / 2
        span = min(w, h)
        radius = span * 0.20
        speed = 0.12 if self.speaking else 0.045
        pulse = 1 + 0.08 * math.sin(self._tick * speed)

        # Subtle grid background
        p.setPen(QPen(qcolor(C.BORDER, 30), 1))
        step = 40
        for x in range(0, w, step):
            p.drawLine(x, 0, x, h)
        for y in range(0, h, step):
            p.drawLine(0, y, w, y)

        # Scanning line
        scan_y = cy + span * 0.35 * math.sin(self._tick * 0.02)
        p.setPen(QPen(qcolor(C.CYAN, 15), 1))
        p.drawLine(0, int(scan_y), w, int(scan_y))

        # State-based glow color
        glow_color = C.RED if self.muted else (C.AMBER if self.state in ("THINKING", "PROCESSING") else C.CYAN)

        # Outer glow rings
        for i in range(6, 0, -1):
            r = radius * pulse * (1 + i * 0.15)
            alpha = max(8, 50 - i * 7)
            p.setPen(QPen(qcolor(glow_color, alpha), 1.5))
            p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawEllipse(int(cx - r), int(cy - r), int(r * 2), int(r * 2))

        # Rotating arcs
        for i in range(3):
            r = radius * (1.5 + i * 0.3)
            start = int((self._tick * (1.2 + i * 0.4) + i * 120) * 16)
            arc_color = C.PURPLE if i == 1 else C.CYAN2
            p.setPen(QPen(qcolor(arc_color, 180 - i * 40), 2))
            p.drawArc(int(cx - r), int(cy - r), int(r * 2), int(r * 2), start, int((90 - i * 15) * 16))

        # Core sphere gradient
        grad = QRadialGradient(cx, cy, radius * 1.1)
        grad.setColorAt(0.0, qcolor("#cfffff", 230))
        grad.setColorAt(0.3, qcolor(C.CYAN, 180))
        grad.setColorAt(0.7, qcolor(C.BLUE, 100))
        grad.setColorAt(1.0, qcolor(C.BG, 20))
        p.setBrush(grad)
        p.setPen(QPen(qcolor(C.CYAN2, 150), 2))
        p.drawEllipse(int(cx - radius), int(cy - radius), int(radius * 2), int(radius * 2))

        # Face image or "B" letter
        if not self._face.isNull():
            size = int(radius * 1.3)
            px = self._face.scaled(size, size, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
            p.setOpacity(0.35)
            p.drawPixmap(int(cx - px.width() / 2), int(cy - px.height() / 2), px)
            p.setOpacity(1.0)
        else:
            p.setFont(mono(20, bold=True))
            p.setPen(QPen(qcolor(C.TEXT, 200), 1))
            p.drawText(0, int(cy - 14), w, 30, Qt.AlignmentFlag.AlignCenter, "B")

        # State label
        state_color = C.RED if self.muted else (C.GREEN if self.state == "LISTENING" else C.AMBER if self.state in ("THINKING", "PROCESSING", "SPEAKING") else C.CYAN)
        p.setFont(mono(8, bold=True))
        p.setPen(QPen(qcolor(state_color), 1))
        p.drawText(0, int(cy + span * 0.30), w, 20, Qt.AlignmentFlag.AlignCenter, self.state)


# ── Boot Overlay ─────────────────────────────────────────────────

class BootOverlay(QWidget):
    """Cinematic boot sequence with progress bar and status messages."""

    finished = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setStyleSheet(f"background:{C.OVERLAY};")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(S.HUGE, S.HUGE, S.HUGE, S.HUGE)
        layout.addStretch(2)

        # Orb
        self._orb = CoreOrb(parent=self)
        self._orb.setFixedSize(240, 240)
        layout.addWidget(self._orb, alignment=Qt.AlignmentFlag.AlignCenter)
        layout.addSpacing(S.XL)

        # Title
        self._title = QLabel("Initializing B.R.A.C.E.")
        self._title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._title.setFont(heading(22))
        self._title.setStyleSheet(f"color:{C.CYAN}; background:transparent;")
        layout.addWidget(self._title)

        # Subtitle
        sub = QLabel("Brain-like Responsive Assistant for Creation and Execution")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sub.setFont(body(10))
        sub.setStyleSheet(f"color:{C.TEXT3}; background:transparent;")
        layout.addWidget(sub)
        layout.addSpacing(S.XL)

        # Progress bar
        self._progress_bg = QWidget()
        self._progress_bg.setFixedHeight(4)
        self._progress_bg.setStyleSheet(f"background:{C.BORDER}; border-radius:2px;")

        self._progress_fill = QWidget(self._progress_bg)
        self._progress_fill.setFixedHeight(4)
        self._progress_fill.setStyleSheet(
            f"background: qlineargradient(x1:0,y1:0,x2:1,y2:0, stop:0 {C.CYAN}, stop:1 {C.BLUE}); border-radius:2px;"
        )
        self._progress_fill.setFixedWidth(0)
        layout.addWidget(self._progress_bg)

        # Status text
        self._status = QLabel("")
        self._status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._status.setFont(mono(8))
        self._status.setStyleSheet(f"color:{C.DIM}; background:transparent;")
        layout.addWidget(self._status)

        layout.addStretch(3)

        self._messages = [
            "Initializing B.R.A.C.E...",
            "Loading Neural Core...",
            "Checking Provider Router...",
            "Syncing Memory Vault...",
            "Scanning MCP Servers...",
            "Checking OpenClaw Gateway...",
            "Loading Voice Engine...",
            "Activating Execution Layer...",
            "System Online.",
        ]
        self._idx = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._next)

    def start(self):
        if self.parentWidget():
            self.setGeometry(self.parentWidget().rect())
        self.show()
        self.raise_()
        self._idx = 0
        self._timer.start(250)

    def _next(self):
        if self._idx < len(self._messages):
            msg = self._messages[self._idx]
            self._title.setText(msg.rstrip(".") if self._idx < len(self._messages) - 1 else msg)
            self._status.setText(f"Step {self._idx + 1}/{len(self._messages)}")
            self._orb.state = "BOOT"
            # Update progress bar
            progress = int((self._idx + 1) / len(self._messages) * self._progress_bg.width())
            self._progress_fill.setFixedWidth(progress)
            self._idx += 1
        else:
            self._timer.stop()
            self.hide()
            self.finished.emit()


# ── Toast Notification ───────────────────────────────────────────

class Toast(QWidget):
    """Single toast notification that slides in and auto-dismisses."""

    def __init__(self, message: str, kind: str = "info", duration: int = 3000, parent=None):
        super().__init__(parent)
        self.setFixedWidth(380)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)

        colors = {"success": C.GREEN, "error": C.RED, "warning": C.AMBER, "info": C.CYAN}
        icons = {"success": "\u2713", "error": "\u2717", "warning": "\u26A0", "info": "\u2139"}
        color = colors.get(kind, C.CYAN)
        icon = icons.get(kind, "\u2139")

        self.setStyleSheet(
            f"background:{C.GLASS}; border:1px solid rgba({_hex_to_rgb(color)},60); border-radius:8px;"
        )

        layout = QHBoxLayout(self)
        layout.setContentsMargins(S.MD, S.SM, S.MD, S.SM)
        layout.setSpacing(S.SM)

        icon_lbl = QLabel(icon)
        icon_lbl.setFont(body(14))
        icon_lbl.setStyleSheet(f"color:{color}; background:transparent;")
        layout.addWidget(icon_lbl)

        msg_lbl = QLabel(message)
        msg_lbl.setFont(body(9))
        msg_lbl.setWordWrap(True)
        msg_lbl.setStyleSheet(f"color:{C.TEXT}; background:transparent;")
        layout.addWidget(msg_lbl, stretch=1)

        close_btn = QPushButton("\u2715")
        close_btn.setFixedSize(20, 20)
        close_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        close_btn.setStyleSheet(f"color:{C.DIM}; background:transparent; border:none;")
        close_btn.clicked.connect(self._dismiss)
        layout.addWidget(close_btn)

        self.adjustSize()
        QTimer.singleShot(duration, self._dismiss)

    def _dismiss(self):
        self.hide()
        self.deleteLater()


class ToastManager:
    """Manages toast notifications stacked in top-right corner."""

    def __init__(self, parent: QWidget):
        self._parent = parent
        self._toasts: list[Toast] = []

    def show(self, message: str, kind: str = "info", duration: int = 3500):
        toast = Toast(message, kind, duration, self._parent)
        toast.destroyed.connect(lambda: self._remove(toast))
        self._toasts.append(toast)
        self._reposition()
        toast.show()
        toast.raise_()

    def _remove(self, toast: Toast):
        if toast in self._toasts:
            self._toasts.remove(toast)
            self._reposition()

    def _reposition(self):
        if not self._parent:
            return
        x = self._parent.width() - 400
        y = 80
        for toast in self._toasts:
            if toast.isVisible():
                toast.move(x, y)
                y += toast.height() + S.SM


# ── Command Palette ──────────────────────────────────────────────

class CommandPalette(QWidget):
    """Ctrl+K searchable command overlay."""

    command_selected = pyqtSignal(str)

    def __init__(self, commands: list[str], parent=None):
        super().__init__(parent)
        self._commands = commands
        self.setFixedWidth(520)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setStyleSheet(
            f"background:{C.OVERLAY}; border:1px solid {C.BORDER_HI}; border-radius:12px;"
        )

        layout = QVBoxLayout(self)
        layout.setContentsMargins(S.LG, S.LG, S.LG, S.LG)
        layout.setSpacing(S.SM)

        # Search input
        self._search = QLineEdit()
        self._search.setPlaceholderText("Type a command or page name...")
        self._search.setFont(body(12))
        self._search.setStyleSheet(
            f"background:{C.GLASS}; color:{C.TEXT}; border:1px solid {C.BORDER_HI}; "
            "border-radius:8px; padding:10px 14px;"
        )
        self._search.textChanged.connect(self._filter)
        self._search.returnPressed.connect(self._select_first)
        layout.addWidget(self._search)

        # Results
        self._results_area = QScrollArea()
        self._results_area.setWidgetResizable(True)
        self._results_area.setFrameShape(QFrame.Shape.NoFrame)
        self._results_area.setMaximumHeight(360)
        self._results_wrap = QWidget()
        self._results_layout = QVBoxLayout(self._results_wrap)
        self._results_layout.setContentsMargins(0, 0, 0, 0)
        self._results_layout.setSpacing(S.XXS)
        self._results_area.setWidget(self._results_wrap)
        layout.addWidget(self._results_area)

        self._filter("")
        self.hide()

    def toggle(self):
        if self.isVisible():
            self.hide()
        else:
            self._show_centered()

    def _show_centered(self):
        if self.parentWidget():
            pw = self.parentWidget()
            x = (pw.width() - self.width()) // 2
            y = int(pw.height() * 0.2)
            self.move(x, y)
        self._search.clear()
        self._filter("")
        self.show()
        self.raise_()
        self._search.setFocus()

    def _filter(self, text: str):
        # Clear old results
        while self._results_layout.count():
            item = self._results_layout.takeAt(0)
            w = item.widget()
            if w:
                w.deleteLater()

        query = text.lower().strip()
        for cmd in self._commands:
            if query and query not in cmd.lower():
                continue
            btn = QPushButton(f"  {NAV_ICONS.get(cmd, '\u25B8')}   {cmd}")
            btn.setFont(body(10))
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setMinimumHeight(36)
            btn.setStyleSheet(f"""
                QPushButton {{
                    background: transparent;
                    color: {C.TEXT2};
                    border: none;
                    border-radius: 6px;
                    padding: 6px 10px;
                    text-align: left;
                }}
                QPushButton:hover {{
                    background: rgba(0,217,255,18);
                    color: {C.TEXT};
                }}
            """)
            btn.clicked.connect(lambda _=False, c=cmd: self._on_select(c))
            self._results_layout.addWidget(btn)

        self._results_layout.addStretch()

    def _select_first(self):
        for i in range(self._results_layout.count()):
            w = self._results_layout.itemAt(i).widget()
            if isinstance(w, QPushButton):
                w.click()
                return

    def _on_select(self, command: str):
        self.hide()
        self.command_selected.emit(command)

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_Escape:
            self.hide()
        super().keyPressEvent(event)


# ── Grid Background ──────────────────────────────────────────────

class GridBackground(QWidget):
    """Subtle animated grid background for the main content area."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._tick = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._step)
        self._timer.start(80)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        self.lower()

    def _step(self):
        self._tick += 1
        self.update()

    def paintEvent(self, _event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height()

        # Grid
        p.setPen(QPen(qcolor(C.BORDER, 18), 1))
        step = 48
        for x in range(0, w, step):
            p.drawLine(x, 0, x, h)
        for y in range(0, h, step):
            p.drawLine(0, y, w, y)

        # Scanning line
        scan_y = int((self._tick * 2) % (h + 100)) - 50
        grad = QLinearGradient(0, scan_y - 40, 0, scan_y + 40)
        grad.setColorAt(0, qcolor(C.CYAN, 0))
        grad.setColorAt(0.5, qcolor(C.CYAN, 12))
        grad.setColorAt(1, qcolor(C.CYAN, 0))
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(grad)
        p.drawRect(0, scan_y - 40, w, 80)


# ── Helpers ──────────────────────────────────────────────────────

def _fmt_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024 or unit == "TB":
            return f"{value:.1f}{unit}" if unit != "B" else f"{int(value)}B"
        value /= 1024
    return f"{size}B"


def make_label(text: str, color: str = C.TEXT2, size: int = 9, bold: bool = False) -> QLabel:
    """Factory for styled labels."""
    lbl = QLabel(text)
    lbl.setWordWrap(True)
    lbl.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
    lbl.setFont(body(size, bold))
    lbl.setStyleSheet(f"color:{color}; background:transparent;")
    return lbl
