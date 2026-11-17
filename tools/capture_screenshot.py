#!/usr/bin/env python3
"""
tools/capture_screenshot.py
Starts a tiny local server, launches Chrome/Edge headless,
captures a clean screenshot of the running simulation, and saves to screenshot.png.
"""

import os
import sys
import time
import subprocess
import socket
from pathlib import Path

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def get_browser_exe():
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    for p in chrome_paths:
        if os.path.exists(p):
            return p
    return None

def capture(out_path="screenshot.png", wait_sec=2.5, url_params=""):
    browser_exe = get_browser_exe()
    if not browser_exe:
        print("Error: No Chrome or Edge browser executable found.")
        return False

    port = find_free_port()
    # Start python http server
    server_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        cwd=".",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(0.8)

    url = f"http://127.0.0.1:{port}/index.html{url_params}"
    abs_out = str(Path(out_path).resolve())
    
    cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--window-size=1920,1080",
        f"--virtual-time-budget={int(wait_sec * 1000)}",
        f"--screenshot={abs_out}",
        url
    ]
    
    try:
        subprocess.run(cmd, timeout=15, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    finally:
        server_proc.terminate()
        server_proc.wait()

    if os.path.exists(abs_out):
        print(f"Screenshot successfully captured: {abs_out}")
        return True
    else:
        print(f"Failed to capture screenshot to {abs_out}")
        return False

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "screenshot.png"
    params = sys.argv[2] if len(sys.argv) > 2 else ""
    success = capture(out, url_params=params)
    sys.exit(0 if success else 1)
