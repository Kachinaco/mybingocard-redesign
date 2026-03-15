import sys, re
from datetime import datetime, timezone, timedelta

cutoff = datetime.now(timezone.utc) - timedelta(minutes=35)
counts = {}

try:
    with open('/var/log/nginx/mybingocard.com.access.log') as f:
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
            key = code + ' ' + (url.group(1) if url else '?')
            counts[key] = counts.get(key, 0) + 1
    for k, v in sorted(counts.items(), key=lambda x: -x[1])[:10]:
        print(f'{v:>6} {k}')
except Exception as e:
    sys.exit(0)
