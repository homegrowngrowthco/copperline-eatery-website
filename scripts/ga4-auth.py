#!/usr/bin/env python3
"""One-time Google sign-in for read-only GA4 access (op #1715).

Opens a browser consent screen for the Google Analytics read-only scope and
saves the token to ~/.gsc/token-ga4.json. The Search Console token
(~/.gsc/token.json) is left untouched, so the GSC scripts keep working.
Uses the same OAuth client as the GSC scripts (~/.gsc/client_secret.json).

Usage:
  C:\\Users\\Ian\\.venvs\\gsc\\Scripts\\python scripts/ga4-auth.py
Revert: delete ~/.gsc/token-ga4.json, and remove the app's access at
https://myaccount.google.com/permissions if wanted.
"""
import os

from google_auth_oauthlib.flow import InstalledAppFlow

GSC_DIR = os.path.expanduser("~/.gsc")
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
OUT = os.path.join(GSC_DIR, "token-ga4.json")

flow = InstalledAppFlow.from_client_secrets_file(os.path.join(GSC_DIR, "client_secret.json"), SCOPES)
creds = flow.run_local_server(port=0, open_browser=True, prompt="consent")
with open(OUT, "w") as f:
    f.write(creds.to_json())
print(f"saved {OUT}")
