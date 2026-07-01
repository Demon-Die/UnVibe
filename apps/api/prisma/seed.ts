import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRACKS = [
  {
    id: "track-frontend-systems",
    title: "Frontend Systems",
    description:
      "Master React component architecture, state management, and modern CSS patterns.",
    published: true,
    modules: [
      {
        id: "mod-react-state",
        title: "React State Management",
        content:
          "Learn useState, useReducer, Context, and Zustand patterns.",
        order: 1,
      },
      {
        id: "mod-css-layout",
        title: "CSS Layout Mastery",
        content:
          "Deep dive into Flexbox, Grid, and responsive design patterns.",
        order: 2,
      },
    ],
  },
  {
    id: "track-ai-workflows",
    title: "AI Workflows",
    description:
      "Build AI-powered features with LLM chains, RAG pipelines, and agent patterns.",
    published: true,
    modules: [
      {
        id: "mod-prompt-eng",
        title: "Prompt Engineering",
        content:
          "Craft effective prompts for code generation and analysis tasks.",
        order: 1,
      },
      {
        id: "mod-rag-pipeline",
        title: "RAG Pipeline Design",
        content:
          "Build retrieval-augmented generation pipelines from scratch.",
        order: 2,
      },
    ],
  },
  {
    id: "track-backend-foundations",
    title: "Backend Foundations",
    description:
      "Design APIs, manage databases, and orchestrate microservices with production patterns.",
    published: false,
    modules: [
      {
        id: "mod-api-design",
        title: "API Design Patterns",
        content:
          "Design RESTful and tRPC APIs with validation and error handling.",
        order: 1,
      },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // Create a demo user (password is "demo1234" — bcrypt hash)
  await prisma.user.upsert({
    where: { email: "demo@unvibe.dev" },
    update: {},
    create: {
      id: "user-demo-001",
      name: "Demo User",
      email: "demo@unvibe.dev",
      image: null,
    },
  });

  for (const trackData of TRACKS) {
    const { modules, ...track } = trackData;
    await prisma.track.upsert({
      where: { id: track.id },
      update: {
        title: track.title,
        description: track.description,
        published: track.published,
      },
      create: track,
    });

    for (const mod of modules) {
      await prisma.module.upsert({
        where: { id: mod.id },
        update: {
          title: mod.title,
          content: mod.content,
          order: mod.order,
          trackId: track.id,
        },
        create: { ...mod, trackId: track.id },
      });
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
