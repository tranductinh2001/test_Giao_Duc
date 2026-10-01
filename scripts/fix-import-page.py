#!/usr/bin/env python3
import re

# Đọc file
with open('src/app/admin/questions/import/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Xóa isDraft từ interface
content = re.sub(r'\s*isDraft:\s*boolean;\s*', '\n', content)

# 2. Xóa isDraft trong render
content = re.sub(r'\s*<div>.*?Draft.*?isDraft.*?</div>', '', content, flags=re.DOTALL)

# Ghi lại file
with open('src/app/admin/questions/import/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done - Removed isDraft from import/page.tsx")
