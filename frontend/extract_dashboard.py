import json

log_path = r'C:\Users\Siri reddy\.gemini\antigravity\brain\1f760043-4fc1-4575-af74-c48766a0618c\.system_generated\logs\transcript_full.jsonl'

found = None
try:
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if 'content' in data and data['content']:
                if 'pages/salesperson/SalespersonDashboard.jsx' in data['content'] and 'Showing lines' in data['content']:
                    found = data['content']
                    if data.get('created_at') > '2026-10-01T04:00:00Z' and data.get('created_at') < '2026-10-01T05:30:00Z':
                        break
    if found:
        with open('old_sales.txt', 'w', encoding='utf-8') as out:
            out.write(found)
except Exception as e:
    print('Error:', e)
