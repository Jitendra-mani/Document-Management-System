
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi

load_dotenv()

uri = os.getenv("MONGO_URI")

try:
    client = MongoClient(
        uri,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=15000
    )

    client.admin.command("ping")

    print("SUCCESS: MongoDB Atlas connected!")
    print("Database:", client.get_default_database().name)

except Exception as e:
    print("CONNECTION FAILED:")
    print(type(e).__name__)
    print(str(e))

finally:
    if "client" in locals():
        client.close()
