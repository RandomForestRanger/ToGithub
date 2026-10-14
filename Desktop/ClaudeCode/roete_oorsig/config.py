import os
import secrets
from dotenv import load_dotenv

load_dotenv()

ORS_API_KEY = os.getenv("ORS_API_KEY", "")
# Signs flash-message cookies. Random per process if not set in .env.
SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
# Contact URL in the User-Agent sent to Nominatim, Overpass and Wikidata —
# their usage policies ask for a way to reach the operator of a client.
KONTAK = os.getenv("KONTAK") or "https://github.com/RandomForestRanger"
USER_AGENT = f"RoeteOorsig/1.0 ({KONTAK})"
