import "dotenv/config";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { authConfig } from "../src/auth.config";
import { generateLicenseCode } from "../src/features/licenses/services/LicenseService";
import { calculateScore, shuffleArray } from "../src/features/exams/services/ExamService";
import { ImportService } from "../src/features/questions/services/ImportService";
import { CategoryService } from "../src/features/questions/services/CategoryService";
import { prisma } from "../src/lib/prisma";

async function testShuffleArray() {
  const input = [1, 2, 3, 4, 5];
  const output = shuffleArray(input);

  assert.deepEqual([...output].sort((a, b) => a - b), input, "shuffleArray must preserve elements");
  assert.equal(input.join(","), "1,2,3,4,5", "shuffleArray must not mutate the original array");
}

function testCalculateScore() {
  assert.equal(calculateScore(6, 10), 60);
  assert.equal(calculateScore(0, 10), 0);
  assert.equal(calculateScore(1, 0), 0);
}

function testGenerateLicenseCode() {
  const code = generateLicenseCode();
  assert.match(code, /^VIC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
}

function testAuthorizedCallback() {
  const authorized = authConfig.callbacks.authorized;
  assert.ok(authorized, "authorized callback must exist");

  const allowGuestHome = authorized({
    auth: null,
    request: { nextUrl: new URL("http://localhost:3000/") },
  } as never);
  assert.equal(allowGuestHome, true, "Guests should access public routes");

  const blockLearnerAdmin = authorized({
    auth: { user: { role: "LEARNER" } },
    request: { nextUrl: new URL("http://localhost:3000/admin") },
  } as never);
  assert.equal(blockLearnerAdmin, false, "Learners should be blocked from admin routes");

  const allowAdminApi = authorized({
    auth: { user: { role: "ADMIN" } },
    request: { nextUrl: new URL("http://localhost:3000/api/admin/users") },
  } as never);
  assert.equal(allowAdminApi, true, "Admins should access admin API routes");

  const blockGuestApp = authorized({
    auth: null,
    request: { nextUrl: new URL("http://localhost:3000/dashboard") },
  } as never);
  assert.equal(blockGuestApp, false, "Guests should be blocked from learner app routes");
}

async function testParseExcelFile() {
  const service = new ImportService();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      No: 1,
      QuestionContent: "Cau hoi mau 1?",
      ChoiceA: "A1",
      ChoiceB: "B1",
      ChoiceC: "C1",
      ChoiceD: "D1",
      CorrectAnswer: "B",
      Explanation: "Giai thich",
      Difficulty: "MEDIUM",
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const result = await service.parseExcelFile(buffer, "11111111-1111-1111-1111-111111111111");
  assert.equal(result.errors.length, 0, "Excel parser should accept a valid row");
  assert.equal(result.questions.length, 1, "Excel parser should return one question");
  assert.equal(result.questions[0].choices.length, 4);
  assert.equal(result.questions[0].choices[1].isCorrect, true);
}

async function testParseJsonFile() {
  const service = new ImportService();
  const payload = [
    {
      content: "Cau hoi JSON?",
      explanation: "Giai thich JSON",
      difficulty: "HARD",
      choices: [
        { content: "A", isCorrect: false },
        { content: "B", isCorrect: true },
        { content: "C", isCorrect: false },
        { content: "D", isCorrect: false },
      ],
    },
  ];

  const buffer = Buffer.from(JSON.stringify(payload), "utf8");
  const result = await service.parseJsonFile(buffer, "550e8400-e29b-41d4-a716-446655440000");

  assert.equal(result.errors.length, 0, "JSON parser should accept a valid payload");
  assert.equal(result.questions.length, 1, "JSON parser should return one question");
  assert.equal(result.questions[0].difficulty, "HARD");
  // isDraft field removed from schema
}

async function testCategoryRecursiveCount() {
  const service = new CategoryService();

  // Create test parent category
  const parent = await prisma.category.create({
    data: { name: "TEST-PARENT-CAT" },
  });

  // Create test child category
  const child = await prisma.category.create({
    data: { name: "TEST-CHILD-CAT", parentId: parent.id },
  });

  // Create test questions
  // 1 approved in parent
  const q1 = await prisma.question.create({
    data: {
      content: "Q1 Approved Parent",
      difficulty: "MEDIUM",
      categoryId: parent.id,
    },
  });

  // 1 draft in parent (should NOT be counted)
  const q2 = await prisma.question.create({
    data: {
      content: "Q2 Draft Parent",
      difficulty: "MEDIUM",
      categoryId: parent.id,
    },
  });

  // 1 approved in child
  const q3 = await prisma.question.create({
    data: {
      content: "Q3 Approved Child",
      difficulty: "MEDIUM",
      categoryId: child.id,
    },
  });

  try {
    const flatList = await service.getFlatCategories();
    
    const parentNode = flatList.find((c) => c.id === parent.id);
    const childNode = flatList.find((c) => c.id === child.id);

    assert.ok(parentNode, "Parent category should be found in flat categories");
    assert.ok(childNode, "Child category should be found in flat categories");

    assert.equal(childNode.questionCount, 1, "Child category should only count its own question");
    assert.equal(parentNode.questionCount, 3, "Parent category should count its own + child + draft questions");
  } finally {
    // Cleanup
    await prisma.question.deleteMany({
      where: { id: { in: [q1.id, q2.id, q3.id] } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: [parent.id, child.id] } },
    });
  }
}

async function main() {
  const tests = [
    ["shuffleArray", testShuffleArray],
    ["calculateScore", testCalculateScore],
    ["generateLicenseCode", testGenerateLicenseCode],
    ["authorizedCallback", testAuthorizedCallback],
    ["parseExcelFile", testParseExcelFile],
    ["parseJsonFile", testParseJsonFile],
    ["categoryRecursiveCount", testCategoryRecursiveCount],
  ] as const;

  let passed = 0;

  for (const [name, test] of tests) {
    try {
      await test();
      console.log(`PASS ${name}`);
      passed++;
    } catch (error) {
      console.error(`FAIL ${name}`);
      throw error;
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
