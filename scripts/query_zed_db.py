import sqlite3
import json
from pathlib import Path

db = Path.home() / "AppData/Local/zed/db/0-stable/db.sqlite"
conn = sqlite3.connect(str(db))
cur = conn.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print("TABLES:", tables)

for t in tables:
    try:
        cols = [r[1] for r in cur.execute(f"PRAGMA table_info({t})")]
        print(f"\n{t} cols:", cols)
    except Exception as e:
        print(f"{t}: {e}")

keywords = ["browser", "BrowserView", "timeline", "snapshot", "history", "mobile", "index.tsx"]
for t in tables:
    cols = [r[1] for r in cur.execute(f"PRAGMA table_info({t})")]
    text_cols = [c for c in cols if c.lower() in ("key", "name", "path", "value", "content", "text", "data", "uri", "file_path")]
    for col in text_cols[:3]:
        try:
            rows = cur.execute(
                f"SELECT {col} FROM {t} WHERE CAST({col} AS TEXT) LIKE ? LIMIT 5",
                (f"%BrowserView%",),
            ).fetchall()
            if rows:
                print(f"\n{t}.{col} BrowserView matches:", len(rows))
                for r in rows[:2]:
                    s = str(r[0])[:200]
                    print(" ", s)
        except Exception:
            pass

conn.close()
