# B.R.A.C.E. Design System — Tokens, Colors, Fonts, Spacing
from __future__ import annotations

import sys
from pathlib import Path
from PyQt6.QtGui import QColor, QFont, QFontDatabase


# ── Color Palette ────────────────────────────────────────────────
class C:
    """Centralized color tokens for the B.R.A.C.E. design system."""

    # Backgrounds
    BG          = "#020712"
    BG2         = "#07111f"
    BG3         = "#0a1628"
    SURFACE     = "rgba(7,20,38,220)"
    SURFACE2    = "rgba(10,26,48,200)"
    SURFACE_HI  = "rgba(0,217,255,12)"
    GLASS       = "rgba(8,22,42,190)"
    GLASS_HOVER = "rgba(0,217,255,25)"
    OVERLAY     = "rgba(1,6,14,240)"

    # Borders
    BORDER      = "#0d2840"
    BORDER2     = "#16405f"
    BORDER_HI   = "#23779c"
    BORDER_GLOW = "rgba(0,217,255,60)"

    # Accent Colors
    CYAN        = "#00d9ff"
    CYAN2       = "#63f4ff"
    CYAN_DIM    = "#00a0cc"
    BLUE        = "#1677ff"
    BLUE2       = "#4da3ff"
    PURPLE      = "#8f5cff"
    PURPLE2     = "#b794ff"
    GREEN       = "#37ff9d"
    GREEN2      = "#20cc7a"
    AMBER       = "#ffd166"
    AMBER2      = "#ffb833"
    RED         = "#ff4d6d"
    RED2        = "#ff6b8a"
    PINK        = "#ff6baa"

    # Text
    TEXT        = "#e8fbff"
    TEXT2       = "#9bc7d5"
    TEXT3       = "#6a99ab"
    DIM         = "#456478"
    MUTED       = "#2d4a5c"

    # Semantic
    SUCCESS     = "#37ff9d"
    WARNING     = "#ffd166"
    ERROR       = "#ff4d6d"
    INFO        = "#00d9ff"


# ── Accent Theme Variants ───────────────────────────────────────
ACCENT_THEMES = {
    "Cyan":    {"primary": "#00d9ff", "primary2": "#63f4ff", "glow": "rgba(0,217,255,{})" },
    "Blue":    {"primary": "#1677ff", "primary2": "#4da3ff", "glow": "rgba(22,119,255,{})" },
    "Purple":  {"primary": "#8f5cff", "primary2": "#b794ff", "glow": "rgba(143,92,255,{})" },
    "Emerald": {"primary": "#37ff9d", "primary2": "#6bffbe", "glow": "rgba(55,255,157,{})" },
}


# ── Spacing Scale ────────────────────────────────────────────────
class S:
    """Spacing scale (4px base unit)."""
    XXXS = 2
    XXS  = 4
    XS   = 6
    SM   = 8
    MD   = 12
    LG   = 16
    XL   = 20
    XXL  = 24
    XXXL = 32
    HUGE = 48


# ── Typography ───────────────────────────────────────────────────
_FONTS_LOADED = False
_HEADING_FAMILY = "Segoe UI"
_BODY_FAMILY    = "Segoe UI"
_MONO_FAMILY    = "Cascadia Mono"


def load_fonts():
    """Load bundled fonts from assets/fonts/. Falls back to system fonts."""
    global _FONTS_LOADED, _HEADING_FAMILY, _BODY_FAMILY, _MONO_FAMILY
    if _FONTS_LOADED:
        return
    _FONTS_LOADED = True

    fonts_dir = _base_dir() / "assets" / "fonts"
    if not fonts_dir.exists():
        return

    font_map = {
        "Inter":          ("Inter-Regular.ttf", "Inter-Bold.ttf", "Inter-Medium.ttf"),
        "JetBrainsMono":  ("JetBrainsMono-Regular.ttf", "JetBrainsMono-Bold.ttf"),
    }

    loaded = set()
    for family, files in font_map.items():
        for fname in files:
            fpath = fonts_dir / fname
            if fpath.exists():
                fid = QFontDatabase.addApplicationFont(str(fpath))
                if fid >= 0:
                    families = QFontDatabase.applicationFontFamilies(fid)
                    if families:
                        loaded.add(family)

    if "Inter" in loaded:
        _HEADING_FAMILY = "Inter"
        _BODY_FAMILY    = "Inter"
    if "JetBrainsMono" in loaded:
        _MONO_FAMILY = "JetBrains Mono"


def _base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


def heading(size: int = 18, bold: bool = True) -> QFont:
    """Get heading font."""
    weight = QFont.Weight.Bold if bold else QFont.Weight.DemiBold
    return QFont(_HEADING_FAMILY, size, weight)


def body(size: int = 10, bold: bool = False) -> QFont:
    """Get body font."""
    weight = QFont.Weight.Bold if bold else QFont.Weight.Normal
    return QFont(_BODY_FAMILY, size, weight)


def mono(size: int = 9, bold: bool = False) -> QFont:
    """Get monospace font."""
    weight = QFont.Weight.Bold if bold else QFont.Weight.Normal
    return QFont(_MONO_FAMILY, size, weight)


def caption() -> QFont:
    """Get small caption font."""
    f = QFont(_BODY_FAMILY, 8, QFont.Weight.Medium)
    f.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 0.8)
    return f


def label_font() -> QFont:
    """Get uppercase label font with letter spacing."""
    f = QFont(_MONO_FAMILY, 7, QFont.Weight.Bold)
    f.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 1.2)
    f.setCapitalization(QFont.Capitalization.AllUppercase)
    return f


# ── Color Helpers ────────────────────────────────────────────────
def qcolor(value: str, alpha: int = 255) -> QColor:
    """Create QColor from hex with optional alpha."""
    c = QColor(value)
    c.setAlpha(alpha)
    return c


def rgba(hex_color: str, alpha: float) -> str:
    """Convert #hex to rgba() string. Alpha is 0.0-1.0."""
    c = QColor(hex_color)
    return f"rgba({c.red()},{c.green()},{c.blue()},{int(alpha*255)})"


# ── Nav Icon Map ─────────────────────────────────────────────────
# Using simple unicode symbols that render well in most fonts
NAV_ICONS = {
    "Dashboard":          "\u25C8",  # ◈
    "AI Chat":            "\u2756",  # ❖
    "Voice Assistant":    "\u25CE",  # ◎
    "Automation Center":  "\u2699",  # ⚙
    "OpenClaw Control":   "\u2726",  # ✦
    "MCP Server Manager": "\u25A3",  # ▣
    "Nano Banana Studio": "\u25C6",  # ◆
    "NVIDIA AI Hub":      "\u2B23",  # ⬣
    "Provider Router":    "\u21C4",  # ⇄
    "Memory Vault":       "\u25A8",  # ▨
    "File Intelligence":  "\u25A4",  # ▤
    "Prompt Lab":         "\u2710",  # ✐
    "Code Copilot":       "\u2702",  # ✂
    "Web Intelligence":   "\u2609",  # ☉
    "System Diagnostics": "\u2690",  # ⚐
    "Settings":           "\u2638",  # ☸
    "About B.R.A.C.E.":   "\u24B7",  # Ⓑ
}
