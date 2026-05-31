import type { BrainMatch } from "../types";

type BrainEntry = {
  title: string;
  source: string;
  keywords: string[];
  answer: string;
};

const brainEntries: BrainEntry[] = [
  {
    title: "B.R.A.C.E Identity",
    source: "00_HOME/B.R.A.C.E Master Dashboard.md",
    keywords: ["brace", "full form", "identity", "purpose", "brain"],
    answer:
      "B.R.A.C.E means Brain / Responsive / Agentic / Companion / Engine. Its local brain is the Obsidian vault that organizes AI, studies, CWIT, coding, projects, research, and daily planning.",
  },
  {
    title: "Vault Navigation",
    source: "00_HOME/Vault Navigation Map.md",
    keywords: ["navigation", "vault", "folders", "dashboard", "where"],
    answer:
      "The vault starts from the master dashboard, then routes knowledge through Home, Inbox, AI Universe, World Intelligence, CWIT, Studies, Projects, Coding, Personal Growth, Research, Automation, and Archive.",
  },
  {
    title: "CWIT Official Information",
    source: "04_CWIT_COLLEGE_PUNE/CWIT Official Information.md",
    keywords: ["cwit", "college", "pune", "address", "contact", "admission", "exam"],
    answer:
      "CWIT is Modern Education Society's Cusrow Wadia Institute of Technology, Pune. The saved official details include Wadia College Campus, 19 Bund Garden Road, Pune-411001, contact 020-26164814, and email cwitpune1@gmail.com. Official updates must be checked from CWIT, MSBTE, DTE Maharashtra, or AICTE sources.",
  },
  {
    title: "Automation Rules",
    source: "10_AUTOMATION_SYSTEM/Automation Dashboard.md",
    keywords: ["automation", "rss", "updates", "news", "python", "scheduler"],
    answer:
      "The automation system checks configured RSS feeds and official pages, removes duplicates, writes sourced Markdown notes, logs failures, and never invents updates. If a source fails, it records: Update not verified. Source unavailable.",
  },
  {
    title: "Gemini Fallback Policy",
    source: "10_AUTOMATION_SYSTEM/Source Reliability System.md",
    keywords: ["gemini", "api", "fallback", "source", "reliability"],
    answer:
      "B.R.A.C.E should answer from the local brain first. Gemini is only a fallback when the brain has no strong match and a Gemini API key is available. External answers still need source and reliability checks.",
  },
  {
    title: "Study System",
    source: "05_STUDIES/Study Dashboard.md",
    keywords: ["study", "plan", "semester", "exam", "viva", "assignment"],
    answer:
      "The Study Dashboard tracks diploma subjects, assignments, practical files, exam preparation, viva questions, MCQs, weak topics, and revision schedules.",
  },
  {
    title: "Project System",
    source: "06_PROJECTS/Projects Dashboard.md",
    keywords: ["project", "lernio", "portfolio", "voice agent", "roadmap", "bugs"],
    answer:
      "The Projects Dashboard tracks B.R.A.C.E, LERNIO, Portfolio Website, CampusMate, AI Voice Agent, n8n Chatbot, deployment notes, bugs, feature ideas, and roadmaps.",
  },
  {
    title: "AI Universe",
    source: "02_AI_UNIVERSE/AI Master Dashboard.md",
    keywords: ["ai", "machine learning", "llm", "agents", "tools", "research"],
    answer:
      "The AI Universe stores concepts, tools, LLM updates, AI agents, automation ideas, research papers, ethics, safety, and future AI notes.",
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function searchBrain(query: string): BrainMatch | null {
  const normalized = normalize(query);
  const words = new Set(normalized.split(" ").filter(Boolean));

  const ranked = brainEntries
    .map((entry) => {
      const keywordScore = entry.keywords.reduce((score, keyword) => {
        return normalized.includes(normalize(keyword)) ? score + 2 : score;
      }, 0);
      const titleScore = normalize(entry.title)
        .split(" ")
        .filter((word) => words.has(word)).length;
      const score = keywordScore + titleScore;

      return {
        entry,
        score,
        confidence: Math.min(96, 42 + score * 11),
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score < 2) {
    return null;
  }

  return {
    title: best.entry.title,
    source: best.entry.source,
    answer: best.entry.answer,
    confidence: best.confidence,
  };
}
