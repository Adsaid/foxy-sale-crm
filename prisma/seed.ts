import "dotenv/config";
import { PrismaClient, type TechStack } from "@prisma/client";

const prisma = new PrismaClient();

const stack: { name: string; audience: TechStack }[] = [
  { name: "TypeScript", audience: "DEV" },
  { name: "JavaScript", audience: "DEV" },
  { name: "React", audience: "DEV" },
  { name: "Next.js", audience: "DEV" },
  { name: "Vue", audience: "DEV" },
  { name: "Angular", audience: "DEV" },
  { name: "Node.js", audience: "DEV" },
  { name: "Express", audience: "DEV" },
  { name: "NestJS", audience: "DEV" },
  { name: "Python", audience: "DEV" },
  { name: "Django", audience: "DEV" },
  { name: "Go", audience: "DEV" },
  { name: "Rust", audience: "DEV" },
  { name: "PostgreSQL", audience: "DEV" },
  { name: "MongoDB", audience: "DEV" },
  { name: "Redis", audience: "DEV" },
  { name: "Docker", audience: "DEV" },
  { name: "Kubernetes", audience: "DEV" },
  { name: "GraphQL", audience: "DEV" },
  { name: "Tailwind CSS", audience: "DEV" },
  { name: "Figma", audience: "DESIGNER" },
  { name: "Adobe XD", audience: "DESIGNER" },
  { name: "Sketch", audience: "DESIGNER" },
  { name: "Adobe Photoshop", audience: "DESIGNER" },
  { name: "Adobe Illustrator", audience: "DESIGNER" },
  { name: "InVision", audience: "DESIGNER" },
  { name: "Framer", audience: "DESIGNER" },
  { name: "Principle", audience: "DESIGNER" },
  { name: "Zeplin", audience: "DESIGNER" },
  { name: "Miro", audience: "DESIGNER" },
];

async function main() {
  for (const { name, audience } of stack) {
    await prisma.technology.upsert({
      where: { name },
      update: { stackAudience: audience },
      create: { name, stackAudience: audience },
    });
  }
  console.log(`Seeded ${stack.length} technologies`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
