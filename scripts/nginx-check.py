import os, sys, re
from datetime import datetime, timezone, timedelta

cutoff = datetime.now(timezone.utc) - timedelta(minutes=35)
try:
    build_cutoff = datetime.fromtimestamp(
        os.path.getmtime("/var/www/mybingocard.com/.next/BUILD_ID"),
        timezone.utc,
    )
    if build_cutoff > cutoff:
        cutoff = build_cutoff
except Exception:
    pass
counts = {}
log_paths = [
    os.environ.get("MYBINGOCARD_NGINX_ACCESS_LOG"),
    "/var/log/nginx/mybingocard.com.access.log",
]

try:
    log_path = next((path for path in log_paths if path and os.path.exists(path)), None)
    if not log_path:
        print("MyBingoCard dedicated Nginx access log is missing", file=sys.stderr)
        sys.exit(1)

    with open(log_path) as f:
        for line in f:
            m = re.search(r'\[(\d{2}/\w+/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4})\]', line)
            sm = re.search(r'" (\d{3}) ', line)
            if not m or not sm:
                continue
            try:
                ts = datetime.strptime(m.group(1), '%d/%b/%Y:%H:%M:%S %z')
            except:
                continue
            if ts < cutoff:
                continue
            code = sm.group(1)
            if not code.startswith('5'):
                continue
            url = re.search(r'"\S+ (\S+) ', line)
            target = url.group(1) if url else '?'
            key = code + ' ' + target
            counts[key] = counts.get(key, 0) + 1
    for k, v in sorted(counts.items(), key=lambda x: -x[1])[:10]:
        print(f'{v:>6} {k}')
except Exception as e:
    print(f"Could not scan MyBingoCard Nginx access log: {e}", file=sys.stderr)
    sys.exit(1)
