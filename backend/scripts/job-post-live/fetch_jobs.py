# Pakai: python -I fetch_jobs.py jobs.json  (lalu: node eval_jobs.mjs <token> jobs.json hasil.json; backend di :3001). jobs.json jangan di-commit.
# Ambil lowongan publik sungguhan (Greenhouse board API) untuk uji fitur lowongan.
import json, re, html, urllib.request, sys
OUT = sys.argv[1]

def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)

def clean(s):
    s = html.unescape(html.unescape(s or ''))
    s = re.sub(r'<(br|/p|/li|/h\d)[^>]*>', '\n', s)
    s = re.sub(r'<li[^>]*>', '- ', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\n\s*\n+', '\n', s)
    return s.strip()

# role Talkly -> (board, kata kunci judul)
WANT = [
    ('Software Engineer', 'gitlab', r'backend engineer'),
    ('Software Engineer', 'xendit', r'engineer'),
    ('Marketing', 'stripe', r'marketing'),
    ('Sales', 'stripe', r'account executive'),
    ('Finance', 'airbnb', r'financ|account'),
    ('Designer', 'airbnb', r'design'),
    ('General', 'xendit', r'operations|support|customer'),
]
boards = {}
picked = []
for role, board, pat in WANT:
    if board not in boards:
        boards[board] = get(f'https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true')['jobs']
    used = {p['url'] for p in picked}
    for j in boards[board]:
        if re.search(pat, j['title'], re.I) and j['absolute_url'] not in used:
            text = clean(j['content'])
            if len(text) < 300:
                continue
            picked.append({'role': role, 'title': j['title'], 'company': board, 'url': j['absolute_url'],
                           'text': (j['title'] + '\n' + text)[:20000]})
            break
json.dump(picked, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for p in picked:
    print(p['role'], '|', p['company'], '|', p['title'], '|', len(p['text']), '|', p['url'])
