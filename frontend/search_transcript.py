import json

log_path = r'C:\Users\Siri reddy\.gemini\antigravity\brain\1f760043-4fc1-4575-af74-c48766a0618c\.system_generated\logs\transcript_full.jsonl'

try:
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            data = json.loads(line)
            if 'content' in data and data['content']:
                if 'DashboardLayout.jsx' in data['content'] and 'Showing lines' in data['content']:
                    print('FOUND FILE CONTENT:', data.get('created_at'))
except Exception as e:
    print('Error:', e)
