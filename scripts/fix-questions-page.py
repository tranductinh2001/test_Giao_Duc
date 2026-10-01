#!/usr/bin/env python3
import re

# Đọc file
with open('src/app/admin/questions/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Xóa isDraft từ interface
content = re.sub(r'\s*isDraft:\s*boolean;\s*', '\n', content)

# 2. Xóa state isDraft
content = re.sub(r'\s*const \[isDraft, setIsDraft\] = useState\(""\);\s*', '\n', content)

# 3. Xóa formIsDraft state
content = re.sub(r'\s*const \[formIsDraft, setFormIsDraft\] = useState\(false\);\s*', '\n', content)

# 4. Xóa isDraft trong params
content = re.sub(r'\s*if \(isDraft\) params\.append\("isDraft", isDraft\);\s*', '', content)

# 5. Xóa setFormIsDraft
content = re.sub(r'\s*setFormIsDraft\([^)]+\);\s*', '', content)

# 6. Xóa isDraft: formIsDraft trong body
content = re.sub(r',?\s*isDraft:\s*formIsDraft\s*,?', '', content)
content = re.sub(r',?\s*isDraft:\s*!q\.isDraft\s*,?', '', content)

# 7. Xóa handleToggleDraft function
content = re.sub(r'\s*const handleToggleDraft = async \(q: Question\) => \{[^}]+\};\s*', '\n', content, flags=re.DOTALL)

# 8. Xóa filter isDraft trong form
content = re.sub(r'<select[^>]*value=\{isDraft\}[^>]*>.*?</select>', '', content, flags=re.DOTALL)

# 9. Xóa dependency isDraft trong useEffect
content = re.sub(r',\s*isDraft(?=\s*\])', '', content)

# 10. Xóa cột "Trạng thái" trong table header
content = re.sub(r'<th[^>]*>Trạng thái</th>', '', content)

# 11. Xóa cell trạng thái trong table body
pattern = r'<td className="px-6 py-4 text-center">\s*<button[^>]*onClick=\{\(\) => handleToggleDraft\(q\)\}[^>]*>.*?</button>\s*</td>'
content = re.sub(pattern, '', content, flags=re.DOTALL)

# 12. Fix colSpan
content = re.sub(r'colSpan=\{5\}', 'colSpan={4}', content)

# Ghi lại file
with open('src/app/admin/questions/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done - Removed isDraft from page.tsx")
