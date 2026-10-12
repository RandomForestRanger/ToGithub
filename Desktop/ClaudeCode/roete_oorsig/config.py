import os
import secrets
from dotenv import load_dotenv

load_dotenv()

ORS_API_KEY = os.getenv("ORS_API_KEY", "")
# Signs flash-message cookies. Random per process if not set in .env.
SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
