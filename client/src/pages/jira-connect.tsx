import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Link2, CheckCircle, XCircle, Search, Download,
  ExternalLink, RefreshCw, Unplug, LogOut, Loader2,
  AlertTriangle, FileText, Tag, User,
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

function IssueList({ issues, onImport }: { issues: JiraIssue[]; onImport: (i: JiraIssue) => void }) {
  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
      {issues.map(issue => {
        const mappedType = ISSUE_TYPE_MAP[issue.issueType] || "story";
        return (
          <div key={issue.key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" data-testid={`issue-card-${issue.key}`}>
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
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{issue.summary}</p>
              {issue.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {issue.description.slice(0, 120)}{issue.description.length > 120 ? "..." : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href={issue.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open in Jira" data-testid={`btn-open-jira-${issue.key}`}>
                <ExternalLink className="w-4 h-4" />
              </a>
              <Button size="sm" variant="outline" onClick={() => onImport(issue)}
                className="text-xs h-7 px-2" data-testid={`btn-import-${issue.key}`}>
                <Download className="w-3 h-3 mr-1" /> Analyze
              </Button>
            </div>
          </div>
        );
      })}
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

  const { data: user } = useQuery<AuthUser | null>({ queryKey: ["/api/auth/me"] });

  const { data: jiraStatus, isLoading: statusLoading } = useQuery<JiraStatus>({
    queryKey: ["/api/jira/status"],
  });

  const { data: projectIssues, isLoading: issuesLoading, refetch: refetchIssues } = useQuery<{ issues: JiraIssue[]; total: number }>({
    queryKey: ["/api/jira/issues"],
    enabled: jiraStatus?.connected === true,
  });

  const connectMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/jira/connect", { baseUrl, email, apiToken, projectKey }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jira/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jira/issues"] });
      toast({ title: "Connected to Jira", description: `Logged in as ${data.user}` });
      setActiveTab("browse");
    },
    onError: (err: any) => {
      toast({ title: "Connection Failed", description: err.message || "Check your credentials.", variant: "destructive" });
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
            <span className="font-semibold text-lg">Jira Integration</span>
            <span className="text-xs text-gray-400 ml-1">Read &amp; Write</span>
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
        {!statusLoading && (
          <Card className={`border-2 ${jiraStatus?.connected ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-gray-200"}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {jiraStatus?.connected
                  ? <CheckCircle className="w-6 h-6 text-green-600" />
                  : <XCircle className="w-6 h-6 text-gray-400" />}
                <div>
                  <p className="font-semibold text-sm">
                    {jiraStatus?.connected ? "Connected to Jira" : "Not connected to Jira"}
                  </p>
                  {jiraStatus?.connected && (
                    <p className="text-xs text-gray-500">
                      {jiraStatus.baseUrl} · {jiraStatus.email}
                      {jiraStatus.projectKey && ` · Project: ${jiraStatus.projectKey}`}
                    </p>
                  )}
                </div>
              </div>
              {jiraStatus?.connected && (
                <Button variant="outline" size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  data-testid="btn-disconnect">
                  <Unplug className="w-4 h-4 mr-1" /> Disconnect
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-jira">
            <TabsTrigger value="connect" data-testid="tab-connect">
              <Link2 className="w-4 h-4 mr-1" /> Connect
            </TabsTrigger>
            <TabsTrigger value="browse" disabled={!jiraStatus?.connected} data-testid="tab-browse">
              <FileText className="w-4 h-4 mr-1" /> Browse Issues
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
                  Uses the Jira REST API v3 with API token authentication (read &amp; write access).
                  Supports importing issues and writing analysis results back as comments.
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
                    <p className="text-xs text-gray-400 mt-1">Your Atlassian cloud instance URL</p>
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

                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !baseUrl || !email || !apiToken}
                  className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
                  data-testid="btn-connect-jira">
                  {connectMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                    : <><Link2 className="w-4 h-4 mr-2" /> Connect to Jira</>}
                </Button>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Capabilities once connected:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>✅ <strong>Read</strong> — Browse and search issues from your Jira project</li>
                    <li>✅ <strong>Import</strong> — Pull any issue directly into the analyzer</li>
                    <li>✅ <strong>Write</strong> — Post analysis results back to Jira as a comment</li>
                    <li>✅ <strong>Label</strong> — Automatically tag issues with quality-high/medium/low</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BROWSE TAB ── */}
          <TabsContent value="browse">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Browse Issues</CardTitle>
                  <CardDescription>
                    {issuesLoading ? "Loading..." :
                      projectIssues ? `${projectIssues.total} issues${jiraStatus?.projectKey ? ` in ${jiraStatus.projectKey}` : " (all projects)"}` : ""}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchIssues()} disabled={issuesLoading} data-testid="btn-refresh-issues">
                  <RefreshCw className={`w-4 h-4 mr-1 ${issuesLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading issues...
                  </div>
                ) : !projectIssues?.issues?.length ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No issues found.</p>
                    <p className="text-xs mt-1">Add a project key in the Connect tab to filter by project.</p>
                  </div>
                ) : (
                  <IssueList issues={projectIssues.issues} onImport={handleImport} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SEARCH TAB ── */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Search Jira Issues</CardTitle>
                <CardDescription>Search by keyword across summaries and descriptions. Press Enter to search.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder='Search issues... (e.g. "login flow", "payment", "PROJ-123")'
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
                  <IssueList issues={searchResults} onImport={handleImport} />
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
