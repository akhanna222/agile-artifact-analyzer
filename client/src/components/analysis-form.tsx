import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, BookOpen, Target, Layers, CheckSquare } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["epic", "feature", "story", "task"]),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface AnalysisFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

const typeInfo = {
  epic: {
    icon: Target,
    label: "Epic",
    description: "A large body of work that spans multiple sprints and can be broken down into features",
    placeholder: `Example:
Epic: Customer Self-Service Portal

Business Objective: Reduce customer support tickets by 40% by enabling customers to manage their accounts, track orders, and resolve common issues independently.

Scope:
- Account management (profile, preferences, security)
- Order tracking and history
- FAQ and knowledge base
- Live chat fallback for complex issues

Success Criteria:
- 40% reduction in support tickets within 6 months
- 80% customer satisfaction score
- 90% of common queries resolved without agent`,
  },
  feature: {
    icon: Layers,
    label: "Feature",
    description: "A functional capability that delivers user value, part of an epic",
    placeholder: `Example:
Feature: Order Tracking Dashboard

Description: A real-time dashboard where customers can view and track all their orders from placement to delivery.

Parent Epic: Customer Self-Service Portal

Acceptance Criteria:
- Display all orders with current status
- Real-time tracking updates
- Filter by date range and status
- Email notifications for status changes
- Mobile responsive design`,
  },
  story: {
    icon: BookOpen,
    label: "User Story",
    description: "A short description of functionality from an end-user perspective",
    placeholder: `Example:
As a registered customer,
I want to view the real-time delivery status of my order on a map,
So that I can plan my schedule around the expected delivery time.

Acceptance Criteria:
1. Given I am logged in, when I navigate to my order details, then I see a map showing the delivery driver's location
2. Given the order is out for delivery, when I view the map, then it updates every 30 seconds
3. Given the order is delivered, when I view the tracking, then I see the delivery confirmation with timestamp`,
  },
  task: {
    icon: CheckSquare,
    label: "Task",
    description: "A specific piece of work that contributes to completing a story",
    placeholder: `Example:
Task: Implement order tracking API endpoint

Parent Story: View real-time delivery status

Description:
Create a REST API endpoint that returns the current delivery status and GPS coordinates for a given order.

Technical Details:
- GET /api/orders/{orderId}/tracking
- Returns: status, driver location (lat/lng), ETA, last updated timestamp
- Integrate with logistics partner API
- Cache results for 30 seconds
- Estimated effort: 4 hours`,
  },
};

export function AnalysisForm({ onSubmit, isLoading }: AnalysisFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "story",
      content: "",
    },
  });

  const selectedType = form.watch("type") as keyof typeof typeInfo;
  const info = typeInfo[selectedType];
  const TypeIcon = info.icon;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-heading">
          Agile Artifact Analyzer
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Evaluate your epics, features, user stories, and tasks against industry-standard agile methodologies. Get quality scores, findings, and AI-improved versions.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., User Login Story"
                          data-testid="input-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(typeInfo).map(([key, val]) => {
                            const Icon = val.icon;
                            return (
                              <SelectItem key={key} value={key} data-testid={`option-type-${key}`}>
                                <span className="flex items-center gap-2">
                                  <Icon className="w-3.5 h-3.5" />
                                  {val.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-md bg-accent/50 p-3 flex items-start gap-2">
                <TypeIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={info.placeholder}
                        className="min-h-[280px] font-mono text-sm"
                        data-testid="textarea-content"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-analyze"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Quality
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
