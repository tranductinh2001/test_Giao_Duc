# Chức năng Chỉnh Sửa Kế Hoạch Bài Dạy

## Tổng quan
Chức năng chỉnh sửa kế hoạch bài dạy cho phép người dùng (Owner, Editor, Admin) chỉnh sửa cả metadata và nội dung các section của giáo án với đầy đủ version control.

## Các chức năng đã triển khai

### 1. API Endpoints

#### a. GET/PATCH/DELETE `/api/lesson-plans/[id]/sections/[sectionId]`
- **GET**: Lấy thông tin chi tiết của một section
- **PATCH**: Cập nhật nội dung section
  - Tự động tính word count và char count
  - Hỗ trợ tạo version mới (optional)
  - Ghi log vào ReviewHistory
  - Cập nhật status giáo án thành "EDITING"
- **DELETE**: Xóa section (chỉ Owner và Admin)

**Request body cho PATCH:**
```json
{
  "rawContent": "Nội dung mới...",
  "sectionTitle": "Tiêu đề section (optional)",
  "createVersion": true/false
}
```

**Permissions:**
- GET: Owner, Editor, Viewer, Admin
- PATCH: Owner, Editor, Admin
- DELETE: Owner, Admin

#### b. GET `/api/lesson-plans/[id]/versions`
- Lấy danh sách lịch sử versions của giáo án
- Thông tin trả về: versionNumber, filePath, fileSize, changeSummary, createdBy, createdAt
- Sắp xếp theo versionNumber giảm dần (version mới nhất trước)

**Permissions:** Owner, Editor, Viewer, Admin

### 2. UI Components

#### a. EditSectionModal
**Vị trí:** `src/components/lesson-plans/EditSectionModal.tsx`

**Chức năng:**
- Hiển thị form chỉnh sửa nội dung section
- Real-time word count và char count
- So sánh với số liệu cũ
- Checkbox để tạo version mới
- Textarea với font monospace để dễ đọc
- Loading states và error handling

