import subprocess
import sys


print("Installing B.R.A.C.E. requirements...")
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
    check=True,
)

print("Installing Playwright browsers...")
subprocess.run([sys.executable, "-m", "playwright", "install"], check=True)

print("\nSetup complete. Copy .env.example to .env, add GEMINI_API_KEY, then run python main.py.")
