import { db } from "./db";
import { jiraConnections, type JiraConnection } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  status: string;
  assignee: string | null;
  priority: string | null;
  project: string;
  url: string;
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
}

function mapIssueType(jiraType: string): string {
  const map: Record<string, string> = {
    "Epic": "epic",
    "Story": "story",
    "User Story": "story",
    "Feature": "feature",
    "Task": "task",
    "Sub-task": "task",
    "Subtask": "task",
    "Bug": "task",
    "Improvement": "feature",
    "New Feature": "feature",
  };
  return map[jiraType] || "story";
}

function extractDescription(description: any): string {
  if (!description) return "";
  if (typeof description === "string") return description;

  // Atlassian Document Format (ADF) → plain text
  if (description.type === "doc" && Array.isArray(description.content)) {
    return extractAdfText(description.content);
  }
  return "";
}

function extractAdfText(nodes: any[]): string {
  let text = "";
  for (const node of nodes) {
    if (node.type === "text") {
      text += node.text || "";
    } else if (node.type === "hardBreak" || node.type === "paragraph") {
      if (text && !text.endsWith("\n")) text += "\n";
      if (node.content) text += extractAdfText(node.content);
    } else if (node.content) {
      text += extractAdfText(node.content);
    }
  }
  return text;
}

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  private projectKey: string | null;
  private apiVersion: string;
  private jiraType: string;

  constructor(connection: JiraConnection) {
    this.baseUrl = connection.baseUrl.replace(/\/$/, "");
    this.jiraType = (connection as any).jiraType || "cloud";
    this.projectKey = connection.projectKey || null;

    if (this.jiraType === "datacenter") {
      // Data Center / Server: Bearer PAT auth, REST API v2
      this.authHeader = `Bearer ${connection.apiToken}`;
      this.apiVersion = "2";
    } else {
      // Cloud: Basic auth (email:apiToken), REST API v3
      this.authHeader = `Basic ${Buffer.from(`${connection.email}:${connection.apiToken}`).toString("base64")}`;
      this.apiVersion = "3";
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/rest/api/${this.apiVersion}${path}`;
    console.log(`[Jira] ${options.method || "GET"} ${url} type=${this.jiraType}`);
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": this.authHeader,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Jira] ${options.method || "GET"} ${url} → ${response.status}`, body.slice(0, 500));
      let detail = body;
      try { detail = JSON.parse(body)?.errorMessages?.join(", ") || JSON.parse(body)?.message || body; } catch {}

      if (response.status === 401) {
        if (this.jiraType === "datacenter") {
          throw new Error(
            "Authentication failed (401). For Jira Data Center: generate a Personal Access Token from your Jira profile " +
            "(Profile → Personal Access Tokens), NOT from id.atlassian.com. Paste only the token — no email needed."
          );
        }
        throw new Error(
          "Authentication failed (401). For Jira Cloud: check your email and API token. " +
          "The token must come from https://id.atlassian.com/manage-profile/security/api-tokens " +
          "(NOT from Jira settings). Make sure you copied the full token with no spaces."
        );
      }
      if (response.status === 403) {
        throw new Error(`Permission denied (403). Your account may not have access to this resource. ${detail}`);
      }
      if (response.status === 404) {
        throw new Error(
          `Resource not found (404). Check that your Base URL is correct (e.g. https://yourcompany.atlassian.net or https://jira.yourcompany.com). Detail: ${detail}`
        );
      }
      throw new Error(`Jira API error ${response.status}: ${detail}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; user: string; site: string }> {
    const data: any = await this.request("/myself");
    return {
      success: true,
      user: data.displayName || data.emailAddress,
      site: this.baseUrl,
    };
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const data: any = await this.request(
      `/issue/${issueKey}?fields=summary,description,issuetype,status,assignee,priority,project`
    );
    return {
      key: data.key,
      summary: data.fields.summary || "",
      description: extractDescription(data.fields.description),
      issueType: data.fields.issuetype?.name || "Story",
      status: data.fields.status?.name || "",
      assignee: data.fields.assignee?.displayName || null,
      priority: data.fields.priority?.name || null,
      project: data.fields.project?.key || "",
      url: `${this.baseUrl}/browse/${data.key}`,
    };
  }

  private get searchEndpoint(): string {
    // Atlassian Cloud REST API v3 deprecated /search in favour of /search/jql (CHANGE-2046)
    // Data Center API v2 still uses /search
    return this.apiVersion === "3" ? "/search/jql" : "/search";
  }

  async searchIssues(query: string, maxResults = 20): Promise<JiraSearchResult> {
    let jql = `text ~ "${query.replace(/"/g, '\\"')}" ORDER BY updated DESC`;
    if (this.projectKey) {
      jql = `project = "${this.projectKey}" AND ${jql}`;
    }
    const data: any = await this.request(
      `${this.searchEndpoint}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,description,issuetype,status,assignee,priority,project`
    );
    return {
      issues: (data.issues || []).map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary || "",
        description: extractDescription(issue.fields.description),
        issueType: issue.fields.issuetype?.name || "Story",
        status: issue.fields.status?.name || "",
        assignee: issue.fields.assignee?.displayName || null,
        priority: issue.fields.priority?.name || null,
        project: issue.fields.project?.key || "",
        url: `${this.baseUrl}/browse/${issue.key}`,
      })),
      total: data.total || 0,
    };
  }

  async getProjectIssues(maxResults = 50): Promise<JiraSearchResult> {
    const jql = this.projectKey
      ? `project = "${this.projectKey}" ORDER BY updated DESC`
      : `ORDER BY updated DESC`;
    const data: any = await this.request(
      `${this.searchEndpoint}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,description,issuetype,status,assignee,priority,project`
    );
    return {
      issues: (data.issues || []).map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary || "",
        description: extractDescription(issue.fields.description),
        issueType: issue.fields.issuetype?.name || "Story",
        status: issue.fields.status?.name || "",
        assignee: issue.fields.assignee?.displayName || null,
        priority: issue.fields.priority?.name || null,
        project: issue.fields.project?.key || "",
        url: `${this.baseUrl}/browse/${issue.key}`,
      })),
      total: data.total || 0,
    };
  }

  async addComment(issueKey: string, score: number, summary: string, categories: any[], improvedVersion?: string): Promise<void> {
    const scoreEmoji = score >= 75 ? "✅" : score >= 50 ? "⚠️" : "❌";
    const scoreLabel = score >= 75 ? "High Quality" : score >= 50 ? "Needs Improvement" : "Low Quality";

    if (this.jiraType === "datacenter") {
      // Data Center API v2: plain text / wiki markup comment
      const categoryLines = categories.map(c => {
        const icon = c.status === "pass" ? "✅" : c.status === "warning" ? "⚠️" : "❌";
        const lines = [`  ${icon} *${c.name}* — ${c.score}/100`];
        if (c.findings?.length) {
          lines.push("    Findings:");
          c.findings.forEach((f: string) => lines.push(`      - ${f}`));
        }
        if (c.suggestions?.length) {
          lines.push("    Suggestions:");
          c.suggestions.forEach((s: string) => lines.push(`      - ${s}`));
        }
        return lines.join("\n");
      }).join("\n\n");

      const sections = [
        `${scoreEmoji} Agile Quality Analysis — Score: ${score}/100 (${scoreLabel})`,
        "",
        summary,
        "",
        "━━━ Category Breakdown ━━━",
        categoryLines,
      ];

      if (improvedVersion) {
        const improvedStr = typeof improvedVersion === "string" ? improvedVersion : String(improvedVersion);
        sections.push("");
        sections.push("━━━ Improved Version ━━━");
        sections.push(improvedStr);
      }

      sections.push("");
      sections.push(`Analyzed by Agile Artifact Analyzer on ${new Date().toLocaleDateString()}`);

      await this.request(`/issue/${issueKey}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: sections.join("\n") }),
      });
      return;
    }

    // Cloud API v3: Atlassian Document Format (ADF)
    const categoryNodes: any[] = [];
    categories.forEach(c => {
      const statusIcon = c.status === "pass" ? "✅" : c.status === "warning" ? "⚠️" : "❌";
      // Category header row
      categoryNodes.push({
        type: "paragraph",
        content: [
          { type: "text", text: `${statusIcon} `, },
          { type: "text", text: `${c.name}`, marks: [{ type: "strong" }] },
          { type: "text", text: ` — ${c.score}/100` },
        ],
      });
      // Findings
      if (c.findings?.length) {
        categoryNodes.push({
          type: "paragraph",
          content: [{ type: "text", text: "Findings:", marks: [{ type: "em" }] }],
        });
        categoryNodes.push({
          type: "bulletList",
          content: c.findings.map((f: string) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: f }] }],
          })),
        });
      }
      // Suggestions
      if (c.suggestions?.length) {
        categoryNodes.push({
          type: "paragraph",
          content: [{ type: "text", text: "Suggestions:", marks: [{ type: "em" }] }],
        });
        categoryNodes.push({
          type: "bulletList",
          content: c.suggestions.map((s: string) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: s }] }],
          })),
        });
      }
      // Spacer between categories
      categoryNodes.push({ type: "rule" });
    });

    // Build improved version nodes if provided
    const improvedNodes: any[] = [];
    if (improvedVersion) {
      improvedNodes.push({
        type: "heading",
        attrs: { level: 4 },
        content: [{ type: "text", text: "Improved Version" }],
      });
      const improvedStr = typeof improvedVersion === "string" ? improvedVersion : String(improvedVersion);
      const paragraphs = improvedStr.split(/\n{2,}/);
      paragraphs.forEach(para => {
        const lines = para.split("\n");
        const content: any[] = [];
        lines.forEach((line, i) => {
          if (line) content.push({ type: "text", text: line });
          if (i < lines.length - 1 && line) content.push({ type: "hardBreak" });
        });
        if (content.length) {
          improvedNodes.push({ type: "paragraph", content });
        }
      });
    }

    const commentBody = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: `${scoreEmoji} Agile Quality Analysis — Score: ${score}/100 (${scoreLabel})` }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: summary }],
        },
        {
          type: "heading",
          attrs: { level: 4 },
          content: [{ type: "text", text: "Category Breakdown" }],
        },
        ...categoryNodes,
        ...improvedNodes,
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Analyzed by " },
            { type: "text", text: "Agile Artifact Analyzer", marks: [{ type: "strong" }] },
            { type: "text", text: ` on ${new Date().toLocaleDateString()}` },
          ],
        },
      ],
    };

    await this.request(`/issue/${issueKey}/comment`, {
      method: "POST",
      body: JSON.stringify({ body: commentBody }),
    });
  }

  async updateIssue(issueKey: string, fields: { summary?: string; description?: string }): Promise<void> {
    const updateFields: any = {};
    if (fields.summary !== undefined) {
      updateFields.summary = fields.summary;
    }
    if (fields.description !== undefined) {
      if (this.jiraType === "datacenter") {
        // Data Center / Server API v2: plain text
        updateFields.description = fields.description;
      } else {
        // Cloud API v3: Atlassian Document Format (ADF)
        // Split on double newlines for paragraphs, single newlines for hard breaks
        const descStr = typeof fields.description === "string" ? fields.description : String(fields.description);
        const paragraphs = descStr.split(/\n{2,}/);
        updateFields.description = {
          type: "doc",
          version: 1,
          content: paragraphs.map(para => {
            const lines = para.split("\n");
            const content: any[] = [];
            lines.forEach((line, i) => {
              if (line) content.push({ type: "text", text: line });
              if (i < lines.length - 1 && line) content.push({ type: "hardBreak" });
            });
            return { type: "paragraph", content: content.length ? content : [] };
          }).filter(p => p.content.length > 0),
        };
      }
    }
    await this.request(`/issue/${issueKey}`, {
      method: "PUT",
      body: JSON.stringify({ fields: updateFields }),
    });
  }

  async updateIssueLabel(issueKey: string, score: number): Promise<void> {
    const label = score >= 75 ? "quality-high" : score >= 50 ? "quality-medium" : "quality-low";
    const issue: any = await this.request(`/issue/${issueKey}?fields=labels`);
    const existingLabels: string[] = issue.fields.labels || [];
    const cleanedLabels = existingLabels.filter((l: string) => !l.startsWith("quality-"));
    await this.request(`/issue/${issueKey}`, {
      method: "PUT",
      body: JSON.stringify({
        fields: { labels: [...cleanedLabels, label] },
      }),
    });
  }
}

export async function getJiraClient(userId: number): Promise<JiraClient | null> {
  const [conn] = await db.select().from(jiraConnections).where(eq(jiraConnections.userId, userId));
  if (!conn) return null;
  return new JiraClient(conn);
}

export async function saveJiraConnection(
  userId: number,
  baseUrl: string,
  email: string,
  apiToken: string,
  projectKey?: string,
  jiraType?: string
): Promise<void> {
  const type = jiraType || "cloud";
  const existing = await db.select().from(jiraConnections).where(eq(jiraConnections.userId, userId));
  if (existing.length > 0) {
    await db.update(jiraConnections)
      .set({ baseUrl, email, apiToken, projectKey: projectKey || null, jiraType: type })
      .where(eq(jiraConnections.userId, userId));
  } else {
    await db.insert(jiraConnections).values({ userId, baseUrl, email, apiToken, projectKey: projectKey || null, jiraType: type });
  }
}

export async function deleteJiraConnection(userId: number): Promise<void> {
  await db.delete(jiraConnections).where(eq(jiraConnections.userId, userId));
}

export async function getJiraConnection(userId: number): Promise<JiraConnection | null> {
  const [conn] = await db.select().from(jiraConnections).where(eq(jiraConnections.userId, userId));
  return conn || null;
}
