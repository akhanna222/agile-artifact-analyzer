import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAnalysisSchema, analysisResultSchema, type AnalysisResult } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getAnalysisPrompt(type: string, content: string): string {
  const typeGuidelines: Record<string, string> = {
    epic: `Evaluate this EPIC against best practices:
- Clear business objective and strategic alignment
- Well-defined scope and boundaries
- Measurable success criteria / KPIs
- Stakeholder identification
- High-level acceptance criteria
- Reasonable timeframe (typically spanning multiple sprints)
- Decomposable into features/stories
- Dependencies identified
- Risk assessment included`,
    feature: `Evaluate this FEATURE against best practices:
- Clear description of the capability being delivered
- Linked to a parent epic or strategic goal
- User-facing value clearly articulated
- Acceptance criteria defined
- Decomposable into user stories
- Non-functional requirements addressed (performance, security, accessibility)
- Dependencies and prerequisites identified
- Testability considerations`,
    story: `Evaluate this USER STORY against INVEST criteria and best practices:
- Independent: Can be developed independently of other stories
- Negotiable: Not an explicit contract, leaves room for discussion
- Valuable: Delivers value to the end user or customer
- Estimable: Can be estimated with reasonable accuracy
- Small: Small enough to be completed in a single sprint
- Testable: Has clear acceptance criteria that can be tested
Additional checks:
- Follows "As a [role], I want [goal], so that [benefit]" format
- Acceptance criteria are specific, measurable, and complete
- Definition of Done is clear
- Edge cases and error scenarios considered
- UI/UX requirements specified where relevant`,
    task: `Evaluate this TASK against best practices:
- Clear and specific description of work to be done
- Linked to a parent story
- Actionable and concrete (implementation-level detail)
- Estimated effort (in hours or story points)
- Assignable to a single person
- Has clear completion criteria
- Dependencies on other tasks identified
- Technical approach outlined where appropriate`,
  };

  const guidelines = typeGuidelines[type] || typeGuidelines.story;

  return `You are an expert Agile coach and requirements analyst. Analyze the following ${type.toUpperCase()} for quality and completeness.

${guidelines}

IMPORTANT: Return your analysis as a valid JSON object with exactly this structure:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence summary of the overall quality>",
  "categories": [
    {
      "name": "<category name>",
      "score": <number 0-100>,
      "status": "<pass|warning|fail>",
      "findings": ["<specific finding 1>", "<specific finding 2>"],
      "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>"]
    }
  ],
  "improvedVersion": "<rewritten improved version of the ${type}>"
}

Category scoring guidelines:
- 80-100: "pass" - Meets or exceeds best practices
- 50-79: "warning" - Partially meets best practices, needs improvement
- 0-49: "fail" - Does not meet best practices, significant issues

For a ${type}, evaluate these specific categories:
${type === 'epic' ? '1. Business Value & Strategic Alignment\n2. Scope & Boundaries\n3. Success Criteria & KPIs\n4. Decomposability\n5. Risk & Dependencies' : ''}
${type === 'feature' ? '1. Capability Description\n2. User Value\n3. Acceptance Criteria\n4. Decomposability\n5. Non-Functional Requirements' : ''}
${type === 'story' ? '1. Format & Structure\n2. Independence\n3. Value Proposition\n4. Estimability & Size\n5. Testability & Acceptance Criteria' : ''}
${type === 'task' ? '1. Clarity & Specificity\n2. Actionability\n3. Estimation\n4. Completion Criteria\n5. Dependencies' : ''}

Here is the ${type.toUpperCase()} to analyze:

${content}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/analyses", async (_req, res) => {
    try {
      const results = await storage.getAnalyses();
      res.json(results);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  app.post("/api/analyses", async (req, res) => {
    try {
      const parsed = insertAnalysisSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }

      const analysis = await storage.createAnalysis(parsed.data);

      try {
        const prompt = getAnalysisPrompt(analysis.type, analysis.content);

        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            { role: "system", content: "You are an expert Agile requirements analyst. Always respond with valid JSON only, no markdown formatting." },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 8192,
          response_format: { type: "json_object" },
        });

        const resultText = response.choices[0]?.message?.content || "{}";
        let parsedResult;
        try {
          parsedResult = JSON.parse(resultText);
        } catch {
          throw new Error("Failed to parse AI response as JSON");
        }

        const validated = analysisResultSchema.safeParse(parsedResult);
        const results: AnalysisResult = validated.success
          ? validated.data
          : {
              overallScore: parsedResult.overallScore ?? 0,
              summary: parsedResult.summary ?? "Analysis completed with partial results.",
              categories: Array.isArray(parsedResult.categories)
                ? parsedResult.categories.map((c: any) => ({
                    name: c.name ?? "Unknown",
                    score: typeof c.score === "number" ? c.score : 0,
                    status: ["pass", "warning", "fail"].includes(c.status) ? c.status : "warning",
                    findings: Array.isArray(c.findings) ? c.findings : [],
                    suggestions: Array.isArray(c.suggestions) ? c.suggestions : [],
                  }))
                : [],
              improvedVersion: parsedResult.improvedVersion,
            };

        const updated = await storage.updateAnalysisResults(
          analysis.id,
          results.overallScore,
          results,
          "completed"
        );

        res.json(updated);
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
        await storage.updateAnalysisResults(analysis.id, 0, {
          overallScore: 0,
          summary: "Analysis failed due to an error processing the request.",
          categories: [],
        }, "failed");
        res.status(500).json({ error: "AI analysis failed" });
      }
    } catch (error) {
      console.error("Error creating analysis:", error);
      res.status(500).json({ error: "Failed to create analysis" });
    }
  });

  app.delete("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAnalysis(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting analysis:", error);
      res.status(500).json({ error: "Failed to delete analysis" });
    }
  });

  return httpServer;
}
