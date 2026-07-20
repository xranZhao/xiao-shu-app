import csv, json, sys

enc = 'utf-8'
with open(r'D:\CLAUDE\欣然日常觉察\原数据归档\日常项目-快乐治愈小分队_数据表_表格.csv', 'r', encoding=enc) as f:
    reader = csv.reader(f)
    rows = list(reader)

output = []
output.append(f'Total rows: {len(rows)}')
output.append(f'\n=== HEADER ({len(rows[0])} cols) ===')
for j, col in enumerate(rows[0]):
    output.append(f'Col{j}: {col}')

# Print first 5 data rows structure
for i in range(1, min(6, len(rows))):
    row = rows[i]
    output.append(f'\n=== Row {i} ({len(row)} cols) ===')
    for j, col in enumerate(row):
        output.append(f'Col{j}: [{len(col)} chars] {col[:120]}')

with open(r'D:\CLAUDE\谢小树\xiao-shu-app\csv_preview.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print("Done. Wrote csv_preview.txt")
