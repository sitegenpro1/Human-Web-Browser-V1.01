import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

db = Path.home() / "AppData/Local/zed/db/0-stable/db.sqlite"
conn = sqlite3.connect(str(db))
cur = conn.cursor()

paths = [
    r"C:\Users\Admin\Downloads\browser.apk-clean\browser.apk-clean\artifacts\mobile\components\BrowserView.native.tsx",
    r"C:\Users\Admin\Downloads\browser.apk-clean\browser.apk-clean\artifacts\mobile\app\(tabs)\index.tsx",
    r"C:\Users\Admin\Downloads\browser.apk-clean\browser.apk-clean\artifacts\mobile\lib\buildSearchUrl.ts",
]

pk5 = timezone(timedelta(hours=5))

def fmt_ts(secs, nanos=0):
    if secs is None:
        return "?"
    dt = datetime.fromtimestamp(secs + (nanos or 0) / 1e9, tz=pk5)
    return dt.strftime("%Y-%m-%d %H:%M:%S")

for path in paths:
    rows = cur.execute(
        """
        SELECT item_id, mtime_seconds, mtime_nanos, length(contents), scroll_top_row
        FROM editors
        WHERE path = ?
        ORDER BY mtime_seconds DESC, mtime_nanos DESC
        """,
        (path.encode() if isinstance(path, str) else path,),
    ).fetchall()
    print(f"\n=== {Path(path).name} ({len(rows)} snapshots) ===")
    for r in rows[:15]:
        print(f"  id={r[0]}  {fmt_ts(r[1], r[2])}  bytes={r[3]}")

# Target window: Aug 3 or Aug 5 22:18-22:22 PKT
for label, day in [("Aug 3", 3), ("Aug 5", 5)]:
    start = datetime(2026, 8, day, 22, 18, 0, tzinfo=pk5).timestamp()
    end = datetime(2026, 8, day, 22, 22, 0, tzinfo=pk5).timestamp()
    print(f"\n=== Window {label} 22:18-22:22 PKT ===")
    rows = cur.execute(
        """
        SELECT path, item_id, mtime_seconds, mtime_nanos, length(contents)
        FROM editors
        WHERE mtime_seconds BETWEEN ? AND ?
          AND (path LIKE '%BrowserView.native%' OR path LIKE '%index.tsx%' OR path LIKE '%buildSearchUrl%')
        ORDER BY mtime_seconds
        """,
        (start, end),
    ).fetchall()
    for r in rows:
        print(f"  {fmt_ts(r[2], r[3])}  {r[4]}b  {r[0].decode(errors='replace')}")

conn.close()
