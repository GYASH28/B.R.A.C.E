# B.R.A.C.E. Gimmicks and Placeholders Removal Log

This log lists all decorative, simulated, or non-functional features that were removed or disabled during the cleanup pass to make B.R.A.C.E. a truly workable local assistant.

---

## 1. System Telemetry Charts
*   **What it was**: Mini historical graphs in `SystemMetricCard` that displayed hardcoded arrays of numbers (`graph: [24, 31, 28, 44...]`) simulating time-series readings.
*   **What was changed**: Removed the charts. The metrics now display only the live value and a clean CSS percentage bar, reflecting real-time telemetry.

---

## 2. Wake-word Toggle
*   **What it was**: A switch on the Settings page labeled "Wake word" that toggled a settings flag but did not trigger any listening daemon.
*   **What was changed**: Removed the setting. Wake-word detection is currently not implemented in the local engine.

---

## 3. Fake "Locked" Telemetry Statuses
*   **What it was**: Labels in the top bar showing "CPU locked", "RAM locked", etc., when system permissions were disabled.
*   **What was changed**: Replaced with clean "Telemetry Disabled" / "Permission Needed" states, pointing the user directly to the Permissions page to enable them.

---

## 4. Fake Browser Automation
*   **What it was**: A script/runner option for "clean-folder" or "clean downloads" and "Create Automation" chips that did not trigger any real automation flows.
*   **What was changed**: Removed the fake automation actions. The chips now link only to real, working capabilities.

---

## 5. Vector Memory Labeling
*   **What it was**: Labeling the memory storage system as "Vector Memory" when it is a standard JSON/markdown search.
*   **What was changed**: Re-labeled to "Local Memory" to reflect the actual JSON file storage system.

---

## 6. OpenClaw and Nano Banana Placeholders
*   **What it was**: Mock statuses and buttons that claimed connection or setup flags for OpenClaw/Nano Banana without any health checks.
*   **What was changed**: Disabled the placeholders and replaced them with setup guides that guide the user on how to install and enable these integrations if desired.
