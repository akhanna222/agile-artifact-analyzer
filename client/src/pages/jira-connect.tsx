import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Link2, CheckCircle, XCircle, Search, Download,
  ExternalLink, RefreshCw, Unplug, LogOut, Loader2,
  AlertTriangle, FileText, Tag, User, ChevronDown, ChevronUp,
  Pencil, Save, X, Send, BookOpen,
} from "lucide-react";

interface AuthUser { id: number; email: string; isAdmin: boolean; }
interface JiraStatus { connected: boolean; baseUrl?: string; email?: string; projectKey?: string; }
interface JiraIssue {
  key: string; summary: string; description: string; issueType: string;
  status: string; assignee: string | null; priority: string | null;
  project: string; url: string;
}

const ISSUE_TYPE_MAP: Record<string, string> = {
  "Epic": "epic", "Story": "story", "User Story": "story",
  "Feature": "feature", "Task": "task", "Sub-task": "task",
  "Subtask": "task", "Bug": "task",
};

const typeColor: Record<string, string> = {
  epic: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  feature: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  story: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  task: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

function IssueCard({
  issue,
  onImport,
}: {
  issue: JiraIssue;
  onImport: (i: JiraIssue) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSummary, setEditSummary] = useState(issue.summary);
  const [editDescription, setEditDescription] = useState(issue.description);
  const mappedType = ISSUE_TYPE_MAP[issue.issueType] || "story";

  const updateMutation = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", `/api/jira/issue/${issue.key}`, {
        summary: editSummary,
        description: editDescription,
      }),
    onSuccess: () => {
      toast({
        title: "Saved to Jira",
        description: `${issue.key} has been updated successfully.`,
      });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/jira/issues"] });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Could not update the Jira issue.",
        variant: "destructive",
      });
    },
  });

  const handleCancelEdit = () => {
    setEditSummary(issue.summary);
    setEditDescription(issue.description);
    setEditMode(false);
  };

  return (
    <div
      className="border rounded-lg overflow-hidden transition-all bg-white dark:bg-gray-900"
      data-testid={`issue-card-${issue.key}`}
    >
      {/* Card Header Row */}
      <div
        className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={() => { setExpanded(e => !e); setEditMode(false); }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono font-bold text-gray-500">{issue.key}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[mappedType] || typeColor.story}`}>
              {issue.issueType}
            </span>
            {issue.status && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {issue.status}
              </span>
            )}
            {issue.priority && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Tag className="w-3 h-3" /> {issue.priority}
              </span>
            )}
            {issue.assignee && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <User className="w-3 h-3" /> {issue.assignee}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate pr-2">{issue.summary}</p>
          {!expanded && issue.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {issue.description.slice(0, 100)}{issue.description.length > 100 ? "…" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Panel */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">

          {editMode ? (
            /* ── EDIT MODE ── */
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Summary</Label>
                <Input
                  value={editSummary}
                  onChange={e => setEditSummary(e.target.value)}
                  className="text-sm"
                  data-testid={`input-edit-summary-${issue.key}`}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={6}
                  className="text-sm font-mono resize-none"
                  placeholder="No description yet…"
                  data-testid={`textarea-edit-description-${issue.key}`}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || !editSummary.trim()}
                  className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
                  data-testid={`btn-save-jira-${issue.key}`}
                >
                  {updateMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</>
                    : <><Save className="w-3.5 h-3.5 mr-1.5" /> Save to Jira</>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                  data-testid={`btn-cancel-edit-${issue.key}`}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* ── READ MODE ── */
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
                {issue.description ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-gray-900 rounded-md p-3 border">
                    {issue.description}
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400 p-3 bg-white dark:bg-gray-900 rounded-md border">
                    No description provided in Jira.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Button
                  size="sm"
                  onClick={() => onImport(issue)}
                  className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
                  data-testid={`btn-analyze-${issue.key}`}
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Analyze Quality
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={e => { e.stopPropagation(); setEditMode(true); }}
                  data-testid={`btn-edit-${issue.key}`}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Story
                </Button>
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  data-testid={`btn-open-jira-${issue.key}`}
                >
                  <Button size="sm" variant="ghost" className="text-gray-500">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open in Jira
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueList({ issues, onImport }: { issues: JiraIssue[]; onImport: (i: JiraIssue) => void }) {
  return (
    <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
      {issues.map(issue => (
        <IssueCard key={issue.key} issue={issue} onImport={onImport} />
      ))}
    </div>
  );
}

export default function JiraConnect() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [baseUrl, setBaseUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<JiraIssue[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("connect");
  const [authError, setAuthError] = useState(false);

  const { data: user } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/me"] });

  const { data: jiraStatus, isLoading: statusLoading } = useQuery<JiraStatus>({
    queryKey: ["/api/jira/status"],
  });

  // Auto-switch to Browse tab when already connected
  useEffect(() => {
    if (jiraStatus?.connected && activeTab === "connect") {
      setActiveTab("browse");
    }
  }, [jiraStatus?.connected]);

  const { data: projectIssues, isLoading: issuesLoading, refetch: refetchIssues } = useQuery<{ issues: JiraIssue[]; total: number }>({
    queryKey: ["/api/jira/issues"],
    enabled: jiraStatus?.connected === true,
  });

  const connectMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/jira/connect", { baseUrl, email, apiToken, projectKey }),
    onSuccess: (data: any) => {
      setAuthError(false);
      queryClient.invalidateQueries({ queryKey: ["/api/jira/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jira/issues"] });
      toast({ title: "Connected to Jira", description: `Logged in as ${data.user}` });
      setActiveTab("browse");
    },
    onError: (err: any) => {
      const is401 = err.message?.includes("401") || err.message?.includes("Authentication failed");
      setAuthError(is401);
      toast({
        title: "Connection Failed",
        description: is401
          ? "Authentication failed — see troubleshooting tips below."
          : (err.message || "Check your credentials."),
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", "/api/jira/connect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jira/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jira/issues"] });
      setSearchResults([]);
      setActiveTab("connect");
      toast({ title: "Disconnected from Jira" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/jira/search?q=${encodeURIComponent(searchQuery)}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data.issues || []);
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = (issue: JiraIssue) => {
    const mappedType = ISSUE_TYPE_MAP[issue.issueType] || "story";
    const content = [issue.summary, issue.description ? `\n\n${issue.description}` : ""].join("").trim();
    const params = encodeURIComponent(JSON.stringify({
      title: `[${issue.key}] ${issue.summary}`,
      type: mappedType,
      content,
      jiraKey: issue.key,
      jiraUrl: issue.url,
    }));
    setLocation(`/?import=${params}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-[hsl(0,0%,15%)] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}
            className="text-white hover:bg-white/10" data-testid="btn-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[hsl(22,100%,50%)] flex items-center justify-center font-bold text-sm">J</div>
            <span className="font-semibold text-lg">Jira Stories</span>
            {jiraStatus?.connected && (
              <Badge className="bg-green-600/20 text-green-400 border-green-700 text-xs ml-1">Connected</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()} className="text-white hover:bg-white/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Connection Status Banner */}
        {!statusLoading && jiraStatus?.connected && (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-green-800 rounded-lg p-3 px-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-green-800 dark:text-green-300">Connected to Jira</p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  {jiraStatus.baseUrl} · {jiraStatus.email}
                  {jiraStatus.projectKey && ` · Project: ${jiraStatus.projectKey}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("connect")}
                className="text-gray-600 dark:text-gray-400 text-xs">
                Reconfigure
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                data-testid="btn-disconnect">
                <Unplug className="w-3.5 h-3.5 mr-1" /> Disconnect
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-jira">
            <TabsTrigger value="connect" data-testid="tab-connect">
              <Link2 className="w-4 h-4 mr-1" /> Connect
            </TabsTrigger>
            <TabsTrigger value="browse" disabled={!jiraStatus?.connected} data-testid="tab-browse">
              <FileText className="w-4 h-4 mr-1" /> Browse Stories
              {projectIssues?.total != null && (
                <span className="ml-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full px-1.5 py-0.5 font-mono">
                  {projectIssues.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" disabled={!jiraStatus?.connected} data-testid="tab-search">
              <Search className="w-4 h-4 mr-1" /> Search
            </TabsTrigger>
          </TabsList>

          {/* ── CONNECT TAB ── */}
          <TabsContent value="connect">
            <Card>
              <CardHeader>
                <CardTitle>Connect your Jira account</CardTitle>
                <CardDescription>
                  Read stories, edit them, and write analysis results back — all without leaving this app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg p-4 text-sm space-y-1">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">How to get your API token:</p>
                  <ol className="list-decimal list-inside text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="underline font-medium">id.atlassian.com → Security → API tokens</a></li>
                    <li>Click <strong>"Create API token"</strong>, give it a label</li>
                    <li>Copy the generated token and paste it below</li>
                  </ol>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="jira-url">Jira Base URL <span className="text-red-500">*</span></Label>
                    <Input id="jira-url" placeholder="https://yourcompany.atlassian.net"
                      value={baseUrl} onChange={e => setBaseUrl(e.target.value)} data-testid="input-jira-url" />
                    <p className="text-xs text-gray-400 mt-1">Your Atlassian cloud instance URL — no trailing slash</p>
                  </div>
                  <div>
                    <Label htmlFor="jira-email">Atlassian Account Email <span className="text-red-500">*</span></Label>
                    <Input id="jira-email" type="email" placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)} data-testid="input-jira-email" />
                  </div>
                  <div>
                    <Label htmlFor="jira-token">API Token <span className="text-red-500">*</span></Label>
                    <Input id="jira-token" type="password" placeholder="Paste your Jira API token here"
                      value={apiToken} onChange={e => setApiToken(e.target.value)} data-testid="input-jira-token" />
                  </div>
                  <div>
                    <Label htmlFor="jira-project">
                      Project Key <span className="text-gray-400 text-xs font-normal">(optional — filters browse/search to one project)</span>
                    </Label>
                    <Input id="jira-project" placeholder="e.g. PROJ, AAA, SCRUM"
                      value={projectKey} onChange={e => setProjectKey(e.target.value)} data-testid="input-jira-project" />
                  </div>
                </div>

                {authError && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg p-4 text-sm space-y-2">
                    <p className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Authentication Failed — Common Fixes:
                    </p>
                    <ul className="text-red-700 dark:text-red-400 space-y-1 text-xs list-disc list-inside">
                      <li><strong>Wrong API token source:</strong> Must come from <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="underline">id.atlassian.com → Security → API tokens</a> — NOT from Jira's profile settings.</li>
                      <li><strong>Wrong email:</strong> Use the email you log into Atlassian with.</li>
                      <li><strong>Wrong base URL:</strong> Must be exactly <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">https://yourcompany.atlassian.net</code>.</li>
                      <li><strong>Token copied incorrectly:</strong> Regenerate the token and paste it fresh.</li>
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !baseUrl || !email || !apiToken}
                  className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
                  data-testid="btn-connect-jira">
                  {connectMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
                    : <><Link2 className="w-4 h-4 mr-2" /> Connect to Jira</>}
                </Button>

                <Separator />
                <p className="text-xs font-semibold text-gray-500">What you can do once connected:</p>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                  <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
                    <span><strong className="text-gray-700 dark:text-gray-300">Read</strong> — Browse and search all stories from your Jira project</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Download className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                    <span><strong className="text-gray-700 dark:text-gray-300">Analyze</strong> — Import any story directly into the AI quality analyzer</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Pencil className="w-3.5 h-3.5 mt-0.5 text-orange-500 shrink-0" />
                    <span><strong className="text-gray-700 dark:text-gray-300">Edit</strong> — Update the story summary and description inline</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Send className="w-3.5 h-3.5 mt-0.5 text-purple-500 shrink-0" />
                    <span><strong className="text-gray-700 dark:text-gray-300">Write Back</strong> — Post analysis results as a Jira comment with quality labels</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BROWSE TAB ── */}
          <TabsContent value="browse">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle>Jira Stories</CardTitle>
                  <CardDescription className="mt-1">
                    {issuesLoading
                      ? "Loading stories from Jira…"
                      : projectIssues
                        ? `${projectIssues.total} issue${projectIssues.total !== 1 ? "s" : ""}${jiraStatus?.projectKey ? ` in project ${jiraStatus.projectKey}` : " across all projects"} — click any story to expand`
                        : ""}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchIssues()} disabled={issuesLoading} data-testid="btn-refresh-issues">
                  <RefreshCw className={`w-4 h-4 mr-1 ${issuesLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading stories from Jira…
                  </div>
                ) : !projectIssues?.issues?.length ? (
                  <div className="text-center py-16 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No stories found</p>
                    <p className="text-xs mt-1">Add a project key in the Connect tab to filter by project, or use Search to find specific issues.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" /> Click a story to read its full content, edit it, or analyze its quality
                    </div>
                    <IssueList issues={projectIssues.issues} onImport={handleImport} />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SEARCH TAB ── */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Search Stories</CardTitle>
                <CardDescription>Search by keyword across summaries and descriptions. Press Enter to search.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder='Search… (e.g. "login flow", "payment gateway", "PROJ-123")'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    data-testid="input-search-jira"
                  />
                  <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} data-testid="btn-search-jira">
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} — click to expand, edit, or analyze</p>
                    <IssueList issues={searchResults} onImport={handleImport} />
                  </>
                )}
                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
