import csv, json, datetime

enc = 'utf-8'
with open(r'D:\CLAUDE\欣然日常觉察\原数据归档\日常项目-快乐治愈小分队_数据表_表格.csv', 'r', encoding=enc) as f:
    reader = csv.reader(f)
    rows = list(reader)

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

    date_str = date_raw.replace('/', '-')
    parts = date_str.split('-')
    if len(parts) == 3:
        date_str = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"

    people = [p.strip() for p in people_raw.split(',') if p.strip()]

    # 构建内容
    content_parts = [f"【情绪事件】\n{event}"]
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

    steps = {
        "event": event,
        "feeling": feeling,
        "defense": touching or "",
        "extend": remember or why or "",
        "zones": ["orange", "green"],
        "emotions": ["喜悦", "感动"],
        "category": "happy"
    }

    try:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
        timestamp = int(dt.timestamp() * 1000)
    except:
        timestamp = int(datetime.datetime.now().timestamp() * 1000)

    diary = {
        "id": timestamp + i,
        "title": "",  # 留空，让 AI 生成
        "date": date_str,
        "source": "guided",
        "category": "happy",
        "steps": steps,
        "content": content,
        "feedback": "",
        "aiSummary": "",  # 留空，闪光页首次展示时 AI 自动生成金句
        "people": [],     # 留空，闪光页首次展示时 AI 自动提取
        "primaryEmotion": "喜悦",
        "createdAt": timestamp,
    }
    diaries.append(diary)

out_path = r'D:\CLAUDE\谢小树\xiao-shu-app\import_data.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(diaries, f, ensure_ascii=False, indent=2)

print(f"Generated {len(diaries)} diary entries -> {out_path}")
print("All aiSummary and people fields left empty for AI generation on first view")
