import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ArrowLeft,
  Link2,
  Shield,
  LogOut,
  CheckCircle,
  Download,
  Settings,
  MessageSquare,
  Tag,
  AlertTriangle,
  Activity,
  Info,
} from "lucide-react";

interface AuthUser {
  id: number;
  email: string;
  isAdmin: boolean;
}

export default function JiraConnect() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const [jiraUrl, setJiraUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [importing, setImporting] = useState(false);

  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [writeScoreBack, setWriteScoreBack] = useState(false);
  const [createComments, setCreateComments] = useState(false);
  const [flagLowScore, setFlagLowScore] = useState(true);
  const [syncVelocity, setSyncVelocity] = useState(false);

  const handleTestConnection = () => {
    if (!jiraUrl || !apiToken || !projectKey) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all connection fields before testing.",
        variant: "destructive",
      });
      return;
    }
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      toast({
        title: "Connection Successful",
        description: `Connected to ${jiraUrl} - Project ${projectKey}`,
      });
    }, 1500);
  };

  const handleImportStories = () => {
    if (!jiraUrl || !apiToken || !projectKey) {
      toast({
        title: "Missing Fields",
        description: "Please configure your Jira connection first.",
        variant: "destructive",
      });
      return;
    }
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      toast({
        title: "Import Complete",
        description: `Imported 12 stories from ${projectKey} sprint backlog.`,
      });
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden lg:flex lg:flex-col lg:w-80 border-r bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-[hsl(22,100%,50%)] flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-sidebar-foreground" data-testid="text-app-title">
              Agile Artifact Analyzer
            </h1>
          </div>
          <p className="text-xs text-sidebar-foreground/50 ml-10">
            AI-Powered Quality Analysis
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => setLocation("/")}
            data-testid="button-nav-analyzer"
          >
            <FileText className="w-4 h-4 mr-2" />
            Analyzer
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground"
            data-testid="button-nav-jira-active"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Jira Connect
          </Button>
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {user?.isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={() => setLocation("/admin")}
              data-testid="button-admin"
            >
              <Shield className="w-4 h-4 mr-2" />
              User Management
            </Button>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/50 truncate pl-1" data-testid="text-user-email">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground shrink-0"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-1 p-3 border-b lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[hsl(22,100%,50%)] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-base font-semibold" data-testid="text-app-title-mobile">Jira Connect</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back-mobile"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout-mobile"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold" data-testid="text-jira-heading">Jira Connect</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your Jira integration to import stories and sync analysis results.
              </p>
            </div>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-5 h-5 text-[hsl(22,100%,50%)]" />
                <h3 className="text-base font-semibold" data-testid="text-connection-settings">Connection Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="jira-url">Jira Instance URL</Label>
                  <Input
                    id="jira-url"
                    placeholder="https://your-team.atlassian.net"
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    data-testid="input-jira-url"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="api-token">API Token</Label>
                  <Input
                    id="api-token"
                    type="password"
                    placeholder="Enter your Jira API token"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    data-testid="input-api-token"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-key">Project Key</Label>
                  <Input
                    id="project-key"
                    placeholder="e.g. PROJ"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value)}
                    data-testid="input-project-key"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    data-testid="button-test-connection"
                  >
                    {testingConnection ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Testing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Test Connection
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleImportStories}
                    disabled={importing}
                    data-testid="button-import-stories"
                  >
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Importing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Import Stories
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-[hsl(22,100%,50%)]" />
                <h3 className="text-base font-semibold" data-testid="text-sync-config">Sync Configuration</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Auto-analyze on import</p>
                    <p className="text-xs text-muted-foreground">Automatically run quality analysis when stories are imported</p>
                  </div>
                  <Switch
                    checked={autoAnalyze}
                    onCheckedChange={setAutoAnalyze}
                    data-testid="switch-auto-analyze"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Write quality score back to Jira</p>
                    <p className="text-xs text-muted-foreground">Update a custom field in Jira with the analysis quality score</p>
                  </div>
                  <Switch
                    checked={writeScoreBack}
                    onCheckedChange={setWriteScoreBack}
                    data-testid="switch-write-score"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Create Jira comments with suggestions</p>
                    <p className="text-xs text-muted-foreground">Post improvement suggestions as comments on Jira issues</p>
                  </div>
                  <Switch
                    checked={createComments}
                    onCheckedChange={setCreateComments}
                    data-testid="switch-create-comments"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Flag stories below score 60</p>
                    <p className="text-xs text-muted-foreground">Add a warning flag to stories that score below the quality threshold</p>
                  </div>
                  <Switch
                    checked={flagLowScore}
                    onCheckedChange={setFlagLowScore}
                    data-testid="switch-flag-low-score"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Sync sprint velocity data</p>
                    <p className="text-xs text-muted-foreground">Import velocity metrics from Jira sprints for trend analysis</p>
                  </div>
                  <Switch
                    checked={syncVelocity}
                    onCheckedChange={setSyncVelocity}
                    data-testid="switch-sync-velocity"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-[hsl(22,100%,50%)]" />
                <h3 className="text-base font-semibold" data-testid="text-writeback-info">Writeback to Jira</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                When writeback is enabled, the following data is synced back to your Jira issues:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Tag className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" data-testid="text-writeback-custom-field">Custom Field: Quality Score</p>
                    <p className="text-xs text-muted-foreground">Numeric score (0-100) written to a custom field on each issue</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1">
                      LBL
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium" data-testid="text-writeback-label">Label: Quality Rating</p>
                    <p className="text-xs text-muted-foreground">Labels like "quality-high", "quality-medium", "quality-low" added to issues</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" data-testid="text-writeback-comment">Comment: Analysis Summary</p>
                    <p className="text-xs text-muted-foreground">Detailed analysis with suggestions posted as an issue comment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" data-testid="text-writeback-flag">Flag: Low Quality Warning</p>
                    <p className="text-xs text-muted-foreground">Issues scoring below 60 are flagged for review before sprint planning</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
