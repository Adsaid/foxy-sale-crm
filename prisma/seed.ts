import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const technologies = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Node.js",
  "Express",
  "NestJS",
  "Python",
  "Django",
  "Go",
  "Rust",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "GraphQL",
  "Tailwind CSS",
];

async function main() {
  for (const name of technologies) {
    await prisma.technology.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${technologies.length} technologies`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
