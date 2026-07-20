import csv, json, re

enc = 'utf-8'
with open(r'D:\CLAUDE\欣然日常觉察\原数据归档\日常项目-快乐治愈小分队_数据表_表格.csv', 'r', encoding=enc) as f:
    reader = csv.reader(f)
    rows = list(reader)

# Header: 今天太开心了吧！, 参与者, 这个地方也太棒了吧, 事件简述, 我的感受, 附件, 打动人心的内容, 为什么它重要, 什么值得我一直记住
# Map: date, people, location, event, feeling, attachments, touching_content, why_important, what_to_remember

diaries = []
for i in range(1, len(rows)):
    row = rows[i]
    if len(row) < 9:
        continue

    date_raw = row[0].strip()
    people_raw = row[1].strip()
    location = row[2].strip()
    event = row[3].strip()
    feeling = row[4].strip()
    attachments = row[5].strip()
    touching = row[6].strip()
    why = row[7].strip()
    remember = row[8].strip()

    if not date_raw:
        continue

    # Parse date - could be YYYY/M/D, YYYY-MM-DD etc
    date_str = date_raw.replace('/', '-')
    # Pad month and day
    parts = date_str.split('-')
    if len(parts) == 3:
        date_str = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"

    # Parse people
    people = [p.strip() for p in people_raw.split(',') if p.strip()]

    # Build a quote/summary for the sparkle card
    # Best quote is "什么值得我一直记住" (remember), fallback to event, then why
    quote = remember or why or event

    # Build the "content" for the diary entry
    content_parts = []
    content_parts.append(f"【情绪事件】\n{event}")
    if location:
        content_parts.append(f"【地点】\n{location}")
    content_parts.append(f"【我的感受】\n{feeling}")
    if touching:
        content_parts.append(f"【打动人心的内容】\n{touching}")
    if why:
        content_parts.append(f"【为什么重要】\n{why}")
    if remember:
        content_parts.append(f"【值得记住】\n{remember}")

    content = "\n\n".join(content_parts)

    # Build steps (matching the app's guided diary structure)
    steps = {
        "event": event,
        "feeling": feeling,
        "defense": touching or "",
        "extend": remember or why or "",
        "zones": ["orange", "green"],  # happy zones
        "emotions": ["喜悦", "感动"],
        "category": "happy"
    }

    # Try to parse timestamp from date
    import datetime
    try:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        timestamp = int(dt.timestamp() * 1000)
    except:
        timestamp = int(datetime.datetime.now().timestamp() * 1000)

    diary = {
        "id": timestamp + i,  # ensure unique
        "title": f"{date_str.replace('-', '')}-{event[:8]}-快乐",
        "date": date_str,
        "source": "guided",
        "category": "happy",
        "steps": steps,
        "content": content,
        "feedback": "",
        "aiSummary": quote,
        "people": people,
        "primaryEmotion": "喜悦",
        "createdAt": timestamp,
    }
    diaries.append(diary)

# Output as JSON
output = json.dumps(diaries, ensure_ascii=False, indent=2)
out_path = r'D:\CLAUDE\谢小树\xiao-shu-app\import_data.json'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Generated {len(diaries)} diary entries -> {out_path}")

# Also print summary of each
for d in diaries:
    print(f"  {d['date']} | {d['aiSummary'][:50]}... | {d['people']}")