**Props:**
```typescript
interface EditSectionModalProps {
  lessonPlanId: string;
  sectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

#### b. VersionHistoryModal
**Vị trí:** `src/components/lesson-plans/VersionHistoryModal.tsx`

**Chức năng:**
- Hiển thị danh sách tất cả versions
- Highlight version hiện tại
- Hiển thị thông tin: version number, người tạo, thời gian, file size, change summary
- Button download (placeholder - chưa implement)

**Props:**
```typescript
interface VersionHistoryModalProps {
  lessonPlanId: string;
  isOpen: boolean;
  onClose: () => void;
}
```

### 3. Tích hợp vào trang chi tiết

**File:** `src/app/lesson-plans/[id]/page.tsx`

**Các nút mới được thêm:**
1. **Nút "Lịch sử"**: Mở VersionHistoryModal (chỉ Owner và Admin)
2. **Nút "Chỉnh sửa"** trên mỗi section: Mở EditSectionModal (Owner, Editor, Admin)

## Workflow sử dụng

### Chỉnh sửa metadata giáo án
1. Vào trang chi tiết giáo án
2. Click nút "Sửa" ở góc phải (header)
3. Sửa title, subject, gradeLevel, schoolYear
4. Click "Lưu thay đổi"

### Chỉnh sửa nội dung section
1. Vào trang chi tiết giáo án
2. Scroll xuống phần "Các phần trong giáo án"
3. Click nút "Chỉnh sửa" trên section muốn sửa
4. Modal sẽ hiển thị với:
   - Tiêu đề section (có thể sửa)
   - Nội dung hiện tại (textarea lớn)
   - Word count và char count real-time
   - Checkbox "Tạo version mới"
5. Chỉnh sửa nội dung
6. **Khuyến nghị**: Tick "Tạo version mới" nếu là thay đổi lớn
7. Click "Lưu thay đổi"

### Xem lịch sử versions
1. Vào trang chi tiết giáo án
2. Click nút "Lịch sử" ở góc phải (header)
3. Modal hiển thị danh sách versions:
   - Version hiện tại được highlight
   - Thông tin đầy đủ về mỗi version
   - Nút Download (tính năng sẽ được bổ sung)

## Version Control

### Khi nào tạo version mới?
- **Nên tạo version:** 
  - Thay đổi lớn về nội dung (>30% section)
  - Thay đổi cấu trúc section
  - Trước khi áp dụng feedback từ review AI
  
- **Không cần tạo version:**
  - Sửa lỗi chính tả nhỏ
  - Thay đổi format văn bản
  - Chỉnh sửa metadata (title, subject...)

### Cơ chế version control
1. Khi tick "Tạo version mới":
   - Tạo record mới trong `LessonPlanVersion` với versionNumber tăng dần
   - Lưu filePath và fileSize hiện tại
   - Ghi changeSummary (tự động hoặc manual)
   - Update `currentVersion` của LessonPlan
   
2. Mỗi version lưu trữ:
   - File gốc tại thời điểm đó
   - Metadata về thay đổi
   - Người thực hiện
   - Timestamp

## Testing Checklist

### API Testing
- [x] GET section detail - check permissions
- [x] PATCH section - Owner có thể sửa
- [x] PATCH section - Editor có thể sửa
- [x] PATCH section - Viewer không thể sửa (403)
- [x] PATCH section with createVersion=true - tạo version mới
- [x] PATCH section with createVersion=false - không tạo version
- [x] DELETE section - chỉ Owner và Admin
- [x] GET versions - lấy danh sách versions
- [x] Word count và char count tính đúng

### UI Testing
- [ ] EditSectionModal mở/đóng chính xác
- [ ] Load section data đúng
- [ ] Real-time word/char count hoạt động
- [ ] Checkbox "Tạo version mới" hoạt động
- [ ] Submit form và hiển thị toast notification
- [ ] Refresh data sau khi sửa thành công
- [ ] VersionHistoryModal hiển thị đúng versions
- [ ] Nút "Chỉnh sửa" chỉ hiện với đúng permissions
- [ ] Nút "Lịch sử" chỉ hiện với Owner và Admin

### Permission Testing
- [ ] Owner: Có thể sửa sections, xem lịch sử, xóa sections
- [ ] Editor: Có thể sửa sections, xem lịch sử, KHÔNG xóa sections
- [ ] Viewer: Chỉ xem, KHÔNG sửa
- [ ] Admin: Full permissions

### Edge Cases
- [ ] Section với nội dung rất dài (>10,000 ký tự)
- [ ] Section với nội dung rỗng (validation)
- [ ] Nhiều người sửa cùng lúc (concurrent edits)
- [ ] Network error khi submit
- [ ] Tạo nhiều versions liên tiếp

## Các chức năng chưa implement

1. **Download version cũ**: Nút download trong VersionHistoryModal chưa hoạt động
2. **Rollback version**: Khôi phục về version cũ
3. **So sánh versions**: Diff view giữa 2 versions
4. **Rich text editor**: Hiện tại dùng textarea thuần, có thể nâng cấp lên WYSIWYG editor
5. **Real-time collaboration**: Multiple users edit đồng thời với conflict resolution
6. **Comment/track changes**: Như Microsoft Word track changes

## Ghi chú kỹ thuật

### Database Schema
- `LessonPlan.status` được update thành "EDITING" khi có chỉnh sửa
- `LessonPlanVersion` lưu lịch sử với foreign key đến LessonPlan
- `ReviewHistory` ghi log mọi thay đổi với actionType="EDITED"

### Performance
- Word count: O(n) với n là số ký tự
- Char count: O(1)
- Version creation: 1 transaction với 3 queries (insert version, update plan, insert history)

### Security
- Tất cả endpoints đều check authentication
- Permission check dựa trên userId, collaborators, và role
- Soft delete cho sections (có thể restore)

## Troubleshooting

### Lỗi "Không có quyền chỉnh sửa"
- Kiểm tra user permission trong lesson plan
- Chỉ Owner, Editor, Admin mới sửa được

### Modal không mở
- Kiểm tra `isOpen` state
- Kiểm tra console có lỗi không

### Không lưu được thay đổi
- Kiểm tra network tab
- Kiểm tra validation (content không được rỗng)
- Kiểm tra backend logs

### Version không tăng
- Kiểm tra đã tick "Tạo version mới" chưa
- Kiểm tra database `LessonPlanVersion` table
