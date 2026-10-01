import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function check() {
  // Check templates
  const templates = await prisma.rule_templates.findMany({
    take: 5,
    select: { code: true, name: true, isActive: true }
  });
  console.log("=== TEMPLATES ===");
  console.log(templates);

  // Check template by code
  const template = await prisma.rule_templates.findUnique({
    where: { code: "CV958" },
    include: {
      section_parser_rules: { where: { isActive: true } },
      section_structure_rules: { where: { isActive: true } },
      section_content_rules: { where: { isActive: true } },
      section_fix_rules: { where: { isActive: true } },
      section_scoring_rules: { where: { isActive: true } },
    }
  });

  console.log("\n=== CV958 TEMPLATE RULES ===");
  if (template) {
    console.log("Parser Rules:", template.section_parser_rules.length);
    console.log("Structure Rules:", template.section_structure_rules.length);
    console.log("Content Rules:", template.section_content_rules.length);
    console.log("Fix Rules:", template.section_fix_rules.length);
    console.log("Scoring Rules:", template.section_scoring_rules.length);
  } else {
    console.log("Template CV958 not found");
  }

  // Check global counts
  console.log("\n=== GLOBAL COUNTS ===");
  console.log("Total Parser Rules:", await prisma.section_parser_rules.count());
  console.log("Total Structure Rules:", await prisma.section_structure_rules.count());
  console.log("Total Content Rules:", await prisma.section_content_rules.count());
  console.log("Total Fix Rules:", await prisma.section_fix_rules.count());
  console.log("Total Scoring Rules:", await prisma.section_scoring_rules.count());

  await prisma.$disconnect();
}

check().catch(console.error);
