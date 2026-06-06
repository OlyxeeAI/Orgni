import os
from pathlib import Path
from dotenv import load_dotenv
import httpx

load_dotenv(dotenv_path=Path(".env"))

api_key = os.getenv("AZURE_OPENAI_API_KEY")
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")

# Check what deployments actually exist on this Azure resource
print("--- Checking available deployments ---")
url = f"{endpoint}openai/deployments?api-version=2024-12-01-preview"
headers = {"api-key": api_key}

r = httpx.get(url, headers=headers)
print("Status:", r.status_code)
print("Deployments:", r.text)