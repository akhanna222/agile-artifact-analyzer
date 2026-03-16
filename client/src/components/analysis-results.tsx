import type { Analysis, AnalysisResult } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  FileText,
  TrendingUp,
  Copy,
  Check,
  ClipboardList,
  Shield,
  Gauge,
  Target,
  User,
  ListChecks,
  Zap,
  BookOpen,
  Send,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResultsProps {
  analysis: Analysis;
  results: AnalysisResult;
  onBack: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "text-green-500 dark:text-green-400";
    if (s >= 50) return "text-amber-500 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  const getStrokeColor = (s: number) => {
    if (s >= 80) return "stroke-green-500 dark:stroke-green-400";
    if (s >= 50) return "stroke-amber-500 dark:stroke-amber-400";
    return "stroke-red-500 dark:stroke-red-400";
  };

  return (
    <div className="relative w-36 h-36">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={getStrokeColor(score)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-bold ${getColor(score)}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          data-testid="text-overall-score"
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />;
  if (status === "warning") return <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pass: "bg-green-500/10 text-green-700 dark:text-green-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    fail: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[status] || variants.fail}`} data-testid={`badge-status-${status}`}>
      {status === "pass" ? "Pass" : status === "warning" ? "Needs Work" : "Fail"}
    </span>
  );
}

function CategoryScoreBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-green-500 dark:bg-green-400";
    if (s >= 50) return "bg-amber-500 dark:bg-amber-400";
    return "bg-red-500 dark:bg-red-400";
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{score}</span>
    </div>
  );
}

