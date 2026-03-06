import type { Express, RequestHandler } from "express";
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
    epic: `You are evaluating an EPIC. Apply the following agile methodology guardrails strictly.

=== AGILE HIERARCHY GUARDRAIL ===
An Epic sits at the top of the agile hierarchy: Epic -> Feature -> User Story -> Task.
An Epic represents a large body of work that delivers significant business value, typically spanning multiple sprints or even Program Increments (PIs). It MUST be decomposable downward into Features, which further decompose into User Stories.

=== MANDATORY EPIC ELEMENTS (Scrum/SAFe) ===
1. BUSINESS HYPOTHESIS / OBJECTIVE: A clear statement of the business problem being solved and expected outcome. Must tie to portfolio or program-level OKRs/strategic themes.
2. SCOPE DEFINITION: Explicit "In Scope" and "Out of Scope" boundaries. Without this, scope creep is inevitable.
3. MEASURABLE SUCCESS CRITERIA / KPIs: Quantifiable metrics (revenue impact, cost reduction, adoption rate, NPS delta) that define when the Epic is "done" at the business level.
4. STAKEHOLDER & CUSTOMER IDENTIFICATION: Who are the end users, internal stakeholders, and business owners? Unclear ownership leads to misaligned delivery.
5. HIGH-LEVEL ACCEPTANCE CRITERIA: Business-level conditions of satisfaction (not technical implementation details).
6. FEATURE DECOMPOSITION READINESS: Can this Epic be reasonably broken into 3-8 Features? If not, it may be too narrow (should be a Feature) or too broad (should be a strategic theme).
7. DEPENDENCY & RISK MAPPING: Cross-team, cross-system, or external vendor dependencies identified. Major risks and mitigation strategies outlined.
8. TIMEFRAME & SIZING: Rough T-shirt sizing (S/M/L/XL) or PI-level timeline. Epics without any sizing signal cannot be prioritized against other Epics.
9. LEAN BUSINESS CASE (SAFe): If following SAFe, a Lean Business Case with solution alternatives, cost/benefit, and sequencing constraints should be present.

=== ANTI-PATTERNS TO FLAG ===
- Epic written as a single user story ("As a user, I want...")
- No business justification or ROI rationale
- Implementation details instead of business outcomes
- Missing "Definition of Done" at the Epic level
- No mention of how success will be measured post-delivery
- Scope so large it cannot be delivered in 2-3 PIs / 6 months`,

    feature: `You are evaluating a FEATURE. Apply the following agile methodology guardrails strictly.

=== AGILE HIERARCHY GUARDRAIL ===
A Feature sits between Epic and User Story in the hierarchy: Epic -> Feature -> User Story -> Task.
A Feature represents a distinct, user-facing capability or service that delivers measurable value. It typically spans 1-3 sprints and MUST decompose into multiple User Stories. A Feature should be small enough to fit within a single Program Increment (PI) in SAFe.

=== MANDATORY FEATURE ELEMENTS (Scrum/SAFe) ===
1. BENEFIT HYPOTHESIS: A clear statement of the expected benefit. Format: "If we deliver [this capability], then [these users] will be able to [achieve this outcome], resulting in [this measurable benefit]."
2. PARENT EPIC / STRATEGIC ALIGNMENT: Every Feature must trace to a parent Epic or strategic objective. Orphan features signal lack of strategic alignment.
3. FEATURE DESCRIPTION: A concise description of the functional capability being delivered, written from the user's perspective (not implementation details).
4. ACCEPTANCE CRITERIA: Business-level conditions that must be true for the Feature to be accepted. Should be verifiable by Product Owner or business stakeholders.
5. USER STORY DECOMPOSITION READINESS: Can this Feature be broken into 3-10 User Stories? If fewer, it may be a single story. If more, it may be an Epic in disguise.
6. NON-FUNCTIONAL REQUIREMENTS (NFRs): Performance, scalability, security, accessibility, compliance, and operational requirements explicitly called out.
7. DEPENDENCIES & ENABLERS: Other features, teams, APIs, infrastructure, or architectural enablers required. Distinguish "blocked by" vs. "nice to have."
8. DEFINITION OF DONE: Feature-level DoD beyond individual story completion (e.g., integration tested, UAT passed, documentation updated, monitoring in place).

=== ANTI-PATTERNS TO FLAG ===
- Feature that is really a single user story (too granular)
- Feature that is actually an Epic (too broad, spans multiple PIs)
- No clear user or business benefit stated
- Only technical implementation details, no user-facing description
- Missing acceptance criteria or criteria that are purely technical
- No parent Epic or strategic connection
- NFRs completely absent (performance, security, accessibility)`,

    story: `You are evaluating a USER STORY. Apply the following agile methodology guardrails strictly.

=== AGILE HIERARCHY GUARDRAIL ===
A User Story sits between Feature and Task in the hierarchy: Epic -> Feature -> User Story -> Task.
A User Story is a small, valuable increment of functionality described from the end-user's perspective. It must be completable within a single sprint (typically 1-8 story points). It decomposes into Tasks for the development team.

=== INVEST CRITERIA (MANDATORY) ===
Each User Story MUST be evaluated against ALL six INVEST criteria:
1. INDEPENDENT: Can this story be developed, tested, and delivered without depending on another story being completed first? Stories with hard dependencies reduce planning flexibility.
2. NEGOTIABLE: Is this a conversation starter, not a rigid contract? The story should express intent and value while leaving implementation details open for discussion between the team and Product Owner.
3. VALUABLE: Does the story deliver demonstrable value to an end user or customer? Technical tasks, refactoring, or infrastructure work disguised as stories violate this principle.
4. ESTIMABLE: Does the team have enough information to estimate this story? Unclear scope, missing acceptance criteria, or unknown technical approach make estimation impossible.
5. SMALL: Can this story be completed within a single sprint? Stories larger than 8 points (or half a sprint's capacity) should be split. Stories under 1 point may be too granular (should be tasks).
6. TESTABLE: Are there clear, specific acceptance criteria that allow a tester to verify the story is done? Vague criteria like "works well" or "is user-friendly" are not testable.

=== MANDATORY STORY ELEMENTS ===
1. STORY FORMAT: Must follow "As a [specific role/persona], I want [concrete goal/action], so that [measurable benefit/value]." Each part must be specific, not generic.
2. ACCEPTANCE CRITERIA: Written in Given/When/Then (Gherkin) format or numbered conditions. Each criterion must be:
   - Specific: No ambiguous words ("appropriate," "user-friendly," "fast")
   - Measurable: Quantified where possible (response time < 2s, error rate < 1%)
   - Complete: Covers happy path, error paths, edge cases, and boundary conditions
3. DEFINITION OF DONE: Either referenced (team-level DoD) or story-specific DoD items listed
4. PARENT FEATURE / CONTEXT: Story should trace to a parent Feature for traceability
5. UI/UX REQUIREMENTS: Where applicable, wireframes, interaction patterns, or design references

=== ANTI-PATTERNS TO FLAG ===
- Story is actually a task ("Implement the API endpoint for...")
- Story is actually a feature/epic (too large for one sprint)
- "As a developer..." stories (technical tasks disguised as stories)
- Missing or vague acceptance criteria ("it should work properly")
- No error/edge case handling in acceptance criteria
- Compound story (multiple independent pieces of value bundled together)
- Solution-prescriptive language instead of outcome-focused
- No clear "so that" benefit, or benefit is circular ("so that I can do the thing")`,

    task: `You are evaluating a TASK. Apply the following agile methodology guardrails strictly.

=== AGILE HIERARCHY GUARDRAIL ===
A Task sits at the bottom of the agile hierarchy: Epic -> Feature -> User Story -> Task.
A Task is a specific, technical piece of work that a single team member can complete, typically in hours (not days). Tasks are implementation-level work items that collectively fulfill a User Story. They are assigned to individuals and tracked during the sprint.

=== MANDATORY TASK ELEMENTS ===
1. PARENT STORY LINKAGE: Every task MUST trace back to a parent User Story. Orphan tasks indicate work that may not deliver user value or was not properly planned.
2. CLEAR DESCRIPTION: A specific, unambiguous description of exactly what work needs to be done. Should answer: What action? On what component/system? To achieve what technical outcome?
3. ACTIONABILITY: The task must describe a concrete action a developer can start immediately. Vague tasks like "investigate options" should be timeboxed spikes, not open-ended tasks.
4. EFFORT ESTIMATION: Estimated in hours (ideally 1-8 hours). Tasks > 16 hours should be split. Tasks < 30 minutes may be too granular and add overhead.
5. ASSIGNABILITY: The task should be scoped so that a single person can own and complete it. Tasks requiring multiple people indicate they should be split.
6. COMPLETION CRITERIA: Clear, binary definition of what "done" looks like for this task. Developer and reviewer must be able to agree on whether the task is complete.
7. DEPENDENCIES: Other tasks, stories, or external dependencies that must be completed before or alongside this task. Include blockers and their owners.
8. TECHNICAL APPROACH: Brief outline of the implementation approach, technologies, or patterns to be used. This reduces ambiguity during execution.

=== TASK TYPES TO RECOGNIZE ===
- Development tasks: Code implementation, API creation, UI development
- Testing tasks: Unit tests, integration tests, test data setup
- DevOps tasks: CI/CD pipeline, deployment configuration, monitoring setup
- Documentation tasks: API docs, runbooks, architecture decision records
- Spike/Research tasks: Timeboxed investigation (should have explicit timebox and expected output)

=== ANTI-PATTERNS TO FLAG ===
- Task is actually a user story (delivers user-facing value independently)
- No parent story linkage
- Task too large (> 2 days of work)
- Vague description ("fix the bug," "update the code")
- No completion criteria
- Research/spike without a timebox or expected deliverable
- Multiple unrelated activities bundled into one task`,
  };

  const guidelines = typeGuidelines[type] || typeGuidelines.story;

  return `You are a senior Agile Coach, Certified Scrum Professional, and SAFe Program Consultant. Your role is to rigorously evaluate agile artifacts against industry-standard methodologies (Scrum, SAFe, Kanban) and established best practices.

${guidelines}

=== OUTPUT FORMAT ===
Return your analysis as a valid JSON object with exactly this structure:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence executive summary of the artifact's quality, citing the most critical strengths and weaknesses>",
  "categories": [
    {
      "name": "<category name>",
      "score": <number 0-100>,
      "status": "<pass|warning|fail>",
      "findings": ["<specific finding citing the exact text or absence that led to this score>"],
      "suggestions": ["<actionable, specific suggestion with an example of what good looks like>"]
    }
  ],
  "improvedVersion": "<completely rewritten version of the ${type} that addresses all findings and follows all guardrails above>"
}

=== SCORING RUBRIC ===
- 90-100 "pass": Exemplary. Meets all mandatory elements, no anti-patterns, ready for sprint planning.
- 80-89 "pass": Strong. Meets most mandatory elements with minor gaps that don't block execution.
- 65-79 "warning": Needs improvement. Missing important elements or contains anti-patterns that could cause problems.
- 50-64 "warning": Significant issues. Multiple mandatory elements missing or major anti-patterns present.
- 0-49 "fail": Not ready. Fundamental problems that must be resolved before the artifact can be used.

Be rigorous. Do NOT inflate scores. A ${type} missing mandatory elements should not score above 70 regardless of what it does well.

=== CATEGORIES TO EVALUATE ===
${type === 'epic' ? '1. Business Value & Strategic Alignment (Lean Business Case, OKR linkage)\n2. Scope & Boundaries (In/Out of scope clarity)\n3. Success Criteria & KPIs (Measurable outcomes)\n4. Feature Decomposition Readiness (Can it be broken into 3-8 Features?)\n5. Risk, Dependencies & Sizing (Cross-team risks, T-shirt sizing)' : ''}
${type === 'feature' ? '1. Benefit Hypothesis & User Value (Clear capability with measurable benefit)\n2. Strategic Alignment (Parent Epic linkage, portfolio traceability)\n3. Acceptance Criteria & Definition of Done (Business-level verifiable conditions)\n4. Story Decomposition Readiness (Can it be broken into 3-10 Stories?)\n5. Non-Functional Requirements & Dependencies (NFRs, enablers, blockers)' : ''}
${type === 'story' ? '1. Story Format & Structure (As a / I want / So that)\n2. INVEST: Independence & Negotiability (No hard dependencies, conversation-ready)\n3. INVEST: Value & Estimability (End-user value, team can estimate)\n4. INVEST: Small & Sized (Fits in one sprint, properly pointed)\n5. Testability & Acceptance Criteria (Given/When/Then, edge cases, DoD)' : ''}
${type === 'task' ? '1. Clarity & Technical Specification (Unambiguous, specific action)\n2. Parent Story Linkage & Context (Traceability to user value)\n3. Effort Estimation & Sizing (Hours-based, 1-16h range)\n4. Completion Criteria (Binary done/not-done definition)\n5. Dependencies & Technical Approach (Blockers identified, approach outlined)' : ''}

=== IMPROVED VERSION REQUIREMENTS ===
The improved version MUST:
- Fix every issue identified in the findings
- Follow all mandatory elements listed above
- Include all missing sections
- Remove all anti-patterns
- Be production-ready and immediately usable by a Scrum team

Here is the ${type.toUpperCase()} to analyze:

${content}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  requireAuth: RequestHandler
): Promise<Server> {

  app.get("/api/analyses", requireAuth, async (_req, res) => {
    try {
      const results = await storage.getAnalyses();
      res.json(results);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  });

  app.get("/api/analyses/:id", requireAuth, async (req, res) => {
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

  app.post("/api/analyses", requireAuth, async (req, res) => {
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
            { role: "system", content: "You are a senior Agile Coach (CSP, SAFe SPC) who rigorously evaluates agile artifacts against Scrum, SAFe, and industry-standard methodologies. You never inflate scores. You always respond with valid JSON only, no markdown formatting." },
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

  app.delete("/api/analyses/:id", requireAuth, async (req, res) => {
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
