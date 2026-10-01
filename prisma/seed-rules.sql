-- Sample rule set for testing AI review
-- Run this SQL in your database to create test data

-- Insert rule set
INSERT INTO "ReviewRuleSet" (id, "ruleSetCode", name, description, version, "isActive", "createdBy", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'CV5512_V1',
  'Công văn 5512 - Chuẩn giáo án THPT',
  'Bộ tiêu chí đánh giá giáo án theo Công văn 5512/BGDĐT-GDTrH về hướng dẫn xây dựng giáo án trong cơ sở giáo dục phổ thông',
  '1.0',
  true,
  (SELECT id FROM "User" WHERE role = 'ADMIN' LIMIT 1),
  NOW(),
  NOW()
);

-- Get the rule set ID
DO $$
DECLARE
  v_rule_set_id uuid;
BEGIN
  SELECT id INTO v_rule_set_id FROM "ReviewRuleSet" WHERE "ruleSetCode" = 'CV5512_V1';

  -- Rule 1: Objectives must have 3 components
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_OBJ_01',
    'Mục tiêu phải có đủ 3 thành phần',
    'Mục tiêu bài học phải bao gồm đầy đủ 3 thành phần: Kiến thức, Kỹ năng, Thái độ',
    'STRUCTURE',
    'ERROR',
    100,
    ARRAY['OBJECTIVES']::text[],
    'Kiểm tra xem phần mục tiêu có đủ 3 thành phần bắt buộc không: (1) Kiến thức - những gì học sinh cần hiểu/nắm được, (2) Kỹ năng - những gì học sinh có khả năng thực hiện được, (3) Thái độ - phẩm chất/giá trị sống cần phát triển. Nếu thiếu bất kỳ thành phần nào, đánh dấu là lỗi ERROR.',
    E'Kiến thức:\n- Hiểu được khái niệm tế bào và các bộ phận cấu tạo\n- Nắm được chức năng của từng bào quan\n\nKỹ năng:\n- Quan sát và nhận biết các bào quan qua kính hiển vi\n- So sánh được sự khác nhau giữa tế bào động vật và thực vật\n\nThái độ:\n- Ham học hỏi, tò mò về thế giới vi mô\n- Cẩn thận, chính xác khi quan sát',
    E'Mục tiêu:\n- Học sinh hiểu được cấu tạo tế bào\n- Học sinh biết các bộ phận của tế bào\n\n(Thiếu thành phần Thái độ)',
    true,
    NOW(),
    NOW()
  );

  -- Rule 2: Use action verbs in objectives
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_OBJ_02',
    'Sử dụng động từ hành động cụ thể',
    'Mục tiêu phải dùng động từ hành động đo lường được, tránh động từ mơ hồ',
    'CONTENT',
    'WARNING',
    90,
    ARRAY['OBJECTIVES']::text[],
    'Kiểm tra xem mục tiêu có sử dụng động từ hành động cụ thể, đo lường được không. Động từ tốt: hiểu được, phân tích được, vận dụng được, so sánh được, giải thích được, thực hiện được. Động từ cần tránh: biết về, làm quen với, tìm hiểu về (quá mơ hồ). Nếu phát hiện động từ mơ hồ, đánh dấu WARNING.',
    'Kiến thức: Học sinh phân tích được quá trình quang hợp ở thực vật',
    'Kiến thức: Học sinh biết về quá trình quang hợp',
    true,
    NOW(),
    NOW()
  );

  -- Rule 3: Objectives must be measurable
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_OBJ_03',
    'Mục tiêu phải cụ thể và đo lường được',
    'Mục tiêu cần nêu rõ nội dung cụ thể, tránh chung chung',
    'CONTENT',
    'WARNING',
    85,
    ARRAY['OBJECTIVES']::text[],
    'Kiểm tra xem mục tiêu có đủ cụ thể không. Mục tiêu tốt phải nêu rõ: (1) Nội dung kiến thức/kỹ năng cụ thể gì, (2) Mức độ thực hiện như thế nào. Tránh các phát biểu chung chung như "Hiểu về bài học", "Biết về chương trình". Nếu quá chung chung, đánh dấu WARNING.',
    'Kiến thức: Học sinh giải thích được cơ chế di truyền của các tính trạng qua 3 định luật Mendel',
    'Kiến thức: Học sinh hiểu về di truyền học',
    true,
    NOW(),
    NOW()
  );

  -- Rule 4: Preparation must list teacher materials
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_PREP_01',
    'Nêu rõ chuẩn bị của giáo viên',
    'Phần chuẩn bị phải liệt kê cụ thể các phương tiện, tài liệu giáo viên cần chuẩn bị',
    'STRUCTURE',
    'WARNING',
    80,
    ARRAY['PREPARATION']::text[],
    'Kiểm tra phần chuẩn bị có nêu rõ những gì giáo viên cần chuẩn bị không. Cần có: (1) Phương tiện dạy học (máy chiếu, slide, video...), (2) Tài liệu tham khảo, (3) Đồ dùng dạy học khác. Nếu không có hoặc quá sơ sài, đánh dấu WARNING.',
    E'Giáo viên:\n- Slide bài giảng (30 slides)\n- Video minh họa quá trình nguyên phân (5 phút)\n- Mô hình tế bào 3D\n- Phiếu học tập (30 bản)',
    'Giáo viên: Chuẩn bị bài giảng',
    true,
    NOW(),
    NOW()
  );

  -- Rule 5: Preparation must list student materials
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_PREP_02',
    'Nêu rõ chuẩn bị của học sinh',
    'Phần chuẩn bị phải nêu rõ học sinh cần chuẩn bị gì',
    'STRUCTURE',
    'INFO',
    70,
    ARRAY['PREPARATION']::text[],
    'Kiểm tra phần chuẩn bị có nêu học sinh cần chuẩn bị gì không. Thường bao gồm: Sách giáo khoa, vở ghi chép, bài cũ cần ôn tập, tìm hiểu trước. Nếu không có, đánh dấu INFO.',
    E'Học sinh:\n- Sách giáo khoa Sinh học 10 (trang 45-52)\n- Vở ghi chép\n- Ôn lại bài "Cấu tạo tế bào"\n- Tìm hiểu trước về chu kỳ tế bào',
    'Học sinh: Mang sách',
    true,
    NOW(),
    NOW()
  );

  -- Rule 6: Teaching process must have required activities
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_TEACH_01',
    'Phải có đủ 4 hoạt động bắt buộc',
    'Tiến trình dạy học phải bao gồm: Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng',
    'STRUCTURE',
    'ERROR',
    100,
    ARRAY['TEACHING_PROCESS']::text[],
    'Kiểm tra tiến trình dạy học có đủ 4 hoạt động bắt buộc không: (1) Khởi động - tạo hứng thú, liên hệ bài cũ, (2) Hình thành kiến thức - hoạt động học chính, (3) Luyện tập - củng cố kiến thức vừa học, (4) Vận dụng - áp dụng vào tình huống mới/thực tế. Nếu thiếu bất kỳ hoạt động nào, đánh dấu ERROR.',
    E'Hoạt động 1: Khởi động (5 phút)\n...\nHoạt động 2: Hình thành kiến thức (25 phút)\n...\nHoạt động 3: Luyện tập (10 phút)\n...\nHoạt động 4: Vận dụng (5 phút)\n...',
    E'Hoạt động 1: Giảng bài mới\nHoạt động 2: Làm bài tập\n(Thiếu hoạt động Khởi động và Vận dụng)',
    true,
    NOW(),
    NOW()
  );

  -- Rule 7: Each activity must specify time
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_TEACH_02',
    'Mỗi hoạt động phải ghi rõ thời gian',
    'Mỗi hoạt động trong tiến trình dạy học phải có thời gian cụ thể',
    'FORMAT',
    'WARNING',
    75,
    ARRAY['TEACHING_PROCESS']::text[],
    'Kiểm tra xem mỗi hoạt động có ghi rõ thời gian không. Thời gian phải cụ thể (số phút hoặc khoảng thời gian). Nếu hoạt động nào không có thời gian, đánh dấu WARNING.',
    'Hoạt động 1: Khởi động (5 phút)',
    'Hoạt động 1: Khởi động',
    true,
    NOW(),
    NOW()
  );

  -- Rule 8: Must show teacher and student activities
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_TEACH_03',
    'Phải nêu rõ hoạt động GV và HS',
    'Mỗi hoạt động phải mô tả rõ GV làm gì và HS làm gì',
    'CONTENT',
    'ERROR',
    95,
    ARRAY['TEACHING_PROCESS']::text[],
    'Kiểm tra xem hoạt động có phân định rõ vai trò GV và HS không. Cần có: (1) Hoạt động của giáo viên (đặt câu hỏi, hướng dẫn, tổ chức...), (2) Hoạt động của học sinh (quan sát, thảo luận, trả lời, thực hành...). Nếu không phân định rõ hoặc chỉ có GV hoặc chỉ có HS, đánh dấu ERROR.',
    E'Hoạt động của GV:\n- Đặt câu hỏi: "Em hãy quan sát hình 3.1 và cho biết tế bào có mấy bộ phận?"\n- Hướng dẫn HS quan sát\n\nHoạt động của HS:\n- Quan sát hình vẽ\n- Thảo luận nhóm 2 phút\n- Đại diện nhóm trả lời',
    'GV giảng bài về cấu tạo tế bào, sau đó cho HS làm bài tập',
    true,
    NOW(),
    NOW()
  );

  -- Rule 9: Questions must be open-ended
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_TEACH_04',
    'Câu hỏi phải mở, khơi gợi tư duy',
    'Câu hỏi của GV cần khơi gợi tư duy, không nên là câu hỏi đóng có/không',
    'PEDAGOGY',
    'INFO',
    60,
    ARRAY['TEACHING_PROCESS']::text[],
    'Kiểm tra chất lượng câu hỏi. Câu hỏi tốt: mở, yêu cầu giải thích/phân tích/so sánh, khuyến khích suy nghĩ. Câu hỏi kém: đóng (có/không, đúng/sai), chỉ nhớ lại kiến thức. Nếu có nhiều câu hỏi đóng hoặc câu hỏi kém chất lượng, đánh dấ INFO để gợi ý cải thiện.',
    'GV: "Hãy phân tích vai trò của ty thể trong quá trình hô hấp tế bào và giải thích tại sao ty thể được gọi là nhà máy năng lượng?"',
    'GV: "Ty thể có phải là bào quan không?" (Câu hỏi đóng)',
    true,
    NOW(),
    NOW()
  );

  -- Rule 10: Must show student activeness
  INSERT INTO "ReviewRule" (id, "ruleSetId", "ruleCode", "ruleName", description, category, severity, priority, "applicableSections", "aiPrompt", "correctExamples", "incorrectExamples", "isActive", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid(),
    v_rule_set_id,
    'CV5512_TEACH_05',
    'Thể hiện tính tích cực của học sinh',
    'Hoạt động phải thể hiện HS chủ động, tích cực tham gia',
    'PEDAGOGY',
    'WARNING',
    65,
    ARRAY['TEACHING_PROCESS']::text[],
    'Đánh giá mức độ học sinh chủ động trong hoạt động. Dấu hiệu tốt: HS thảo luận nhóm, HS tự khám phá, HS thực hành, HS đặt câu hỏi, HS thuyết trình. Dấu hiệu kém: GV giảng một chiều, HS chỉ nghe, HS thủ động. Nếu hoạt động thiên về thụ động, đánh dấu WARNING.',
    E'HS thảo luận nhóm 4 người, phân tích các đặc điểm của tế bào thực vật và động vật, sau đó lập bảng so sánh. Đại diện nhóm trình bày, các nhóm khác nhận xét bổ sung.',
    'GV trình chiếu slide và giảng bài, HS ghi chép vào vở.',
    true,
    NOW(),
    NOW()
  );

END $$;
