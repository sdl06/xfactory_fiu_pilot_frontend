import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InfoButton from "@/components/info-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Code, ArrowLeft, ArrowRight, CheckCircle, 
  Rocket, Target, 
  Camera, AlertTriangle, TrendingUp, 
  ExternalLink, LayoutDashboard, Loader2, Sparkles
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { FactorAI } from "../FactorAI";
import { Badge as UITag } from "@/components/ui/badge";

interface MVPDevelopmentStationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  mentorshipData?: any; // Data from previous mentorship session
  ideaData?: any;
  mockupData?: any;
}

export const MVPDevelopmentStation = ({ 
  onComplete, 
  onBack, 
  mentorshipData,
  ideaData,
  mockupData 
}: MVPDevelopmentStationProps) => {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    videoLink: '',
    videoDescription: '',
    submissionNotes: '',
    demoLink: '',
    validationLink: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const handleTaskComplete = async (taskId: number) => {
    try {
      const teamId = await getTeamId();
      if (!teamId) {
        throw new Error('Team ID not found');
      }

      // Find the current task to determine new status
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) return;

      const newStatus = currentTask.status === 'completed' ? 'not_started' : 'completed';
      
      // Update task status in backend
      await apiClient.updateTaskStatus(teamId, taskId, newStatus);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      alert('Failed to update task status. Please try again.');
    }
  };

  const handleSubmitMvp = async () => {
    if (!submissionData.videoLink.trim()) {
      alert('Please provide a 2-minute Google Drive video link');
      return;
    }

    setIsSubmitting(true);
    try {
      const teamId = await getTeamId();
      if (!teamId) {
        throw new Error('Team ID not found');
      }

      await apiClient.submitMvp(
        teamId,
        submissionData.videoLink,
        submissionData.videoDescription,
        submissionData.submissionNotes
      );
      try {
        await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, {
          mvp: { submission_completed: true, demo_link: submissionData.demoLink, validation_link: submissionData.validationLink }
        });
      } catch {}

      setShowSubmissionDialog(false);
      onComplete({ mvpSubmitted: true });
    } catch (error) {
      console.error('Error submitting MVP:', error);
      alert('Failed to submit MVP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const [bottlenecks] = useState([
    { issue: "Resource allocation", impact: "high", stage: "Development" },
    { issue: "API integration delays", impact: "medium", stage: "Development" }
  ]);
  const [taskManagementId, setTaskManagementId] = useState<number | null>(null);

  // New unified MVP state
  const [mvpData, setMvpData] = useState<any>(null);
  const [mvpImage, setMvpImage] = useState<string | null>(null);
  const [isGeneratingMvp, setIsGeneratingMvp] = useState(false);
  const [mvpGenerated, setMvpGenerated] = useState(false);

  // Get team ID helper
  const getTeamId = async (): Promise<number | null> => {
    try {
      const cached = localStorage.getItem('xfactoryTeamId');
      if (cached) return Number(cached);
      const st = await apiClient.get('/team-formation/status/');
      const tid = (st as any)?.data?.current_team?.id as number | undefined;
      if (tid) { try { localStorage.setItem('xfactoryTeamId', String(tid)); } catch {} }
      return tid || null;
    } catch { return null; }
  };

  // Generate unified MVP with retry mechanism
  const generateUnifiedMvp = async (retryCount = 0) => {
    try {
      setIsGeneratingMvp(true);
      const teamId = await getTeamId();
      if (!teamId) {
        console.error('No team ID found');
        setIsGeneratingMvp(false);
        return;
      }

      const response = await apiClient.generateUnifiedMvp(teamId);
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        console.log('MVP generation response data:', data);
        console.log('Image URL received:', data.image_url);
        setMvpData(data.mvp_data);
        setMvpImage(data.image_url);
        setMvpGenerated(true);
        
        // If tasks were generated, refresh the task list
        if (data.task_management_id) {
          setTaskManagementId(data.task_management_id);
          // Refresh tasks from the backend
          try {
            const taskResponse = await apiClient.getMvpTasksTeam(teamId);
            if (taskResponse.status >= 200 && taskResponse.status < 300) {
              const taskData = taskResponse.data;
              if (taskData.tasks && Array.isArray(taskData.tasks)) {
                setTasks(taskData.tasks.map((t: any) => ({ 
                  id: t.id, 
                  title: t.title, 
                  status: t.status || 'not_started', 
                  stage: t.task_type || 'Development', 
                  priority: t.priority || 'medium',
                  description: t.description || ''
                })));
              }
            }
          } catch (taskError) {
            console.error('Error refreshing tasks:', taskError);
          }
        }
      } else {
        console.error('Failed to generate MVP:', response.error);
        // Show user-friendly error message
        alert('Failed to generate MVP. Please try again or check your internet connection.');
      }
    } catch (error) {
      console.error('Error generating MVP:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message?.includes('timeout') || error.message?.includes('network'))) {
        console.log(`Retrying MVP generation (attempt ${retryCount + 1}/2)...`);
        setTimeout(() => generateUnifiedMvp(retryCount + 1), 2000);
        return;
      }

      // Show user-friendly error message
      alert('Failed to generate MVP due to network issues. Please check your internet connection and try again.');
    } finally {
      if (retryCount === 0) {
        setIsGeneratingMvp(false);
      }
    }
  };

  // Load existing MVP data on mount
  useEffect(() => {
    const loadExistingMvp = async () => {
      try {
        const teamId = await getTeamId();
        if (!teamId) return;

        // Check if MVP station is marked as complete; if not, don't load existing (treat as reset)
        let shouldLoadMvp = true;
        try {
          const roadmap = await apiClient.getTeamRoadmap(teamId);
          const mvp = (roadmap as any)?.data?.mvp || {};
          // If MVP flags are explicitly false or all missing, don't load existing (treat as reset)
          if (!mvp.prototype_built && !mvp.task_plan_generated && !mvp.software_mockup) {
            shouldLoadMvp = false;
          }
        } catch {}
        
        if (!shouldLoadMvp) return; // Skip loading if station is reset

        const response = await apiClient.getUnifiedMvp(teamId);
        if (response.status >= 200 && response.status < 300) {
          const data = response.data;
          console.log('Existing MVP data loaded:', data);
          console.log('Existing image URL:', data.image_url);
          if (data.mvp_data) {
            setMvpData(data.mvp_data);
            setMvpImage(data.image_url);
            setMvpGenerated(true);
          }
        }
      } catch (error) {
        console.error('Error loading existing MVP:', error);
      }
    };

    loadExistingMvp();
  }, []);

  // Fetch tasks on mount
  useEffect(() => {
  const fetchTasksIfAny = async () => {
    try {
        const teamId = await getTeamId();
        if (!teamId) return;

        // Check if MVP station is marked as complete; if not, don't load existing tasks (treat as reset)
        let shouldLoadMvp = true;
        try {
          const roadmap = await apiClient.getTeamRoadmap(teamId);
          const mvp = (roadmap as any)?.data?.mvp || {};
          // If MVP flags are explicitly false or all missing, don't load existing (treat as reset)
          if (!mvp.prototype_built && !mvp.task_plan_generated && !mvp.software_mockup) {
            shouldLoadMvp = false;
          }
        } catch {}
        
        if (!shouldLoadMvp) return; // Skip loading if station is reset

        const res = await apiClient.getMvpTasksTeam(teamId);
        if (res.status >= 200 && res.status < 300) {
          const tm = (res as any)?.data?.task_management;
          const items = (res as any)?.data?.tasks;
        if (tm && Array.isArray(items)) {
          setTaskManagementId(tm.id || null);
            setTasks(items.map((t: any) => ({ 
              id: t.id, 
              title: t.title, 
              status: t.status || 'not_started', 
              stage: t.task_type || 'Development', 
              priority: t.priority || 'medium',
              description: t.description || ''
            })));
          } else {
            // No tasks exist yet - this is normal
            console.log('No tasks found for team - will be generated when MVP is created');
          }
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Don't show error to user - tasks will be generated when MVP is created
      }
    };

    fetchTasksIfAny();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Code className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-50">MVP Development Station</h1>
                <p className="text-sm text-slate-50">AI-powered MVP generation and task management</p>
              </div>
            </div>
            <Badge variant="accent" className="text-lg px-4 py-2">
              <Rocket className="h-4 w-4 mr-2" />
              Build MVP
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="mvp" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mvp">MVP Generation</TabsTrigger>
            <TabsTrigger value="planning">Planning Dashboard</TabsTrigger>
          </TabsList>

          {/* MVP Generation Section */}
          <TabsContent value="mvp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                  AI-Generated MVP
                  <InfoButton
                    title="AI MVP Auto-Pilot"
                    content={`**What this does**
                    Lets the AI sketch your MVP outline so you are not staring at a blank page.
                    Treat it like a cheat sheet you can edit, not a final exam answer.`}
                  />
                  </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generate a comprehensive MVP description and visual representation using AI
                </p>
                </CardHeader>
              <CardContent className="space-y-6">
                {!mvpGenerated && !isGeneratingMvp && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Generate Your MVP</h3>
                    <p className="text-muted-foreground mb-6">
                      Our AI will analyze your idea and create a detailed MVP description with a visual representation
                    </p>
                    <Button onClick={() => generateUnifiedMvp()} size="lg" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Generate MVP
                    </Button>
                    </div>
                  )}

                {isGeneratingMvp && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Generating Your MVP</h3>
                    <p className="text-muted-foreground mb-4">
                      AI is analyzing your idea and creating a comprehensive MVP description with development tasks...
                    </p>
                    <div className="w-full max-w-md mx-auto">
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div className="h-2 bg-primary rounded animate-pulse" style={{ width: '70%' }} />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Generating MVP description and development tasks
                      </div>
                    </div>
                    </div>
                  )}

                {mvpGenerated && mvpData && (
                  <div className="space-y-6">
                    {/* MVP Description */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">{mvpData.mvp_title}</h3>
                          <p className="text-muted-foreground">{mvpData.mvp_description}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Key Features</h4>
                          <div className="flex flex-wrap gap-2">
                            {mvpData.key_features?.map((feature: string, index: number) => (
                              <Badge key={index} variant="secondary">{feature}</Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Target Users</h4>
                          <p className="text-sm text-muted-foreground">{mvpData.target_users}</p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Value Proposition</h4>
                          <p className="text-sm text-muted-foreground">{mvpData.value_proposition}</p>
                        </div>
                      </div>

                      {/* MVP Image */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Visual Representation</h4>
                        {mvpImage ? (
                          <div className="rounded-lg overflow-hidden border">
                            <img 
                              src={mvpImage} 
                              alt="MVP Visual" 
                              className="w-full h-auto object-contain"
                              onError={(e) => {
                                console.error('Failed to load image:', mvpImage);
                                console.error('Image error:', e);
                                // Try to construct a direct backend URL
                                const backendUrl = mvpImage.startsWith('http') ? mvpImage : `https://api.ivyfactory.io${mvpImage}`;
                                if (backendUrl !== mvpImage) {
                                  (e.target as HTMLImageElement).src = backendUrl;
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="aspect-square rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                            <div className="text-center">
                              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No image generated</p>
                    </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Success Metrics */}
                    {mvpData.success_metrics && mvpData.success_metrics.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Success Metrics</h4>
                        <div className="grid md:grid-cols-3 gap-3">
                          {mvpData.success_metrics.map((metric: string, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{metric}</span>
                              </div>
                          </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regenerate Button */}
                    <div className="flex justify-center pt-4">
                      <Button variant="outline" onClick={() => generateUnifiedMvp()} disabled={isGeneratingMvp}>
                        {isGeneratingMvp ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Regenerate MVP
                          </>
                        )}
                      </Button>
                    </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
          </TabsContent>

          {/* Planning Dashboard (tasks & bottlenecks remain) */}
          <TabsContent value="planning" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Task Management */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Task Management
                    <InfoButton
                      title="Task Tracker Decoder"
                      content={`**Keep the chaos sorted**
                      Use this to track who is doing what and by when.
                      Update it any time the plan changes so nobody is lost.`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <Button variant="outline" size="sm" onClick={async () => {
                      try {
                        const teamId = await getTeamId();
                        if (!teamId) return;
                        const res = await apiClient.getMvpTasksTeam(teamId);
                        const tm = (res as any)?.data?.task_management;
                        const items = (res as any)?.data?.tasks;
                        if (tm && Array.isArray(items)) {
                          setTaskManagementId(tm.id || null);
                          setTasks(items.map((t: any) => ({ 
                            id: t.id, 
                            title: t.title, 
                            status: t.status || 'not_started', 
                            stage: t.task_type || 'Development', 
                            priority: t.priority || 'medium',
                            description: t.description || ''
                          })));
                        }
                      } catch (error) {
                        console.error('Error refreshing tasks:', error);
                      }
                    }}>Refresh Tasks</Button>
                    <Button variant="warning" size="sm" onClick={async () => {
                      try {
                        const teamId = await getTeamId();
                        if (!teamId) {
                          alert('No team ID found. Please try again.');
                          return;
                        }
                        
                        console.log('Regenerating tasks for team:', teamId);
                        const out = await apiClient.generateMvpTasksTeam(teamId);
                        
                        if (out.status >= 200 && out.status < 300) {
                          const responseData = (out as any)?.data;
                          console.log('Task regeneration response:', responseData);
                          setTaskManagementId(responseData?.task_management_id || null);
                          
                          // Refresh tasks after regeneration
                          const res = await apiClient.getMvpTasksTeam(teamId);
                          if (res.status >= 200 && res.status < 300) {
                            const tm = (res as any)?.data?.task_management;
                            const items = (res as any)?.data?.tasks;
                            if (tm && Array.isArray(items)) {
                              setTaskManagementId(tm.id || null);
                              setTasks(items.map((t: any) => ({ 
                                id: t.id, 
                                title: t.title, 
                                status: t.status || 'not_started', 
                                stage: t.task_type || 'Development', 
                                priority: t.priority || 'medium',
                                description: t.description || ''
                              })));
                              console.log(`Regenerated ${items.length} tasks successfully`);
                              
                              // Show success message
                              if (responseData?.ai_generated) {
                                alert(`Tasks regenerated successfully! AI generated ${items.length} comprehensive tasks based on your MVP data.`);
                              } else if (responseData?.used_mvp_data) {
                                alert(`Tasks regenerated successfully! Generated ${items.length} comprehensive tasks based on your MVP data.`);
                              } else {
                                alert(`Tasks regenerated successfully! Generated ${items.length} basic tasks (no MVP data found).`);
                              }
                            } else {
                              console.log('No tasks returned from API');
                              alert('Tasks regenerated but failed to load. Please refresh the page.');
                            }
                          } else {
                            console.error('Failed to fetch tasks after regeneration:', res);
                            alert('Tasks regenerated but failed to load. Please refresh the page.');
                          }
                        } else {
                          console.error('Failed to regenerate tasks:', out);
                          alert('Failed to regenerate tasks. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error generating tasks:', error);
                        alert('Error generating tasks. Please check your internet connection and try again.');
                      }
                    }}>Regenerate Tasks</Button>
                  </div>
                  <div className="space-y-3">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleTaskComplete(task.id)}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          <div className="flex gap-2 mt-1">
                            <UITag variant="outline" className="text-xs">{task.stage || 'Development'}</UITag>
                            <UITag variant={task.priority === 'high' ? 'destructive' : (task.priority === 'medium' ? 'secondary' : 'outline')} className="text-xs">
                              {task.priority || 'medium'}
                            </UITag>
                          </div>
                        </div>
                      </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No tasks available yet</p>
                        <p className="text-xs mt-1">
                          {mvpGenerated 
                            ? "Tasks should have been generated with your MVP. Try refreshing or generating tasks manually."
                            : "Generate an MVP first, or create tasks manually using the Generate Tasks button."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Milestone Stages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Development Stages
                    <InfoButton
                      title="Progress Overview"
                      content={`**Development Progress**
                      Shows which milestone you are on and what remains.
                      Track your progress through the development stages.`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Planning', 'Setup', 'Design', 'Development'].map((stage) => {
                      const stageTasks = tasks.filter(task => (task.stage || '').toLowerCase() === stage.toLowerCase());
                      const completedTasks = stageTasks.filter(task => task.status === 'completed');
                      const isCompleted = stageTasks.length > 0 && completedTasks.length === stageTasks.length;
                      const inProgress = stageTasks.length > 0 && completedTasks.length > 0 && completedTasks.length < stageTasks.length;
                      
                      return (
                        <div key={stage} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              isCompleted ? 'bg-success' : inProgress ? 'bg-warning' : 'bg-muted'
                            }`} />
                            <span className="font-medium">{stage}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {completedTasks.length}/{stageTasks.length} tasks
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Bottleneck Detection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  AI-Detected Bottlenecks
                  <InfoButton
                    title="Bottleneck Radar"
                    content={`**Sneaky slowdown detector**
                    Flags steps where progress is dragging or resources are missing.
                    Use it to decide what to unblock first.`}
                  />
                </CardTitle>
                <p className="text-muted-foreground">
                  AI analysis of your project identifies potential roadblocks and delays.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium">{bottleneck.issue}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Stage: {bottleneck.stage} • Impact: {bottleneck.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Complete Section */}
            {mvpGenerated && tasks.filter(t => t.status === 'completed').length >= 3 && (
              <Card className="border-success bg-success/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-success" />
                      <div>
                        <h3 className="font-semibold">MVP Development Planning Complete</h3>
                        <p className="text-sm text-muted-foreground">
                          Ready to proceed to the next station
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <InfoButton
                        title="What Do I Need to Submit?"
                        content={`**Demo Link** (Required)
                        - A working version of your MVP that we can actually see and try
                        - This could be a website, app, video demo, slides, or anything that shows your MVP in action
                        - Think of it as "proof" that you built something real
                        
                        **Validation Video** (Required - Less than 3 minutes)
                        - A short video showing your MVP demo AND how you validated it
                        - Show us your MVP working, then explain how you tested it with real people
                        - Tell us what you learned from testing and how it changed your idea
                        
                        **Why This Matters**
                        We need to see that you didn't just build something - you actually tested it with real people and learned from the experience. This is what separates a real startup from just a cool project!`}
                      />
                      <Button onClick={() => setShowSubmissionDialog(true)} className="flex items-center gap-2">
                        Submit MVP
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Mark MVP Station as Complete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark the MVP Development Station as complete?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => { 
              setShowCompleteDialog(false); 
              onComplete({ 
                mvpData, 
                mvpImage, 
                tasks, 
                bottlenecks, 
                completedAt: new Date().toISOString() 
              }); 
            }} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Complete Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MVP Submission Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Submit MVP
            </DialogTitle>
            <DialogDescription>
              Submit your MVP demo and validation video. We need to see your working MVP and proof that you tested it with real people!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Validation Video Link *</label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/... or https://youtube.com/watch?v=..."
                value={submissionData.videoLink}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, videoLink: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload a video (less than 3 minutes) showing your MVP demo AND how you validated it with real people. You can use Google Drive, YouTube, or any video platform.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">MVP Demo Link (Optional)</label>
              <input
                type="url"
                placeholder="https://your-app.com or https://drive.google.com/file/d/..."
                value={submissionData.demoLink}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, demoLink: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If you have a working website, app, or demo that we can try ourselves, share the link here. This is optional if your video already shows everything.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Validation Evidence Link (Optional)</label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/... or https://youtube.com/watch?v=..."
                value={submissionData.validationLink}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, validationLink: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If you have additional evidence of validation (surveys, interview recordings, etc.), share the link here. This is optional if your main video already covers validation.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Video Description</label>
              <textarea
                placeholder="Briefly describe what your video shows: your MVP demo, how you tested it, and what you learned from validation..."
                value={submissionData.videoDescription}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, videoDescription: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Help us understand what to expect in your video before we watch it.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Additional Notes</label>
              <textarea
                placeholder="Any additional notes about your MVP submission..."
                value={submissionData.submissionNotes}
                onChange={(e) => setSubmissionData(prev => ({ ...prev, submissionNotes: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmissionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitMvp} 
              disabled={isSubmitting || !submissionData.videoLink.trim()}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Submit MVP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};