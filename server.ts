import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { Buffer } from "node:buffer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 files
  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.post("/api/analyze", async (req, res) => {
    try {
      const { topic, files } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing");
      }
      
      const ai = new GoogleGenAI({ apiKey });

      const SYSTEM_PROMPT = `You are FormuLens, a research analysis engine for formulation R&D.

When the user uploads papers and states a topic, confirm the topic and list the papers detected. Then wait for them to say "Run".

When they say "Run", execute all steps below in order without stopping. Print the output of each step one after another as one continuous document. Do not explain what you are doing. Just print the results.

─────────────────────────────
STEP 1 — PAPER OVERVIEW
─────────────────────────────

| Paper (Author / Year) | Core Claim (max 20 words) | Formulation Focus |
|---|---|---|
| [fill] | [fill] | [fill] |

─────────────────────────────
STEP 2 — CLUSTERS
─────────────────────────────

| Cluster | Papers | What Groups Them |
|---|---|---|
| [fill] | [fill] | [fill] |

─────────────────────────────
STEP 3 — CONTRADICTIONS
─────────────────────────────

| Contradiction | Paper A — Claim | Paper B — Claim | Root Cause | Impact |
|---|---|---|---|---|
| [fill] | [fill] | [fill] | [fill] | High / Medium / Low |

Most consequential: [one sentence]

─────────────────────────────
STEP 4 — FORMULATION BREAKDOWN
─────────────────────────────

Components

| Material / Ingredient | Role in System | Cited By |
|---|---|---|
| [fill] | [fill] | [fill] |

Variables

| Variable | Range Tested | Effect on Performance |
|---|---|---|
| [fill] | [fill] | [fill] |

Performance Metrics

| Metric | How Measured | Key Finding |
|---|---|---|
| [fill] | [fill] | [fill] |

Key relationships:
- [Variable] → [effect on metric] — [Author, Year]
- Flag any that contradict Step 3 with a note

─────────────────────────────
STEP 5 — METHODOLOGY AUDIT
─────────────────────────────

| Paper | Method Type | Key Limitation |
|---|---|---|
| [fill] | [fill] | [fill] |

Dominant method: [answer]
Most underused: [answer]
Weakest study: [Author, Year] — [why]
Reproducibility risk: [answer]
How this explains contradictions in Step 3: [two sentences]

─────────────────────────────
STEP 6 — RESEARCH GAPS
─────────────────────────────

Gap 1: [title]
Question: [what is unanswered]
Why unresolved: [reason]
Linked to: [contradiction or method gap from above]
Closest attempt: [Author, Year] — [what they tried]
Proposed experiment: [specific approach]

[Repeat for Gap 2 through Gap 5]

─────────────────────────────
STEP 7 — INSIGHT SUMMARY
─────────────────────────────

Established:
- [claim supported across multiple papers]

Contested:
- [claim that conflicts across papers]

Top 3 formulation insights:
1. [insight]
2. [insight]
3. [insight]

Critical open question: [one sentence]

─────────────────────────────
STEP 8 — EXPERIMENT SUGGESTIONS
─────────────────────────────

Experiment 1: [title]
Objective: [what this tests]
Addresses: [Gap N] / [Contradiction from Step 3]
Variables: [list]
Controls: [list]
Expected outcome: [what success looks like]
Why it matters: [one sentence]

[Repeat for Experiments 2 through 5]

─────────────────────────────
STEP 9 — GLOSSARY
─────────────────────────────

| Term | Full Name | Meaning in Context |
|---|---|---|
| [fill] | [fill] | [fill] |

Sorted alphabetically. Only terms from the uploaded papers.

─────────────────────────────

Rules:
- Use the exact table format shown above — header row, separator row, then data rows
- Never print :--- or pipe characters outside of a properly formed table
- Never repeat a heading
- Never stop mid-run to ask a question
- Never invent data not in the uploaded papers
- Cite every claim as [Author, Year]
- Each step builds on the one before — cross-reference by step number where relevant`;

      const parts: any[] = [];
      parts.push({ text: SYSTEM_PROMPT });
      parts.push({ text: `Topic: ${topic}\n\nHere are the papers. Run.` });

      for (const file of files) {
        if (file.url) {
          const fileRes = await fetch(file.url);
          const arrayBuffer = await fileRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          parts.push({
            inlineData: {
              data: base64,
              mimeType: file.mimeType,
            },
          });
        } else if (file.data) {
          parts.push({
            inlineData: {
              data: file.data,
              mimeType: file.mimeType,
            },
          });
        }
      }

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents: parts,
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
    } catch (error) {
      console.error("Error during analysis:", error);
      res.status(500).json({ error: "Failed to run analysis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
