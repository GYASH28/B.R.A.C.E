# B.R.A.C.E Installation Guide (Windows)

Welcome to the B.R.A.C.E installation guide! This document outlines how to set up the B.R.A.C.E AI Assistant with Voicebox and GitNexus on Windows.

## 1. Prerequisites

Ensure you have the following installed on your system:
- ✅ Node.js v18 or newer (Currently: v22.14.0)
- ✅ npm (Currently: 10.9.2)
- ✅ Python 3.11+ (Currently: 3.12.10)
- ✅ Git (Currently: 2.51.0)

## 2. Voicebox Installation

Voicebox is the high-quality local voice engine for B.R.A.C.E. It provides TTS (Text-to-Speech) and STT (Speech-to-Text).

**Recommended Method (Pre-built Windows Installer):**
1. Download the Windows installer from [voicebox.sh](https://voicebox.sh) or the [GitHub Releases page](https://github.com/jamiepine/voicebox/releases).
2. Run the installer and launch Voicebox.
3. Voicebox will automatically run a REST API on `http://127.0.0.1:17493`.

*(Note: Building Voicebox from source on Windows requires Rust, Cargo, Bun, and just. The pre-built installer is strongly recommended to bypass these requirements.)*

## 3. GitNexus Installation

GitNexus provides local, zero-server code intelligence for B.R.A.C.E using Tree-sitter and KuzuDB.

Open PowerShell and install it globally via npm:
```powershell
npm install -g gitnexus
```
*(If you encounter C++ build warnings during installation, GitNexus will still function by falling back to pre-built binaries or using JavaScript fallbacks via npx.)*

## 4. B.R.A.C.E Setup

1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd C:\Users\Admin\Documents\BRACE-Brain\brace-interface
   ```

2. Run the automated setup script. This script checks dependencies, indexes the codebase with GitNexus, checks Voicebox connectivity, and creates a `.env` file:
   ```powershell
   npm run brace:setup
   ```

3. Start the application:
   ```powershell
   npm run dev
   ```

## 5. Verification Commands

You can verify the status of individual components at any time:

- **Full System Health Check:**
  ```powershell
  npm run brace:health
  ```
- **Voicebox Connectivity:**
  ```powershell
  npm run brace:voicebox:check
  ```
- **GitNexus Status:**
  ```powershell
  npx gitnexus status
  ```

For more detailed setup information, see:
- [Voicebox Setup Guide](docs/BRACE_VOICEBOX_SETUP.md)
- [GitNexus Setup Guide](docs/BRACE_GITNEXUS_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
