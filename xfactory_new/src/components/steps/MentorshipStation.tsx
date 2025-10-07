import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, MessageSquare, Video, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/api";

interface MentorshipSessionProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  sessionType: 'pre-mvp' | 'post-mvp' | 'pre-investor';
  context?: any; // Context from previous stations
}

export const MentorshipStation = ({ 
  onComplete, 
  onBack, 
  sessionType,
  context 
}: MentorshipSessionProps) => {
  const [sessionNotes, setSessionNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mentorMatch, setMentorMatch] = useState<any | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState<number>(0);
  // Proposals state (pending mentor requests)
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);


  useEffect(() => {
    const fetchMentorMatch = async () => {
      setIsLoading(true);
      try {
        // Resolve team and mentors linked to it
        const status = await apiClient.get('/team-formation/status/');
        const teamId = (status as any)?.data?.current_team?.id as number | undefined;
        if (!teamId) { setMentorMatch(null); return; }
        // Load team details via team list and filter by id to get mentors list
        const teams = await apiClient.get('/team-formation/teams/');
        const team = Array.isArray((teams as any)?.data) ? (teams as any).data.find((t: any) => t.id === teamId) : null;
        const mentors = Array.isArray(team?.mentors) ? team.mentors : [];
        if (mentors.length > 0) {
          setMentorMatch(mentors[0]);
        }
        // Prefill session fields from TRC mentorship snapshot
        try {
          const trc = await apiClient.get(`/ideation/teams/${teamId}/roadmap-completion/`);
          const m = (trc as any)?.data?.mentorship || {};
          const key = sessionType.replace('-', '_');
          // Load per-session fields if present, else fall back to global
          const per = (m[key] || {}) as any;
          if (typeof per.notes === 'string') setSessionNotes(per.notes);
          else if (typeof m.notes === 'string') setSessionNotes(m.notes);
          if (typeof per.action_items === 'string') setActionItems(per.action_items);
          else if (typeof m.action_items === 'string') setActionItems(m.action_items);
          if (typeof per.feedback === 'string') setFeedback(per.feedback);
          else if (typeof m.feedback === 'string') setFeedback(m.feedback);
          if (typeof per.rating === 'number') setRating(per.rating);
          else if (typeof m.rating === 'number') setRating(m.rating);
        } catch {}
        // Fallback to legacy idea-match endpoint if no mentors linked (admin pairing flow)
        const latest = await apiClient.getTeamLatestIdeaId(teamId);
        const ideaId = (latest as any)?.data?.id as number | undefined;
        if (!ideaId) { return; }
        const res = await apiClient.get(`/mentorship/matching/idea-matches/${ideaId}/`);
        const matches = Array.isArray((res as any)?.data) ? (res as any).data : ((res as any)?.data?.matches || []);
        if (matches.length > 0) {
          setMentorMatch(matches[0]);
        }
        // Load pending proposals for the team
        try {
          setProposalsLoading(true);
          const resp = await apiClient.getTeamMentorRequests(teamId);
          const payload = (resp as any)?.data;
          const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
          setProposals(items);
          setProposalsError(null);
        } catch (e: any) {
          setProposalsError('Unable to load mentor proposals.');
          setProposals([]);
        } finally {
          setProposalsLoading(false);
        }
      } catch { setMentorMatch(null); } finally { setIsLoading(false); }
    };

    fetchMentorMatch();
  }, [sessionType]);

  const sessionConfig = {
    "pre-mvp": {
      title: "Pre-MVP Mentorship Session",
      description: "Strategic guidance before building your MVP",
      focus: ["Product Strategy", "Technical Architecture", "Market Positioning", "Resource Planning"],
      duration: "60 minutes"
    },
    "post-mvp": {
      title: "Post-MVP Mentorship Session", 
      description: "Review MVP results and plan next steps",
      focus: ["Performance Analysis", "User Feedback Review", "Growth Strategy", "Scaling Preparation"],
      duration: "90 minutes"
    },
    "pre-investor": {
      title: "Pre-Investor Mentorship Session",
      description: "Prepare for investor conversations and materials",
      focus: ["Narrative", "Metrics", "Storytelling", "Investor Q&A"],
      duration: "60 minutes"
    }
  } as const;

  const assignedMentor = mentorMatch || {
    name: "Mentor TBD",
    background: "",
    photo_url: "",
    email: "",
    expertise: "",
    experience: "",
    calendly_url: ""
  };

  // Normalize fields from API (handle team serializer output)
  const mentorName = assignedMentor.name || assignedMentor.full_name || assignedMentor.email || 'Mentor';
  const mentorExpertise = assignedMentor.expertise || (Array.isArray(assignedMentor.skills) ? assignedMentor.skills.join(', ') : assignedMentor.skills) || '';
  const mentorExperience = assignedMentor.experience_summary || assignedMentor.background || '';
  const mentorCompany = assignedMentor.company || '';
  const mentorPosition = assignedMentor.position || '';
  const mentorYears = typeof assignedMentor.years_experience === 'number' ? assignedMentor.years_experience : undefined;
  const mentorIndustries = Array.isArray(assignedMentor.industries) ? assignedMentor.industries : [];
  const mentorCalendly = assignedMentor.calendly_url || '';


  const handleComplete = async () => {
    try {
      setIsSaving(true);
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (teamId) {
        const key = sessionType.replace('-', '_');
        await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, {
          mentorship: {
            [key]: {
              notes: sessionNotes,
              action_items: actionItems,
              feedback: feedback,
              rating: rating,
              completed: true,
            },
            [`${key}_completed`]: true,
          },
        });
      }
    } catch {}
    finally {
      setIsSaving(false);
      const mentorshipData = {
        sessionType,
        mentor: mentorMatch,
        sessionNotes,
        actionItems,
        feedback,
        rating,
        focusAreas: (sessionConfig as any)[sessionType].focus,
        completedAt: new Date().toISOString(),
        duration: (sessionConfig as any)[sessionType].duration
      };
      onComplete(mentorshipData);
    }
  };

  const handleSaveOnly = async () => {
    try {
      setIsSaving(true);
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (!teamId) return;
      const key = sessionType.replace('-', '_');
      await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, {
        mentorship: {
          [key]: {
            notes: sessionNotes,
            action_items: actionItems,
            feedback: feedback,
            rating: rating,
          },
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const config = (sessionConfig as any)[sessionType];

  // Pre-MVP: if no match yet, show mentor proposals (if any)
  if (sessionType === 'pre-mvp' && !isLoading && !mentorMatch) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
          <div className="text-center space-y-3">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Mentorship Proposals</h1>
            <p className="text-sm text-muted-foreground">Review pending mentor proposals and accept the best fit for your team.</p>
          </div>

          {proposalsLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading proposals…</div>
          ) : proposalsError ? (
            <div className="text-sm text-destructive">{proposalsError}</div>
          ) : proposals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pending proposals yet. Check back later.</div>
          ) : (
            <div className="space-y-4">
              {proposals.map((req: any) => (
                <Card key={req.id}>
                  <CardContent className="pt-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={req?.mentor?.photo_url} />
                        <AvatarFallback>{(req?.mentor?.name || req?.mentor?.email || 'M').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{req?.mentor?.name || req?.mentor?.email || 'Mentor'}</div>
                          {req?.status && <Badge variant="secondary" className="text-xs capitalize">{req.status}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{req?.message || 'No message provided'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedProposal(req); setDetailOpen(true); }}>View</Button>
                      <Button size="sm" onClick={async () => {
                        setProcessingRequestId(req.id);
                        try { 
                          await apiClient.respondMentorRequest(req.id, 'approve');
                          // Refresh mentor data to show the newly linked mentor
                          const status = await apiClient.get('/team-formation/status/');
                          const teamId = (status as any)?.data?.current_team?.id as number | undefined;
                          if (teamId) {
                            const teams = await apiClient.get('/team-formation/teams/');
                            const team = Array.isArray((teams as any)?.data) ? (teams as any).data.find((t: any) => t.id === teamId) : null;
                            const mentors = Array.isArray(team?.mentors) ? team.mentors : [];
                            if (mentors.length > 0) {
                              setMentorMatch(mentors[0]);
                            }
                            // Refresh proposals
                            const resp = await apiClient.getTeamMentorRequests(teamId);
                            const payload = (resp as any)?.data;
                            const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
                            setProposals(items);
                          }
                        } finally { setProcessingRequestId(null); }}} disabled={processingRequestId === req.id}>
                        {processingRequestId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        setProcessingRequestId(req.id);
                        try { await apiClient.respondMentorRequest(req.id, 'decline');
                          setProposals(prev => prev.filter(p => p.id !== req.id));
                        } finally { setProcessingRequestId(null); }}} disabled={processingRequestId === req.id}>Decline</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="outline" onClick={onBack}>Back to Dashboard</Button>
          </div>
        </div>

        {/* Mentor detail modal */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Mentor Proposal</DialogTitle>
            </DialogHeader>
            {selectedProposal && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedProposal?.mentor?.photo_url} />
                    <AvatarFallback>{(selectedProposal?.mentor?.name || selectedProposal?.mentor?.email || 'M').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{selectedProposal?.mentor?.name || selectedProposal?.mentor?.email || 'Mentor'}</div>
                    <div className="text-xs text-muted-foreground">{selectedProposal?.mentor?.email || ''}</div>
                  </div>
                </div>
                {selectedProposal?.mentor?.expertise && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Expertise</div>
                    <div className="text-sm">{selectedProposal.mentor.expertise}</div>
                  </div>
                )}
                {Array.isArray(selectedProposal?.mentor?.industries) && selectedProposal.mentor.industries.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Industries</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProposal.mentor.industries.map((ind: string, i: number) => (<Badge key={i} variant="secondary">{ind}</Badge>))}
                    </div>
                  </div>
                )}
                {(selectedProposal?.mentor?.linkedin_url || selectedProposal?.mentor?.portfolio_url || selectedProposal?.mentor?.calendly_url) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProposal.mentor.linkedin_url && <a className="text-xs underline" href={selectedProposal.mentor.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                    {selectedProposal.mentor.portfolio_url && <a className="text-xs underline" href={selectedProposal.mentor.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>}
                    {selectedProposal.mentor.calendly_url && <a className="text-xs underline" href={selectedProposal.mentor.calendly_url} target="_blank" rel="noreferrer">Calendly</a>}
                  </div>
                )}
                {selectedProposal?.message && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Message</div>
                    <div className="text-sm whitespace-pre-wrap">{selectedProposal.message}</div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" onClick={async () => { 
                    if (!selectedProposal) return; 
                    setProcessingRequestId(selectedProposal.id); 
                    try { 
                      await apiClient.respondMentorRequest(selectedProposal.id, 'approve'); 
                      setDetailOpen(false); 
                      // Refresh mentor data to show the newly linked mentor
                      const status = await apiClient.get('/team-formation/status/');
                      const teamId = (status as any)?.data?.current_team?.id as number | undefined;
                      if (teamId) {
                        const teams = await apiClient.get('/team-formation/teams/');
                        const team = Array.isArray((teams as any)?.data) ? (teams as any).data.find((t: any) => t.id === teamId) : null;
                        const mentors = Array.isArray(team?.mentors) ? team.mentors : [];
                        if (mentors.length > 0) {
                          setMentorMatch(mentors[0]);
                        }
                      }
                      // Remove the accepted proposal from the list
                      setProposals(prev => prev.filter(p => p.id !== selectedProposal.id));
                    } finally { 
                      setProcessingRequestId(null); 
                    } 
                  }} disabled={processingRequestId === (selectedProposal?.id || null)}>
                    {processingRequestId === (selectedProposal?.id || null) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => { if (!selectedProposal) return; setProcessingRequestId(selectedProposal.id); try { await apiClient.respondMentorRequest(selectedProposal.id, 'decline'); setDetailOpen(false); setProposals(prev => prev.filter(p => p.id !== selectedProposal.id)); } finally { setProcessingRequestId(null); } }} disabled={processingRequestId === (selectedProposal?.id || null)}>Decline</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>{config.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={assignedMentor.photo_url} />
                <AvatarFallback>{(mentorName || 'M').charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg">{mentorName}</div>
                  {assignedMentor.is_verified ? <Badge variant="success">Verified</Badge> : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  {mentorPosition && mentorCompany ? `${mentorPosition} @ ${mentorCompany}` : (mentorPosition || mentorCompany)}
                </div>
                <div className="text-sm text-muted-foreground">{mentorExpertise || assignedMentor.email}</div>
                {mentorYears !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1">{mentorYears} years of experience</div>
                )}
              </div>
              {mentorCalendly && (
                <Button variant="outline" onClick={() => setCalOpen(true)}>Book Meeting</Button>
              )}
            </div>

            {(mentorExperience || mentorIndustries.length > 0) && (
              <div className="rounded-md border p-4 bg-muted/30">
                {mentorExperience && (
                  <div className="mb-2">
                    <div className="text-xs text-muted-foreground mb-1">Experience</div>
                    <div className="text-sm whitespace-pre-wrap">{mentorExperience}</div>
                  </div>
                )}
                {mentorIndustries.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Industries</div>
                    <div className="flex flex-wrap gap-2">
                      {mentorIndustries.map((ind: string, i: number) => (
                        <Badge key={i} variant="secondary">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
 
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Session Notes</label>
                <textarea className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" rows={4} value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Action Items</label>
                <textarea className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" rows={4} value={actionItems} onChange={(e) => setActionItems(e.target.value)} />
              </div>
            </div>
 
            <div>
              <label className="text-sm text-muted-foreground">Feedback</label>
              <textarea className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </div>
          <div>
            <label className="text-sm text-muted-foreground">Rate this session</label>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  aria-label={`Rate ${i} star${i>1?'s':''}`}
                  className="p-1"
                >
                  <Star className={i <= rating ? 'h-5 w-5 text-yellow-500 fill-yellow-500' : 'h-5 w-5 text-muted-foreground'} />
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">{rating}/5</span>
            </div>
          </div>
 
            <div className="flex items-center gap-2">
              <Button variant="destructive" onClick={() => setConfirmDoneOpen(true)}>Mentorship Done</Button>
              <Button onClick={handleSaveOnly} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Session'}</Button>
              <Button variant="ghost" onClick={onBack}>Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
 
      {/* Confirm Mentorship Done */}
      <AlertDialog open={confirmDoneOpen} onOpenChange={setConfirmDoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark mentorship as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will complete the {sessionType === 'pre-mvp' ? 'Pre‑MVP' : 'Post‑MVP'} mentorship for your team and save your current session notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDoneOpen(false); handleComplete(); }}>Yes, complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={calOpen} onOpenChange={setCalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Book a Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mentorCalendly ? (
              <div
                className="calendly-inline-widget"
                data-url={mentorCalendly}
                style={{ minWidth: '320px', height: '700px' as any }}
                ref={(el) => {
                  if (!el) return;
                  // Ensure script
                  const existing = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]') as HTMLScriptElement | null;
                  const init = () => {
                    const Calendly = (window as any).Calendly;
                    if (Calendly && typeof Calendly.initInlineWidget === 'function') {
                      el.innerHTML = '';
                      Calendly.initInlineWidget({ url: mentorCalendly, parentElement: el });
                    }
                  };
                  if (existing) { init(); } else {
                    const s = document.createElement('script');
                    s.src = 'https://assets.calendly.com/assets/external/widget.js';
                    s.async = true;
                    s.onload = () => init();
                    document.body.appendChild(s);
                  }
                }}
              ></div>
            ) : (
              <div className="text-sm text-muted-foreground">No Calendly link available for this mentor.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};