function extractTitleFromImproved(improvedVersion: unknown, type: string): string {
  if (!improvedVersion) return "";
  const text = typeof improvedVersion === "string" ? improvedVersion : JSON.stringify(improvedVersion);
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  // Strip markdown heading markers
  const clean = (s: string) => s.replace(/^#+\s*/, "").replace(/^\*+|\*+$/g, "").trim();

  for (const line of lines) {
    const c = clean(line);
    if (!c) continue;

    // Skip label-only lines like "Title:", "Epic:", "Feature:"
    if (/^(title|epic|feature|story|task|name|summary)\s*:/i.test(c) && c.length < 30) continue;

    // For "As a..." stories — use the whole first line, it IS the title
    if (/^as a\b/i.test(c)) {
      return c.length > 200 ? c.slice(0, 197) + "..." : c;
    }

    // Strip inline label prefix like "Title: My Epic Name"
    const withoutLabel = c.replace(/^(title|epic|feature|story|task|name|summary)\s*:\s*/i, "");
    return withoutLabel.length > 200 ? withoutLabel.slice(0, 197) + "..." : withoutLabel;
  }
  return "";
}

function extractJiraKey(title: string): string {
  const match = title.match(/^\[([A-Z][A-Z0-9]*-\d+)\]/);
  return match ? match[1] : "";
}

export function AnalysisResults({ analysis, results, onBack }: AnalysisResultsProps) {
  const [copiedImproved, setCopiedImproved] = useState(false);
  const [jiraDialogOpen, setJiraDialogOpen] = useState(false);
  const [jiraKey, setJiraKey] = useState(() => extractJiraKey(analysis.title));
  const [addLabel, setAddLabel] = useState(true);
  const [updateDescription, setUpdateDescription] = useState(true);
  const [renameTitle, setRenameTitle] = useState(false);
  const extractedTitle = results.improvedVersion
    ? extractTitleFromImproved(results.improvedVersion, analysis.type)
    : "";
  const { toast } = useToast();

  const { data: jiraStatus } = useQuery<{ connected: boolean; baseUrl?: string }>({
    queryKey: ["/api/jira/status"],
  });

  const writebackMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/jira/issue/${jiraKey.trim()}/writeback`, {
        score: results.overallScore,
        summary: results.summary,
        categories: results.categories,
        addLabel,
        updateDescription,
        improvedVersion: results.improvedVersion,
        newSummary: renameTitle && extractedTitle ? extractedTitle : undefined,
      }),
    onSuccess: () => {
      const parts = ["Analysis results posted"];
      if (updateDescription) parts.push("description updated");
      if (renameTitle && extractedTitle) parts.push("title renamed");
      toast({
        title: "Written to Jira",
        description: `${parts.join(", ")} on ${jiraKey.toUpperCase()}.`,
      });
      setJiraDialogOpen(false);
      setJiraKey("");
    },
    onError: (err: any) => {
      toast({ title: "Write-back Failed", description: err.message || "Could not write to Jira.", variant: "destructive" });
    },
  });

  const handleCopyImproved = () => {
    if (results.improvedVersion) {
      navigator.clipboard.writeText(results.improvedVersion);
      setCopiedImproved(true);
      setTimeout(() => setCopiedImproved(false), 2000);
    }
  };

  const categories = results.categories || [];
  const passCount = categories.filter((c) => c.status === "pass").length;
  const warnCount = categories.filter((c) => c.status === "warning").length;
  const failCount = categories.filter((c) => c.status === "fail").length;

  const typeLabels: Record<string, string> = {
    epic: "Epic",
    feature: "Feature",
    story: "User Story",
    task: "Task",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" />
          New Analysis
        </Button>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Badge variant="secondary" data-testid="badge-type">
            {typeLabels[analysis.type] || analysis.type}
          </Badge>
          <h2 className="text-lg font-semibold" data-testid="text-analysis-title">{analysis.title}</h2>
        </div>
        {jiraStatus?.connected && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setJiraDialogOpen(true)}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 shrink-0"
            data-testid="btn-write-to-jira"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Write to Jira
          </Button>
        )}
      </div>

      {/* Jira Write-back Dialog */}
      <Dialog open={jiraDialogOpen} onOpenChange={setJiraDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" /> Write Analysis to Jira
            </DialogTitle>
            <DialogDescription>
              Posts a full quality report as a comment on the Jira issue — score, per-category findings &amp; suggestions
              {results.improvedVersion ? ", and the improved version" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="jira-issue-key">Jira Issue Key</Label>
              <Input
                id="jira-issue-key"
                placeholder="e.g. PROJ-123, AAA-456"
                value={jiraKey}
                onChange={e => setJiraKey(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && jiraKey.trim() && writebackMutation.mutate()}
                data-testid="input-jira-issue-key"
              />
              {extractJiraKey(analysis.title) && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Auto-detected from imported story
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={addLabel}
                onChange={e => setAddLabel(e.target.checked)}
                className="rounded"
                data-testid="checkbox-add-label"
              />
              Add quality label ({results.overallScore >= 75 ? "quality-high" : results.overallScore >= 50 ? "quality-medium" : "quality-low"})
            </label>
            {results.improvedVersion && (
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateDescription}
                  onChange={e => setUpdateDescription(e.target.checked)}
                  className="rounded mt-0.5"
                  data-testid="checkbox-update-description"
                />
                <span>
                  <span className="font-medium">Replace description with improved version</span>
                  <span className="block text-gray-500 text-xs mt-0.5">Overwrites the current Jira description with the AI-improved artifact text</span>
                </span>
              </label>
            )}
            {results.improvedVersion && extractedTitle && (
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={renameTitle}
                  onChange={e => setRenameTitle(e.target.checked)}
                  className="rounded mt-0.5"
                  data-testid="checkbox-rename-title"
                />
                <span>
                  <span className="font-medium">Rename issue title from improved version</span>
                  <span className="block text-gray-500 text-xs mt-0.5">Updates the Jira issue summary/title field</span>
                  {renameTitle && (
                    <span className="block mt-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 text-xs text-amber-800 dark:text-amber-200">
                      <span className="font-semibold block mb-0.5">New title preview:</span>
                      "{extractedTitle}"
                    </span>
                  )}
                </span>
              </label>
            )}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">Comment will include:</p>
              <p className="text-gray-500">• Overall score: {results.overallScore}/100 ({results.overallScore >= 75 ? "High Quality" : results.overallScore >= 50 ? "Needs Improvement" : "Low Quality"})</p>
              <p className="text-gray-500">• AI summary</p>
              <p className="text-gray-500">• {results.categories?.length || 0} categories with findings &amp; suggestions</p>
              {results.improvedVersion && <p className="text-green-600 dark:text-green-400">• Full improved version text</p>}
              {addLabel && <p className="text-gray-500">• Label: {results.overallScore >= 75 ? "quality-high" : results.overallScore >= 50 ? "quality-medium" : "quality-low"}</p>}
              {updateDescription && <p className="text-orange-600 dark:text-orange-400">• Description also replaced with improved version</p>}
              {renameTitle && extractedTitle && <p className="text-amber-600 dark:text-amber-400">• Issue title renamed to AI-improved version</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJiraDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => writebackMutation.mutate()}
              disabled={!jiraKey.trim() || writebackMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="btn-confirm-write-jira"
            >
              {writebackMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</>
                : <><Send className="w-4 h-4 mr-2" /> Post to Jira</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <ScoreRing score={results.overallScore} />
            <p className="text-sm text-muted-foreground text-center mt-4 max-w-[200px]">
              Overall Quality Score
            </p>
            <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> {passCount}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> {warnCount}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" /> {failCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-summary">
                  {results.summary}
                </p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              {categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StatusIcon status={cat.status} />
                  <span className="text-sm min-w-[160px] shrink-0">{cat.name}</span>
                  <CategoryScoreBar score={cat.score} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {(results.investScores || results.clarity !== undefined || results.complexity || results.acceptanceCriteriaPresent !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.investScores && (
            <Card data-testid="card-invest-scores">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-[hsl(22,100%,50%)]" />
                  <h3 className="text-sm font-semibold">INVEST Scores</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(results.investScores).map(([key, value]) => {
                    const getBarColor = (s: number) => {
                      if (s >= 80) return "bg-green-500";
                      if (s >= 50) return "bg-amber-500";
                      return "bg-red-500";
                    };
                    return (
                      <div key={key} data-testid={`invest-score-${key}`}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {key}
                          </span>
                          <span className="text-xs font-mono font-medium">{value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${getBarColor(value)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {(results.clarity !== undefined || results.completeness !== undefined || results.acceptanceCriteriaPresent !== undefined) && (
            <Card data-testid="card-quality-checks">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks className="w-4 h-4 text-[hsl(22,100%,50%)]" />
                  <h3 className="text-sm font-semibold">Quality Checks</h3>
                </div>
                {(results.clarity !== undefined || results.completeness !== undefined) && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {results.clarity !== undefined && (
                      <div className="rounded-lg bg-accent/50 p-3 text-center" data-testid="score-clarity">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Clarity</div>
                        <div className={`text-2xl font-bold font-mono ${results.clarity >= 80 ? "text-green-500" : results.clarity >= 50 ? "text-amber-500" : "text-red-500"}`}>
                          {results.clarity}
                        </div>
                      </div>
                    )}
                    {results.completeness !== undefined && (
                      <div className="rounded-lg bg-accent/50 p-3 text-center" data-testid="score-completeness">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Completeness</div>
                        <div className={`text-2xl font-bold font-mono ${results.completeness >= 80 ? "text-green-500" : results.completeness >= 50 ? "text-amber-500" : "text-red-500"}`}>
                          {results.completeness}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(results.acceptanceCriteriaPresent !== undefined || results.userRoleDefined !== undefined || results.businessValueClear !== undefined) && (
                  <div className="space-y-2">
                    {[
                      { key: "acceptanceCriteriaPresent", label: "Acceptance Criteria", icon: ListChecks, value: results.acceptanceCriteriaPresent },
                      { key: "userRoleDefined", label: "User Role Defined", icon: User, value: results.userRoleDefined },
                      { key: "businessValueClear", label: "Business Value Clear", icon: Zap, value: results.businessValueClear },
                    ].filter(item => item.value !== undefined).map(item => (
                      <div key={item.key} className="flex items-center gap-2" data-testid={`check-${item.key}`}>
                        {item.value ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(results.complexity || results.riskLevel) && (
            <Card data-testid="card-complexity-risk">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gauge className="w-4 h-4 text-[hsl(22,100%,50%)]" />
                  <h3 className="text-sm font-semibold">Complexity & Risk</h3>
                </div>
                <div className="space-y-4">
                  {results.complexity && (
                    <div data-testid="tag-complexity">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Complexity</div>
                      <Badge variant="secondary" className={`text-sm px-3 py-1 ${
                        results.complexity === "Low" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                        results.complexity === "Medium" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                        "bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}>
                        <Shield className="w-3.5 h-3.5 mr-1.5 inline" />
                        {results.complexity}
                      </Badge>
                    </div>
                  )}
                  {results.riskLevel && (
                    <div data-testid="tag-risk-level">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Risk Level</div>
                      <Badge variant="secondary" className={`text-sm px-3 py-1 ${
                        results.riskLevel === "Low" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                        results.riskLevel === "Medium" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                        "bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5 inline" />
                        {results.riskLevel}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="details" className="w-full">
        <TabsList data-testid="tabs-results">
          <TabsTrigger value="original" data-testid="tab-original">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Original Content
          </TabsTrigger>
          <TabsTrigger value="details" data-testid="tab-details">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Detailed Findings
          </TabsTrigger>
          {results.improvedVersion && (
            <TabsTrigger value="improved" data-testid="tab-improved">
              <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
              Improved Version
            </TabsTrigger>
          )}
          {results.references && results.references.length > 0 && (
            <TabsTrigger value="references" data-testid="tab-references">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              References ({results.references.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="original" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">
                    Original {typeLabels[analysis.type] || analysis.type}
                  </h4>
                </div>
                <Badge variant="secondary">{typeLabels[analysis.type] || analysis.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-md bg-accent/50 p-4">
                <pre
                  className="whitespace-pre-wrap text-sm font-mono leading-relaxed"
                  data-testid="text-original-content"
                >
                  {analysis.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="space-y-4">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={cat.status} />
                        <h4 className="text-sm font-semibold" data-testid={`text-category-${i}`}>{cat.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={cat.status} />
                        <span className="text-sm font-mono font-medium">{cat.score}/100</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {cat.findings.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Findings
                        </h5>
                        <ul className="space-y-1.5">
                          {cat.findings.map((f, j) => (
                            <li key={j} className="text-sm flex items-start gap-2" data-testid={`text-finding-${i}-${j}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {cat.suggestions.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Suggestions
                        </h5>
                        <ul className="space-y-1.5">
                          {cat.suggestions.map((s, j) => (
                            <li key={j} className="text-sm flex items-start gap-2" data-testid={`text-suggestion-${i}-${j}`}>
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {results.improvedVersion && (
          <TabsContent value="improved" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold">AI-Improved Version</h4>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyImproved}
                    data-testid="button-copy-improved"
                  >
                    {copiedImproved ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-md bg-accent/50 p-4">
                  <pre
                    className="whitespace-pre-wrap text-sm font-mono leading-relaxed"
                    data-testid="text-improved-version"
                  >
                    {results.improvedVersion}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {results.references && results.references.length > 0 && (
          <TabsContent value="references" className="mt-4">
            <div className="space-y-3">
              {results.references.map((ref, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card data-testid={`card-reference-${i}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-md bg-[hsl(22,100%,50%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4 text-[hsl(22,100%,50%)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold" data-testid={`text-ref-doc-${i}`}>
                              {ref.docName}
                            </span>
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-ref-page-${i}`}>
                              Page {ref.pageNumber}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2" data-testid={`text-ref-relevance-${i}`}>
                            {ref.relevance}
                          </p>
                          <div className="rounded-md bg-accent/50 p-3">
                            <p className="text-xs text-muted-foreground italic leading-relaxed" data-testid={`text-ref-excerpt-${i}`}>
                              "{ref.excerpt}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
