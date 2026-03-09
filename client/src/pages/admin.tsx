import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Shield,
  Users,
  KeyRound,
  BarChart3,
  FileText,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { useLocation } from "wouter";
import { UsageDashboard } from "@/components/usage-dashboard";

interface UserEntry {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

interface CreatedUser extends UserEntry {
  generatedPassword: string;
}

interface DocSummary {
  docName: string;
  pageCount: number;
  createdAt: string;
}

function DocumentsPanel() {
  const { toast } = useToast();

  const { data: documents = [], isLoading: docsLoading, refetch } = useQuery<DocSummary[]>({
    queryKey: ["/api/admin/documents"],
    refetchInterval: 5000,
  });

  const processAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/process-documents");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document processing started", description: "This may take a few minutes. The page will update automatically." });
      setTimeout(() => refetch(), 3000);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start processing", description: error.message, variant: "destructive" });
    },
  });

  const processSingleMutation = useMutation({
    mutationFn: async (docName: string) => {
      const res = await apiRequest("POST", `/api/admin/process-document/${docName}`);
      return res.json();
    },
    onSuccess: (_data, docName) => {
      toast({ title: `Processing ${docName}`, description: "This may take a few minutes." });
      setTimeout(() => refetch(), 3000);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to process document", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docName: string) => {
      await apiRequest("DELETE", `/api/admin/documents/${docName}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
      toast({ title: "Document deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete document", description: error.message, variant: "destructive" });
    },
  });

  const allDocs = ["Epic-Standards", "Feature-Standard", "The_Lighthouse"];
  const totalChunks = documents.reduce((sum, d) => sum + d.pageCount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Reference Documents</h2>
              <Badge variant="secondary" data-testid="badge-doc-count">{documents.length} docs</Badge>
              <Badge variant="outline" data-testid="badge-chunk-count">{totalChunks} chunks</Badge>
            </div>
            <Button
              className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
              size="sm"
              onClick={() => processAllMutation.mutate()}
              disabled={processAllMutation.isPending}
              data-testid="button-process-all"
            >
              {processAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Process All Documents
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Reference documents are used during analysis to verify artifacts against company-specific standards. Processing extracts text, creates embeddings, and stores them for semantic search.
          </p>

          {docsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {allDocs.map((docName) => {
                const doc = documents.find(d => d.docName === docName);
                const isProcessed = !!doc;
                return (
                  <div
                    key={docName}
                    className="flex items-center justify-between p-3 rounded-md bg-accent/50"
                    data-testid={`row-doc-${docName}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isProcessed ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <FileText className={`w-4 h-4 ${isProcessed ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" data-testid={`text-doc-name-${docName}`}>
                          {docName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isProcessed
                            ? `${doc.pageCount} chunks · Processed ${new Date(doc.createdAt).toLocaleDateString()}`
                            : "Not processed"
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={isProcessed ? "secondary" : "outline"} className="text-xs">
                        {isProcessed ? "Ready" : "Pending"}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => processSingleMutation.mutate(docName)}
                        disabled={processSingleMutation.isPending}
                        data-testid={`button-process-${docName}`}
                      >
                        {processSingleMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      {isProcessed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(docName)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-doc-${docName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const { data: users = [], isLoading } = useQuery<UserEntry[]>({
    queryKey: ["/api/admin/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; isAdmin: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: (data: CreatedUser) => {
      setCreatedUser(data);
      setEmail("");
      setIsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message.includes("409") ? "User with this email already exists" : error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message.includes("400") ? "Cannot delete your own account" : error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyPassword = async (password: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedUser(null);
    createMutation.mutate({ email, isAdmin });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-admin-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[hsl(22,100%,50%)]" />
            <h1 className="text-lg font-semibold" data-testid="text-admin-title">Admin Dashboard</h1>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Usage Analytics
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Reference Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4">
            <UsageDashboard />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <DocumentsPanel />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Add New User</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">Email Address</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                        data-testid="input-admin-email"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="admin-toggle"
                        checked={isAdmin}
                        onCheckedChange={setIsAdmin}
                        data-testid="switch-admin"
                      />
                      <Label htmlFor="admin-toggle" className="text-sm">Grant admin privileges</Label>
                    </div>
                    <Button
                      type="submit"
                      className="bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
                      disabled={createMutation.isPending}
                      data-testid="button-create-user"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      Create User & Generate Password
                    </Button>
                  </form>

                  {createdUser && (
                    <div className="mt-4 p-4 rounded-md bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <KeyRound className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">User Created</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Email:</span> <strong data-testid="text-created-email">{createdUser.email}</strong></p>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Password:</span>
                          <code className="font-mono bg-accent px-2 py-0.5 rounded text-sm" data-testid="text-created-password">
                            {createdUser.generatedPassword}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyPassword(createdUser.generatedPassword)}
                            data-testid="button-copy-password"
                          >
                            {copiedPassword ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Save this password now — it cannot be retrieved later.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">All Users</h2>
                    <Badge variant="secondary" className="ml-auto" data-testid="badge-user-count">
                      {users.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-md bg-accent/50"
                          data-testid={`row-user-${user.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" data-testid={`text-user-email-${user.id}`}>
                                {user.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {user.isAdmin && (
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-admin-${user.id}`}>
                                Admin
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(user.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
