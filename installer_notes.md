# B.R.A.C.E. Installer Notes

## Output

`python build.py` creates `dist/BRACE.exe` when PyInstaller builds in one-file mode. If the spec is changed to one-folder mode later, the expected output is `dist/BRACE/BRACE.exe`.

## Secrets

`.env`, logs, outputs, virtual environments, and build artifacts are excluded from source control and from the packaged executable. The app ships with `.env.example` only.

## Icon Handling

B.R.A.C.E. sets the icon in three places:

- `QApplication.setWindowIcon(...)`
- `QMainWindow.setWindowIcon(...)`
- PyInstaller `icon="assets/icons/brace.ico"`

On Windows, the app also sets an AppUserModelID so the taskbar and Alt+Tab icon are associated with B.R.A.C.E. instead of Python.

## Manual Steps Before Distribution

1. Create a fresh virtual environment with Python 3.11 or 3.12.
2. Install dependencies with `pip install -r requirements.txt`.
3. Run `python -m playwright install` if browser automation is needed.
4. Run Diagnostics and confirm optional Jarvis libraries (`pyttsx3`, `SpeechRecognition`, `wikipedia`, `pyjokes`) are available if legacy voice fallback is enabled.
5. Copy `.env.example` to `.env` locally and add real keys.
6. Run `python build.py`.
