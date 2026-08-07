import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

db = Path.home() / "AppData/Local/zed/db/0-stable/db.sqlite"
conn = sqlite3.connect(str(db))
cur = conn.cursor()
pk5 = timezone(timedelta(hours=5))

def fmt_ms(ms):
    if not ms:
        return "?"
    return datetime.fromtimestamp(ms / 1000, tz=pk5).strftime("%Y-%m-%d %H:%M:%S")

print("=== sidebar_threads ===")
for r in cur.execute(
    "SELECT thread_id, title, created_at, updated_at, interacted_at FROM sidebar_threads ORDER BY updated_at DESC LIMIT 20"
):
    print(f"{fmt_ms(r[3])}  {r[1]!r}  created={fmt_ms(r[2])}")

print("\n=== command_invocations (browser related) ===")
for r in cur.execute(
    "SELECT command_name, user_query, last_invoked FROM command_invocations WHERE user_query IS NOT NULL ORDER BY last_invoked DESC LIMIT 30"
):
    q = (r[1] or b"").decode("utf-8", errors="replace")[:120]
    if any(k in q.lower() for k in ["google", "image", "ai mode", "browser", "udm", "duck", "remount", "reload"]):
        print(f"{fmt_ms(r[2])}  {q}")

print("\n=== scoped_kv_store sample keys ===")
for r in cur.execute(
    "SELECT namespace, key, length(value) FROM scoped_kv_store ORDER BY length(value) DESC LIMIT 15"
):
    k = r[1].decode("utf-8", errors="replace") if isinstance(r[1], bytes) else str(r[1])
    print(f"ns={r[0]!r} key={k[:80]!r} len={r[2]}")

conn.close()
