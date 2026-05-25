# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

datas = [
    ("actions", "actions"),
    ("agent", "agent"),
    ("core", "core"),
    ("config", "config"),
    ("memory", "memory"),
    ("assets", "assets"),
    ("services", "services"),
    ("providers", "providers"),
    ("integrations", "integrations"),
    ("automation", "automation"),
    (".env.example", ".env.example"),
    ("installer_notes.md", "installer_notes.md"),
]

hiddenimports = [
    "PyQt6",
    "sounddevice",
    "google.genai",
    "google.generativeai",
    "playwright",
    "win10toast",
    "youtube_transcript_api",
    "pywinauto",
    "mss",
    "PIL",
    "bs4",
    "duckduckgo_search",
    "requests",
    "pyttsx3",
    "speech_recognition",
    "wikipedia",
    "pyjokes",
]

a = Analysis(
    ["main.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[".env", ".venv", ".venv314", "logs", "outputs", "build", "dist"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="BRACE",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="assets/icons/brace.ico",
    version="version_info.txt",
)
