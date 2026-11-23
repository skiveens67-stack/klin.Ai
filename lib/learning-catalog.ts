export type KlinLesson = { key: string; title: string; summary: string; estimated_minutes: number };
export type KlinCourse = { key: string; title: string; description: string; level: "beginner" | "intermediate"; lessons: KlinLesson[]; estimated_minutes_total: number };

export const KLIN_LEARNING_COURSES: KlinCourse[] = [
  {
    key: "ai-foundations",
    title: "AI Foundations",
    description: "Understand what AI systems do, how prompts work, and how to use AI responsibly.",
    level: "beginner",
    lessons: [
      { key: "what-is-ai", title: "What AI is and is not", summary: "Learn the difference between AI, machine learning, and ordinary software.", estimated_minutes: 8 },
      { key: "how-models-work", title: "How language models work", summary: "Explore tokens, training, context, and why models can make mistakes.", estimated_minutes: 12 },
      { key: "prompt-basics", title: "Writing useful prompts", summary: "Give clear goals, context, constraints, and examples.", estimated_minutes: 10 },
      { key: "safe-ai-use", title: "Safe and responsible AI use", summary: "Protect private information and verify important answers.", estimated_minutes: 10 },
    ],
  },
  {
    key: "web-development-basics",
    title: "Web Development Basics",
    description: "Learn the parts of a website and how frontend, backend, data, and hosting fit together.",
    level: "beginner",
    lessons: [
      { key: "web-pages", title: "How web pages are built", summary: "Understand HTML structure, CSS styling, and browser rendering.", estimated_minutes: 12 },
      { key: "javascript-basics", title: "JavaScript and interaction", summary: "Learn variables, functions, events, and basic application logic.", estimated_minutes: 15 },
      { key: "frontend-backend", title: "Frontend and backend", summary: "Understand APIs, authentication, databases, and server-side code.", estimated_minutes: 12 },
      { key: "testing-deploying", title: "Testing and publishing", summary: "Learn the purpose of tests, previews, deployments, and rollback.", estimated_minutes: 10 },
    ],
  },
  {
    key: "creator-business-basics",
    title: "Creator Business Basics",
    description: "Learn how to shape a product, price it, and sell it with clear customer terms.",
    level: "beginner",
    lessons: [
      { key: "find-a-problem", title: "Start with a real problem", summary: "Identify a customer, their need, and a useful solution.", estimated_minutes: 10 },
      { key: "build-an-offer", title: "Build a clear offer", summary: "Describe what is included, who it helps, and what it costs.", estimated_minutes: 12 },
      { key: "pricing-basics", title: "Pricing and costs", summary: "Estimate costs, fees, margins, and support obligations.", estimated_minutes: 12 },
      { key: "selling-safely", title: "Selling safely online", summary: "Understand honest listings, refunds, privacy, and payment security.", estimated_minutes: 10 },
    ],
  },
];

for (const course of KLIN_LEARNING_COURSES) {
  course.estimated_minutes_total = course.lessons.reduce((total, lesson) => total + lesson.estimated_minutes, 0);
}

export function getKlinCourse(courseKey: string): KlinCourse | null {
  return KLIN_LEARNING_COURSES.find((course) => course.key === courseKey) ?? null;
}
