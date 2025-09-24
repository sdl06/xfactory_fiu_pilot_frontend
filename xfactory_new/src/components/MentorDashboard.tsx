import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Star, 
  MessageSquare, 
  Video,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  Target,
  Rocket,
  Settings
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MentorTeamDetails } from "./MentorTeamDetails";

interface MentorDashboardProps {
  onBack: () => void;
  mentorData: any;
}

export const MentorDashboard = ({ onBack, mentorData }: MentorDashboardProps) => {
  const { toast } = useToast();
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [loadingMyTeams, setLoadingMyTeams] = useState(false);
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const [ideaReview, setIdeaReview] = useState<any | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    name: mentorData?.name || "",
    email: mentorData?.email || "",
    expertise: mentorData?.expertise || "",
    availability: mentorData?.availability || "",
    linkedinUrl: mentorData?.linkedin_url || mentorData?.linkedinUrl || "",
    portfolioUrl: mentorData?.portfolio_url || mentorData?.portfolioUrl || "",
    calendlyUrl: mentorData?.calendly_url || mentorData?.calendlyUrl || "",
    photo: mentorData?.photo_url || mentorData?.photo || "",
  });
  const [meetingCounts, setMeetingCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoadingOpps(true);
        const res = await apiClient.get('/mentorship/teams/');
        setOpportunities(((res as any)?.data?.teams || []).slice(0, 20));
      } finally { setLoadingOpps(false); }
      try {
        setLoadingMyTeams(true);
        const mt = await apiClient.get(`/mentorship/my-teams/?email=${encodeURIComponent(mentorData?.email || '')}`);
        setMyTeams(((mt as any)?.data?.items || []));
      } finally { setLoadingMyTeams(false); }
    })();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const entries = await Promise.all(
          (myTeams || []).map(async (item: any) => {
            const teamId = item?.team?.id;
            if (!teamId) return [null, 0] as const;
            try {
              const trc = await apiClient.get(`/ideation/teams/${teamId}/roadmap-completion/`);
              const mc = Number(((trc as any)?.data?.mentorship || {}).meetings_completed || 0);
              return [teamId, mc] as const;
            } catch { return [teamId, 0] as const; }
          })
        );
        const map: Record<number, number> = {};
        entries.forEach(([id, cnt]) => { if (id) map[id as number] = cnt as number; });
        setMeetingCounts(map);
      } catch {}
    };
    if (myTeams && myTeams.length > 0) fetchCounts();
  }, [myTeams]);

  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    try {
      const res = await apiClient.getMentorProfile(mentorData?.email);
      const m = (res as any)?.data?.mentor || {};
      setProfileForm({
        name: m.name || "",
        email: m.email || mentorData?.email || "",
        expertise: m.expertise || "",
        availability: m.availability || "",
        linkedinUrl: m.linkedin_url || "",
        portfolioUrl: m.portfolio_url || "",
        calendlyUrl: m.calendly_url || "",
        photo: m.photo_url || "",
      });
    } catch {}
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const payload = {
        name: profileForm.name,
        email: profileForm.email,
        expertise: profileForm.expertise,
        availability: profileForm.availability,
        linkedinUrl: profileForm.linkedinUrl,
        portfolioUrl: profileForm.portfolioUrl,
        calendlyUrl: profileForm.calendlyUrl,
        photo: profileForm.photo,
      };
      const res = await apiClient.mentorRegister(payload);
      if ((res as any)?.status >= 200 && (res as any)?.status < 300) {
        toast({ title: 'Profile saved' });
        setSettingsOpen(false);
      } else {
        toast({ title: 'Save failed', description: (res as any)?.error || 'Try again', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Network error', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const incrementMeetingCount = async (teamId: number) => {
    try {
      const current = meetingCounts[teamId] || 0;
      await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, {
        mentorship: { meetings_completed: current + 1 },
      });
      setMeetingCounts(prev => ({ ...prev, [teamId]: current + 1 }));
    } catch {}
  };

  const handleJoinStartup = async (teamId: number) => {
    try {
      await apiClient.post(`/mentorship/teams/${teamId}/join/`, { email: mentorData?.email });
      const mt = await apiClient.get(`/mentorship/my-teams/?email=${encodeURIComponent(mentorData?.email || '')}`);
      setMyTeams(((mt as any)?.data?.items || []));
    } catch {}
  };

  const handleViewIdea = async (teamId: number) => {
    try {
      // PST
      const pstRes = await apiClient.getTeamProblemSolution(teamId);
      const d: any = pstRes?.data || {};
      const aiIdea = {
        problem_statement: d.problem || d.input_problem || '',
        solution_overview: d.solution || d.input_solution || '',
        target_audience: d.target || d.input_target_audience || ''
      };
      // Concept card (generate fallback)
      let teamCardRes: any = await apiClient.getTeamConceptCard(teamId);
      const ok = teamCardRes && teamCardRes.status >= 200 && teamCardRes.status < 300 && !('error' in teamCardRes);
      if (!ok) {
        try { await apiClient.generateTeamConceptCard(teamId); } catch {}
        try { teamCardRes = await apiClient.getTeamConceptCard(teamId) as any; } catch {}
      }
      const tc: any = (teamCardRes && !('error' in teamCardRes)) ? (teamCardRes as any).data : null;
      const card = (tc && (tc.title || tc.summary || tc.primary_persona)) ? tc : null;
      setIdeaReview({ aiIdea, card });
      setIdeaDialogOpen(true);
    } catch {}
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "Idea Creation": return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "Validation": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      case "MVP Development": return "bg-orange-500/10 text-orange-600 border-orange-200";
      case "Launch": return "bg-green-500/10 text-green-600 border-green-200";
      case "Completed": return "bg-gray-500/10 text-gray-600 border-gray-200";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const computeProgressPct = (snapshot: any): number => {
    try {
      if (!snapshot || typeof snapshot !== 'object') return 0;
      const sections = Object.values(snapshot) as any[];
      let total = 0, done = 0;
      sections.forEach(sec => {
        if (sec && typeof sec === 'object') {
          const vals = Object.values(sec);
          vals.forEach((v: any) => { total += 1; if (v === true) done += 1; });
        }
      });
      return total > 0 ? Math.round((done / total) * 100) : 0;
    } catch { return 0; }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Landing
              </Button>
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-50">Mentor Dashboard</h1>
                <p className="text-sm text-slate-50">Welcome back, {mentorData?.name || 'Mentor'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleOpenSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Badge variant="accent" className="px-4 py-2">
                <Star className="h-4 w-4 mr-2" />
                4.9 Rating
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Mentorships</p>
                  <p className="text-2xl font-bold">{myTeams.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hours This Month</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Mentorships</TabsTrigger>
            <TabsTrigger value="opportunities">New Opportunities</TabsTrigger>
            <TabsTrigger value="calendar">Calendar & Availability</TabsTrigger>
          </TabsList>

          {/* Active Mentorships */}
          <TabsContent value="active" className="space-y-6">
            {myTeams && myTeams.length > 0 ? (
            <div className="grid gap-6">
                {myTeams.map((item: any) => {
                  const team = item.team || {};
                  const snapshot = item.progress || {};
                  const pct = computeProgressPct(snapshot);
                  return (
                    <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                        <div>
                              <CardTitle className="text-lg">{team.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">Team ID #{team.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Meetings done</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-medium">{meetingCounts[team.id] || 0}</span>
                          <Button size="sm" variant="outline" onClick={() => incrementMeetingCount(team.id)}>+1</Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                        <p className="text-muted-foreground mb-4">{team.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-3">
                          <Button size="sm" variant="outline" onClick={() => handleViewIdea(team.id)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Review Idea
                      </Button>
                          <Button size="sm" variant="default" onClick={() => setSelectedTeamId(team.id)}>
                            <Target className="h-4 w-4 mr-2" />
                            View Details
                      </Button>
                          {mentorData?.calendly_url && (
                            <a href={mentorData.calendly_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                                <Calendar className="h-4 w-4 mr-2" />
                                Book on Calendly
                      </Button>
                            </a>
                          )}
                    </div>
                  </CardContent>
                </Card>
                  );
                })}
            </div>
            ) : (
              <div className="text-sm text-muted-foreground">You are not mentoring anyone yet. Share your experience by going to New Opportunities!</div>
            )}
          </TabsContent>

          {/* New Opportunities */}
          <TabsContent value="opportunities" className="space-y-6">
            <div className="grid gap-6">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{opportunity.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Team ID #{opportunity.id}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">Members {opportunity.current_member_count}/{opportunity.max_members}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Open for mentors</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{opportunity.description || 'No description provided.'}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Team Size</p>
                        <p className="font-medium">{opportunity.current_member_count}/{opportunity.max_members}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ID</p>
                        <p className="font-medium">{opportunity.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button onClick={() => handleJoinStartup(opportunity.id)}>
                        <Users className="h-4 w-4 mr-2" />
                        Join as Mentor
                      </Button>
                      <Button variant="outline" onClick={() => handleViewIdea(opportunity.id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Idea
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!opportunities || opportunities.length === 0) && (
                <div className="text-sm text-muted-foreground">{loadingOpps ? 'Loading opportunities...' : 'No teams available'}</div>
              )}
            </div>
          </TabsContent>

          {/* Calendar & Availability */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Calendly Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Calendly Connected</p>
                        <p className="text-sm text-muted-foreground">{mentorData?.calendly_url || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">This Week</p>
                        <p className="font-medium">8 hours scheduled</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available Slots</p>
                        <p className="font-medium">12 remaining</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <a href="https://calendly.com/app/availability/schedules" target="_blank" rel="noopener noreferrer">
                      <Button className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Availability
                      </Button>
                    </a>
                    <a href="https://calendly.com/app/scheduled_events/user/me" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full">
                        <Calendar className="h-4 w-4 mr-2" />
                        View Calendly Dashboard
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Sessions removed */}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={selectedTeamId !== null} onOpenChange={(open) => { if (!open) setSelectedTeamId(null); }}
        >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          {selectedTeamId && (
            <MentorTeamDetails
              teamId={selectedTeamId}
              mentorEmail={mentorData?.email || ''}
              onClose={() => setSelectedTeamId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Idea Review Dialog */}
      <Dialog open={ideaDialogOpen} onOpenChange={setIdeaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Idea Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Problem</p>
              <p className="font-medium">{ideaReview?.aiIdea?.problem_statement || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Solution</p>
              <p className="font-medium">{ideaReview?.aiIdea?.solution_overview || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Target Audience</p>
              <p className="font-medium">{ideaReview?.aiIdea?.target_audience || '-'}</p>
            </div>
            {ideaReview?.card && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Concept Card</p>
                <div className="font-medium">{ideaReview.card.title || 'Untitled'}</div>
                <div className="text-sm text-muted-foreground">{ideaReview.card.summary || 'No summary'}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mentor Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Name</Label>
              <Input value={profileForm.name} onChange={(e) => setProfileForm((p: any) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Expertise</Label>
              <Input value={profileForm.expertise} onChange={(e) => setProfileForm((p: any) => ({ ...p, expertise: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Availability</Label>
              <Input value={profileForm.availability} onChange={(e) => setProfileForm((p: any) => ({ ...p, availability: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">LinkedIn URL</Label>
              <Input value={profileForm.linkedinUrl} onChange={(e) => setProfileForm((p: any) => ({ ...p, linkedinUrl: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Portfolio URL</Label>
              <Input value={profileForm.portfolioUrl} onChange={(e) => setProfileForm((p: any) => ({ ...p, portfolioUrl: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Calendly URL</Label>
              <Input value={profileForm.calendlyUrl} onChange={(e) => setProfileForm((p: any) => ({ ...p, calendlyUrl: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Photo URL</Label>
              <Input value={profileForm.photo} onChange={(e) => setProfileForm((p: any) => ({ ...p, photo: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
};