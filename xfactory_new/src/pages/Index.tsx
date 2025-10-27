import { useState, useEffect } from "react";
import { FactoryLanding } from "@/components/FactoryLanding";
import { AdminLoginFlow } from "@/components/AdminLoginFlow";
import { UserLoginFlow } from "@/components/UserLoginFlow";
import { AdminDashboard } from "@/components/AdminDashboard";
import { OnboardingFlow, BusinessType } from "@/components/OnboardingFlow";
import { AccountCreationFlow } from "@/components/AccountCreationFlow";
import { MentorAccountCreation } from "@/components/MentorAccountCreation";
import { InvestorAccountCreation } from "@/components/InvestorAccountCreation";
import { MentorDashboard } from "@/components/MentorDashboard";
import { InvestorDashboard } from "@/components/InvestorDashboard";
import { FactoryDashboard } from "@/components/FactoryDashboard";
import { FactoryCommunity } from "@/components/FactoryCommunity";
import { MemberAdditionScreen } from "@/components/MemberAdditionScreen";
import { useAuth } from "@/contexts/AuthContext";
import { IdeaCreationStation } from "@/components/steps/IdeaCreationStation";
import { MockupStation } from "@/components/steps/MockupStation";
import { ValidationEngine } from "@/components/steps/ValidationEngine";
import { MVPDevelopmentStation } from "@/components/steps/MVPDevelopmentStation";
import { MentorshipStation } from "@/components/steps/MentorshipStation";
import { PrototypingStation } from "@/components/steps/PrototypingStation";
import { TestingStation } from "@/components/steps/TestingStation";
import { PitchPracticeStation } from "@/components/steps/PitchPracticeStation";
import { MarketingStation } from "@/components/steps/MarketingStation";
import { LegalStation } from "@/components/steps/LegalStation";
import { FinancialStation } from "@/components/steps/FinancialStation";
import { IterationStation } from "@/components/steps/IterationStation";
import { ScalingStation } from "@/components/steps/ScalingStation";
import { LaunchStation } from "@/components/steps/LaunchStation";
import { MonitoringStation } from "@/components/steps/MonitoringStation";
import { LaunchPrepStation } from "@/components/steps/LaunchPrepStation";
import { LaunchExecutionStation } from "@/components/steps/LaunchExecutionStation";
import { InvestorPresentationStation } from "@/components/steps/InvestorPresentationStation";
import { CompletionCelebration } from "@/components/CompletionCelebration";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { lsGetScoped, scopedKey } from "@/lib/teamScope";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import html2canvas from 'html2canvas';

type AppState = "landing" | "admin-login" | "user-login" | "admin-dashboard" | "account-creation" | "mentor-signup" | "investor-signup" | "mentor-dashboard" | "investor-dashboard" | "onboarding" | "dashboard" | "station" | "community" | "completion" | "member-addition" | "mentor-team-select";

interface UserData {
  hasIdea: boolean;
  businessType: BusinessType | null;
  ideaSummary: string;
  problem?: string;
  solution?: string;
  target?: string;
}

interface StationData {
  currentStation: number;
  reviewMode?: boolean; // Add review mode flag
  onboardingData?: {
    problem?: string;
    solution?: string;
    target?: string;
    businessType?: BusinessType | null;
  };
  ideaCard?: any;
  mockups?: any;
  validationData?: any;
  prototypeData?: any;
  mvpData?: any;
  testingData?: any;
  iterationData?: any;
  pitchData?: any;
  scalingData?: any;
  launchData?: any;
  monitoringData?: any;
  marketingData?: any;
  legalData?: any;
  financialData?: any;
  investorData?: any;
  completedStations: number[];
  onboardingInitialStep?: number;
  _pivotReset?: number; // Used to force remount when pivoting
}

const Index = () => {
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const [appState, setAppState] = useState<AppState>("landing");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mentorData, setMentorData] = useState<any>(null);
  const [investorData, setInvestorData] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [stationData, setStationData] = useState<StationData>({
    currentStation: (() => {
      try {
        const v = localStorage.getItem(scopedKey('xfactoryCurrentStation'));
        return v ? Number(v) : 1;
      } catch {
        return 1;
      }
    })(),
    completedStations: (() => {
      try {
        const key = scopedKey('xfactoryCompletedStations');
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed as number[];
        }
        return lsGetScoped('xfactoryStationCompleted_1') === 'true' ? [1] : [];
      } catch {
        return [];
      }
    })()
  });
  const [trcSnapshot, setTrcSnapshot] = useState<any>({});

  // Sync completedStations with team roadmap completion (mockup) so UI reflects backend state
  useEffect(() => {
    (async () => {
      try {
        if (isLoading || !user) return;
        // If this user is a mentor, route to mentor dashboards instead of idea flow
        try {
          const { apiClient } = await import("@/lib/api");
          const prof = await apiClient.getMentorProfile(user.email);
          if (prof && (prof as any).status >= 200 && (prof as any).status < 300 && (prof as any).data?.mentor) {
            setMentorData((prof as any).data.mentor);
            const myTeams = await apiClient.get(`/mentorship/my-teams/?email=${encodeURIComponent(user.email)}`);
            const items = (myTeams as any)?.data?.items || [];
            setAppState(items.length === 0 ? "mentor-team-select" : "mentor-dashboard");
            return;
          }
        } catch {}
        const { apiClient } = await import("@/lib/api");
        const status = await apiClient.get('/team-formation/status/');
        const team = (status as any)?.data?.current_team;
        const teamId = team?.id;
        if (!teamId) return;
        try { if (team?.name) localStorage.setItem('xfactoryTeamName', String(team.name)); } catch {}

        // Persist team id for scoping across tabs/browsers
        try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {}

        // Persist team roadmap completion flags
        const trc = await apiClient.get(`/ideation/teams/${teamId}/roadmap-completion/`);
        const trcData: any = (trc as any)?.data || {};
        setTrcSnapshot(trcData);
        const mvp = trcData?.mvp || {};
        const validation = trcData?.validation || {};
        const pitch = trcData?.pitch_deck || {};
        const testing = trcData?.testing || {};
        const operations = trcData?.operations || {};
        const finance = trcData?.finance || {};
        const legal = trcData?.legal || {};
        const prelaunch = trcData?.prelaunch || {};
        const isIdeaDone = true; // treat ideation as done once logged in and onboarded
        const isMockupDone = !!(mvp.prototype_built || mvp.software_mockup);
        // Only mark validation station complete when ALL tiers are done
        const isValidationComplete = !!(validation.secondary && validation.qualitative && validation.quantitative);

        // Determine completed sections from TRC snapshot (team-shared)
        const sectionsCompleted: string[] = [];
        if (isIdeaDone) sectionsCompleted.push('ideation');
        if (isValidationComplete) sectionsCompleted.push('validation');
        if (pitch.slides_generated || pitch.practice_completed || pitch.mentor_deck_generated || pitch.investor_deck_generated || pitch.submission_completed) sectionsCompleted.push('pitch_deck');
        if (mvp.prototype_built || mvp.task_plan_generated) sectionsCompleted.push('mvp');
        if (testing.usability_completed || testing.feedback_collection_completed) sectionsCompleted.push('testing');
        if (operations.playbook_completed) sectionsCompleted.push('operations');
        if (finance.budget_completed) sectionsCompleted.push('finance');
        if (legal.compliance_completed) sectionsCompleted.push('legal');
        if (prelaunch.deployment_ready) sectionsCompleted.push('prelaunch');
        // Include mentorship completion
        const mentorship = trcData?.mentorship || {};
        if (mentorship.pre_mvp_completed) sectionsCompleted.push('mentorship');
        // Post-MVP mentorship is controlled by MVP completion, not a separate flag
        
        // Clean up incorrect workshop completion data
        if (finance.budget_completed && !sectionsCompleted.includes('marketing')) {
          console.log('Cleaning up: Finance workshop marked complete but Marketing not done');
          // Remove finance completion if marketing isn't done
          finance.budget_completed = false;
        }
        if (legal.compliance_completed && !sectionsCompleted.includes('finance')) {
          console.log('Cleaning up: Legal workshop marked complete but Finance not done');
          // Remove legal completion if finance isn't done
          legal.compliance_completed = false;
        }
        
        // Map high-level sections to stations
        const sectionToStations: Record<string, number> = {
          ideation: 1,
          validation: 3,
          pitch_deck: 4,
          mentorship: 5,
          mvp: 6,
          testing: 7,
          marketing: 12,
          finance: 13,
          legal: 14,
          prelaunch: 8,
        };

        setStationData(prev => {
          // Recompute completed stations fresh from backend signals to avoid stale local flags
          const merged = new Set<number>();
          if (isIdeaDone) merged.add(1);
          if (isMockupDone) merged.add(2);
          if (isValidationComplete) merged.add(3);
          // Add stations based on backend sections
          for (const s of sectionsCompleted) {
            const sid = sectionToStations[s];
            if (sid) merged.add(sid);
          }
          
          // Post-MVP mentorship (station 7) is only available after MVP completion
          const mvp = trcData?.mvp || {};
          if (mvp.prototype_built || mvp.task_plan_generated) {
            merged.add(7); // Post-MVP mentorship becomes available
          }
          const mergedArr = Array.from(merged).sort((a,b)=>a-b);
          // Determine next station to unlock (main sequence)
          // Main progression sequence now includes workshops (12,13,14) after post‑MVP mentorship (7)
          const mainSeq = [1,2,3,4,5,6,7,12,13,14,8,9,10,11,15];
          let nextStation = 1;
          for (const sid of mainSeq) {
            if (!merged.has(sid)) { nextStation = sid; break; }
          }
          const updated = { ...prev, completedStations: mergedArr };
          updated.currentStation = nextStation;
          try {
            const key = scopedKey('xfactoryCompletedStations');
            localStorage.setItem(key, JSON.stringify(mergedArr));
            if (isIdeaDone) localStorage.setItem(scopedKey('xfactoryStationCompleted_1'), 'true');
            // Only persist station 2 completion if backend indicates it
            if (isMockupDone) localStorage.setItem(scopedKey('xfactoryStationCompleted_2'), 'true'); else localStorage.removeItem(scopedKey('xfactoryStationCompleted_2'));
            if (isValidationComplete) localStorage.setItem(scopedKey('xfactoryStationCompleted_3'), 'true');
          } catch {}
          return updated;
        });
      } catch {}
    })();
  }, [isLoading, user]);

  // Dashboard-level Idea Review state (popup without navigating)
  const [showIdeaReview, setShowIdeaReview] = useState(false);
  const [ideaReviewPage, setIdeaReviewPage] = useState(0);
  const [ideaReviewLoading, setIdeaReviewLoading] = useState(false);
  const [ideaReviewData, setIdeaReviewData] = useState<any|null>(null);
  const [elevatorLink, setElevatorLink] = useState("");
  const [elevatorSaved, setElevatorSaved] = useState(false);
  // Inline edit state for concept card (dashboard-level review modal)
  const [isEditingConcept, setIsEditingConcept] = useState(false);
  const [isPivotingConcept, setIsPivotingConcept] = useState(false);
  const [editableConcept, setEditableConcept] = useState<{ title: string; problem: string; solution: string; target_audience: string; current_solutions: string; business_model?: string; assumptions?: Array<{ text: string; confidence: number }> }>({
    title: "",
    problem: "",
    solution: "",
    target_audience: "",
    current_solutions: "",
  });

  const loadElevatorPitch = async () => {
    try {
      const { apiClient } = await import("@/lib/api");
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (teamId) {
        const res = await apiClient.getElevatorPitchSubmission(teamId);
        const d: any = res?.data || {};
        if (typeof d.google_drive_link === 'string') setElevatorLink(d.google_drive_link);
        setElevatorSaved(!!(d?.submitted || (typeof d?.google_drive_link === 'string' && d.google_drive_link.trim())));
      }
    } catch {
      try { const v = localStorage.getItem('xfactoryElevatorPitchLink'); if (v) { setElevatorLink(v); setElevatorSaved(true); } } catch {}
    }
  };

  const submitElevatorPitch = async () => {
    try {
      if (!elevatorLink?.trim()) return;
      const { apiClient } = await import("@/lib/api");
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id;
      if (teamId) {
        const res = await apiClient.submitElevatorPitch(teamId, elevatorLink.trim());
        if (res.status >= 200 && res.status < 300) {
          setElevatorSaved(true);
          try { localStorage.setItem('xfactoryElevatorPitchLink', elevatorLink.trim()); } catch {}
        }
      }
    } catch {
      try { localStorage.setItem('xfactoryElevatorPitchLink', elevatorLink.trim()); setElevatorSaved(true); } catch {}
    }
  };

  const loadIdeaReviewData = async () => {
    try {
      setIdeaReviewLoading(true);
      // Helper to resolve latest idea id for current team (read-only; no generation)
      const resolveTeamIdeaId = async (): Promise<{ teamId: number | null; ideaId: number | null; }> => {
        try {
          const { apiClient } = await import("@/lib/api");
          let teamIdStr = localStorage.getItem('xfactoryTeamId');
          if (!teamIdStr) {
            const status = await apiClient.get('/team-formation/status/');
            const tid = (status as any)?.data?.current_team?.id;
            if (!tid) return { teamId: null, ideaId: null };
            teamIdStr = String(tid);
            try { localStorage.setItem('xfactoryTeamId', teamIdStr); } catch {}
          }
          const teamId = Number(teamIdStr);
          // Try to fetch latest idea id for this team without generating
          try {
            const latest = await apiClient.getTeamLatestIdeaId(teamId);
            const ideaId = (latest as any)?.data?.id as number | undefined;
            if (ideaId) {
              const key = teamId ? `xfactoryIdeaId_${teamId}` : 'xfactoryIdeaId';
              try { localStorage.setItem(key, String(ideaId)); } catch {}
              return { teamId, ideaId };
            }
          } catch {}
          return { teamId, ideaId: null };
        } catch { return { teamId: null, ideaId: null }; }
      };

      let idStr = lsGetScoped('xfactoryIdeaId');
      let ideaId = idStr ? Number(idStr) : null;
      let teamId: number | null = null;
      // Always resolve teamId first
      try {
        const { apiClient } = await import("@/lib/api");
        const status = await apiClient.get('/team-formation/status/');
        teamId = (status as any)?.data?.current_team?.id || null;
      } catch (e) { 
        teamId = null; 
      }
      if (!ideaId) {
        const resolved = await resolveTeamIdeaId();
        // Keep resolved ideaId only for legacy fallbacks; teamId governs PST and team-scoped calls
        if (!teamId) teamId = resolved.teamId;
        ideaId = resolved.ideaId;
      }
      // Final fallback: try localStorage directly
      if (!teamId) {
        const lsTeamId = localStorage.getItem('xfactoryTeamId');
        if (lsTeamId) {
          teamId = Number(lsTeamId);
        }
      }
      
      if (!teamId) { 
        setIdeaReviewData({ aiIdea: null, brainstorm: null, card: null }); 
        return; 
      }
      const { apiClient } = await import("@/lib/api");
      
      // Build AI-idea-like view directly from Team PST
      let aiIdea: any = null;
      try {
        if (teamId) {
          const pstRes = await apiClient.getTeamProblemSolution(teamId);
          const d: any = pstRes?.data || {};
          aiIdea = {
            problem_statement: d.problem || d.input_problem || '',
            solution_overview: d.solution || d.input_solution || '',
            target_audience: d.target || d.input_target_audience || '',
            business_name: d.output_name || ''
          };
        }
      } catch (e) {
        console.error('[Index] Error loading PST:', e);
      }
      // Read-only team brainstorming (no generation fallback)
      let teamBsRes = teamId ? await apiClient.getTeamBrainstorming(teamId) : null;

      const bsData: any = teamBsRes?.data;
      const brainstorm = bsData ? {
        opportunity_statements: Array.isArray(bsData.opportunity_statements) ? bsData.opportunity_statements : [
          bsData?.opportunity_statement_1,
          bsData?.opportunity_statement_2,
          bsData?.opportunity_statement_3,
          bsData?.opportunity_statement_4,
          bsData?.opportunity_statement_5,
        ].filter(Boolean),
        user_problems: Array.isArray(bsData.user_problems) ? bsData.user_problems : [
          bsData?.user_problem_1,
          bsData?.user_problem_2,
          bsData?.user_problem_3,
          bsData?.user_problem_4,
          bsData?.user_problem_5,
        ].filter(Boolean),
      } : null;

      // Prefer team-scoped concept card (hydrate with PST/brainstorm fallbacks)
      let card: any = null;
      try {
        if (teamId) {
          let teamCardRes: any = await apiClient.getTeamConceptCard(teamId);
          const ok = teamCardRes && teamCardRes.status >= 200 && teamCardRes.status < 300 && !('error' in teamCardRes);
          if (!ok) {
            try { await apiClient.generateTeamConceptCard(teamId); } catch {}
            try { teamCardRes = await apiClient.getTeamConceptCard(teamId) as any; } catch {}
          }
          const tc: any = (teamCardRes && !('error' in teamCardRes)) ? (teamCardRes as any).data : null;
          
          if (tc) {
            // Always hydrate, even if tc has minimal data
            const assumptionsFromTc = Array.isArray(tc.assumptions) ? tc.assumptions : [];
            const assumptionsFromBrainstorm = Array.isArray(brainstorm?.opportunity_statements)
              ? brainstorm.opportunity_statements.slice(0, 3).map((a: any) => (typeof a === 'string' ? a : (a?.text || ''))).filter(Boolean)
              : [];
            
            // Use concept card assumptions if they exist and have content, otherwise use brainstorming
            const mergedAssumptionsRaw: any[] = assumptionsFromTc.length > 0 && assumptionsFromTc.some((a: any) => a && (a.text || '').toString().trim()) 
              ? assumptionsFromTc 
              : assumptionsFromBrainstorm;
            const mergedAssumptions = mergedAssumptionsRaw.map((a: any) => (typeof a === 'string' ? { text: a } : a)).filter((a: any) => a && (a.text || '').toString().trim());

            card = {
              ...tc,
              // Always ensure these fields exist, even if empty
              problem: (tc.problem || aiIdea?.problem_statement || '').toString(),
              solution: (tc.solution || aiIdea?.solution_overview || '').toString(),
              target_audience: (tc.target_audience || aiIdea?.target_audience || '').toString(),
              assumptions: mergedAssumptions,
              // Ensure title and summary exist
              title: tc.title || 'AI-powered startup concept',
              summary: tc.summary || tc.tagline || '',
              business_name: aiIdea?.business_name || tc.business_name || '',
            };
          } else if (aiIdea && (aiIdea.problem_statement || aiIdea.solution_overview || aiIdea.target_audience)) {
            // Build minimal hydrated card from PST if backend has not materialized one yet
            const assumptionsFromBrainstorm = Array.isArray(brainstorm?.opportunity_statements)
              ? brainstorm.opportunity_statements.slice(0, 3).map((a: any) => ({ text: typeof a === 'string' ? a : (a?.text || '') }))
              : [];
            card = {
              title: 'AI-powered startup concept',
              summary: '',
              problem: aiIdea.problem_statement || '',
              solution: aiIdea.solution_overview || '',
              target_audience: aiIdea.target_audience || '',
              assumptions: assumptionsFromBrainstorm,
              primary_persona: null,
              business_name: aiIdea?.business_name || '',
            };
          }
        }
      } catch (e) {
        console.error('[Index] Error loading concept card:', e);
      }

      // Final merge: ensure all required fields exist
      if (card) {
        const finalCard = {
          ...card,
          // Ensure all fields exist with fallbacks
          problem: card.problem || aiIdea?.problem_statement || 'Problem to be defined',
          solution: card.solution || aiIdea?.solution_overview || 'Solution approach to be defined',
          target_audience: card.target_audience || aiIdea?.target_audience || 'Target audience to be defined',
          title: card.title || 'AI-powered startup concept',
          summary: card.summary || card.tagline || '',
          business_name: card.business_name || aiIdea?.business_name || '',
          business_model: card.business_model || '',
          // Ensure assumptions array exists
          assumptions: Array.isArray(card.assumptions) && card.assumptions.length > 0 
            ? card.assumptions 
            : (Array.isArray(brainstorm?.opportunity_statements)
                ? brainstorm.opportunity_statements.slice(0, 3).map((a: any) => ({ text: typeof a === 'string' ? a : (a?.text || '') }))
                : [])
        };
        card = finalCard;
      }
      
      setIdeaReviewData({ aiIdea, brainstorm, card });
      // Persist title for header if available
      try { if ((card as any)?.title) localStorage.setItem(scopedKey('xfactoryConceptTitle'), (card as any).title); } catch {}
    } catch (e) {
      console.error('[Index] Error in loadIdeaReviewData:', e);
      // Keep minimal data structure to avoid flashing "No idea data found" when backends return 200
      setIdeaReviewData({ aiIdea: null, brainstorm: null, card: null });
    } finally {
      setIdeaReviewLoading(false);
    }
  };

  // Initialize editable concept when data loads
  useEffect(() => {
    if (ideaReviewData?.card) {
      const assumptions = Array.isArray(ideaReviewData.card.assumptions) 
        ? ideaReviewData.card.assumptions.slice(0, 3).map((a: any) => ({
            text: typeof a === 'string' ? a : (a?.text || ''),
            confidence: typeof a === 'object' && typeof a?.confidence === 'number' ? a.confidence : 75
          }))
        : [];
      setEditableConcept({
        title: ideaReviewData.card.title || "",
        problem: ideaReviewData.card.problem || "",
        solution: ideaReviewData.card.solution || "",
        target_audience: ideaReviewData.card.target_audience || "",
        current_solutions: ideaReviewData.card.current_solutions || "",
        business_model: (ideaReviewData.card as any).business_model || "",
        assumptions: assumptions,
      });
    }
  }, [ideaReviewData]);

  // Save edits to concept card
  const saveConceptChanges = async () => {
    try {
      // Optimistically update local review data
      setIdeaReviewData(prev => prev ? ({
        ...prev,
        card: {
          ...(prev.card || {}),
          title: editableConcept.title,
          problem: editableConcept.problem,
          solution: editableConcept.solution,
          target_audience: editableConcept.target_audience,
          current_solutions: editableConcept.current_solutions,
          business_model: editableConcept.business_model,
          assumptions: editableConcept.assumptions || prev.card?.assumptions || [],
        }
      }) : prev);

      // Persist via existing team concept card endpoint
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (teamId) {
        const { apiClient } = await import("@/lib/api");
        await apiClient.generateTeamConceptCard(teamId);
      }
      setIsEditingConcept(false);
    } catch {}
  };

  const handlePivotConcept = async () => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (teamId) {
        const { apiClient } = await import("@/lib/api");
        
        // Close the dialogs first
        setShowIdeaReview(false);
        setIsPivotingConcept(false);
        
        // Clear the existing idea card data to force a fresh start
        setStationData(prev => ({
          ...prev,
          ideaCard: null,
          onboardingData: null,
        }));
        
        // Clear brainstorming data in the backend to force fresh generation
        try {
          await apiClient.delete(`/ideation/teams/${teamId}/brainstorming/`);
        } catch {}
        
        // Clear the completion flag in localStorage to allow re-entering onboarding
        try {
          localStorage.removeItem(scopedKey('xfactoryIdeaCompleted'));
          // Also clear any cached brainstorming data
          localStorage.removeItem('xfactoryBrainstorming');
        } catch {}
        
        // Navigate back to the onboarding flow (same flow as after team formation)
        // The key will force a fresh remount with empty state
        setStationData(prev => ({
          ...prev,
          _pivotReset: Date.now(),
        }));
        setAppState('onboarding');
      }
    } catch {}
  };

  const exportConceptCardAsImage = async () => {
    try {
      const conceptCardElement = document.getElementById('concept-card-export');
      if (!conceptCardElement) {
        toast({
          title: "Export Error",
          description: "Could not find concept card to export",
          variant: "destructive"
        });
        return;
      }

      const canvas = await html2canvas(conceptCardElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `concept-card-${ideaReviewData?.card?.title?.replace(/[^a-z0-9]/gi, '-') || 'startup'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Export Successful",
            description: "Concept card saved as image"
          });
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Error",
        description: "Failed to export concept card as image",
        variant: "destructive"
      });
    }
  };

  const isIdeaCompleted = (u?: any) => {
    if (u?.progress?.sections_completed && u.progress.sections_completed.length > 0) return true;
    try { return lsGetScoped('xfactoryIdeaCompleted') === 'true'; } catch { return false; }
  };

  // Check for existing authentication on app load - simplified to avoid UX conflicts
  useEffect(() => {
    if (!isLoading && user) {
      // Ensure team id is stored for scoping
      (async () => {
        try {
          const { apiClient } = await import("@/lib/api");
          const status = await apiClient.get('/team-formation/status/');
          const teamId = (status as any)?.data?.current_team?.id;
          if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
        } catch {}
      })();
      if (isIdeaCompleted(user)) {
        setUserData({
          hasIdea: true,
          businessType: (user.business_type as BusinessType) || null,
          ideaSummary: user.idea_summary || "",
        });
        setAppState("dashboard");
      }
    }
  }, [user, isLoading]);

  // Guard: if entering onboarding without a team, redirect to team formation, unless idea is completed
  useEffect(() => {
    const ensureTeamBeforeOnboarding = async () => {
      if (appState !== "onboarding" || isLoading || !user) return;
      if (isIdeaCompleted(user)) {
        setAppState("dashboard");
        return;
      }
      try {
        const { apiClient } = await import("@/lib/api");
        const res = await apiClient.request('/team-formation/status/');
        if (res.data && !res.data.current_team) {
          console.log('Guard: No team found. Redirecting to team formation (account-creation).');
          setAppState("account-creation");
        }
      } catch (e) {
        console.error('Guard check failed; sending to team formation as fallback', e);
        setAppState("account-creation");
      }
    };
    ensureTeamBeforeOnboarding();
  }, [appState, user, isLoading]);

  const handleStartJourney = async () => {
    try {
      if (user) {
        // Always log out cached user so they start fresh
        logout();
      }
    } finally {
      setAppState("account-creation");
    }
  };

  const handleB2BConfig = () => {
    setAppState("admin-login");
  };

  const handleAdminLogin = () => {
    setAppState("admin-dashboard");
  };

  const handleAdminLogout = () => {
    setAppState("landing");
  };

  const handleMentorSignup = () => {
    setAppState("mentor-signup");
  };

  const handleInvestorSignup = () => {
    setAppState("investor-signup");
  };


  const handleLogin = () => {
    setAppState("user-login");
  };

  const handleAccountCreationFromLanding = async () => {
    try {
      if (user) {
        // Log out cached user to start a clean account creation
        logout();
      }
    } finally {
      setAppState("account-creation");
    }
  };

  const handleUserLogin = async (loginData: any) => {
    console.log('Index - handleUserLogin called with:', loginData);

    try {
      // Check if user is a mentor first
      const { apiClient } = await import("@/lib/api");
      const loggedInEmail = loginData?.user?.email || user?.email;
      
      if (loggedInEmail) {
        try {
          const mentorResponse = await apiClient.getMentorProfile(loggedInEmail);
          if (mentorResponse.status >= 200 && mentorResponse.status < 300 && mentorResponse.data?.mentor) {
            // User is a mentor, redirect to mentor dashboard
            setMentorData(mentorResponse.data.mentor);
            setAppState("mentor-dashboard");
            return;
          }
        } catch (error) {
          // User is not a mentor, continue with normal flow
          console.log('User is not a mentor, continuing with normal flow');
        }
      }

      // If user has already completed idea generation/onboarding, go straight to dashboard
      let hasCompleted = isIdeaCompleted(loginData);
      if (hasCompleted) {
        setUserData({
          hasIdea: true,
          businessType: (loginData.business_type as BusinessType) || null,
          ideaSummary: loginData.idea_summary || "",
        });
        // Resolve and persist current team for scoping
        try {
          const status = await apiClient.get('/team-formation/status/');
          const teamId = (status as any)?.data?.current_team?.id;
          if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
        } catch {}
        setAppState("dashboard");
        return;
      }

      const teamStatusResponse = await apiClient.request('/team-formation/status/');
      console.log('Index - Team status response:', teamStatusResponse.status);

      const statusData = teamStatusResponse.data;

      if (statusData && !statusData.current_team) {
        console.log('Index - User has no team, going to account creation for team formation');
        setAppState("account-creation");
        return;
      }

      if (statusData && statusData.current_team) {
        const team = statusData.current_team;
        const sections = loginData?.progress?.sections_completed || loginData?.user?.progress?.sections_completed || [];

        // Check if team formation is complete (deadline passed or team is full)
        const now = new Date();
        const formationDeadline = team.formation_deadline ? new Date(team.formation_deadline) : null;
        const isFormationComplete = formationDeadline ? now > formationDeadline : team.current_member_count >= team.max_members;

        // If team formation is not complete, go to team formation dashboard
        if (!isFormationComplete) {
          setTeamData(team);
          setAppState("member-addition");
          return;
        }

        // If ideation already completed for the user, go to dashboard
        if (sections.length > 0) {
          setUserData({
            hasIdea: true,
            businessType: (loginData.user?.business_type as BusinessType) || null,
            ideaSummary: loginData.user?.idea_summary || "",
          });
          setAppState("dashboard");
          return;
        }

        // Always check team concept card when logging in with a team
        try {
          const { apiClient } = await import("@/lib/api");
          const teamId = team?.id;
          if (teamId) {
            try {
              const cardRes: any = await apiClient.getTeamConceptCard(teamId);
              const statusCode = cardRes?.status;
              if (statusCode === 404) {
                // No concept card yet → send to step 1 of onboarding
                setStationData(prev => ({ ...prev, ideaCard: undefined, onboardingInitialStep: 1 }));
                setAppState("onboarding");
                return;
              }
              if (statusCode >= 200 && statusCode < 300) {
                // Save the card and jump to step 4
                let cardData = (cardRes as any)?.data;
                const hasMeaningfulCard = !!(cardData && (cardData.title || cardData.summary || cardData.primary_persona));
                if (!hasMeaningfulCard) {
                  try { await apiClient.generateTeamConceptCard(teamId); } catch {}
                  try {
                    const retry: any = await apiClient.getTeamConceptCard(teamId);
                    if (retry?.status >= 200 && retry.status < 300) cardData = retry.data;
                  } catch {}
                }
                setStationData(prev => ({ ...prev, ideaCard: cardData || {}, onboardingInitialStep: 4 }));
                setAppState("onboarding");
                return;
              }
              // Unknown status → default to onboarding step 1
              setStationData(prev => ({ ...prev, ideaCard: undefined, onboardingInitialStep: 1 }));
              setAppState("onboarding");
              return;
            } catch (e: any) {
              const sc = e?.response?.status || e?.status;
              if (sc === 404) {
                setStationData(prev => ({ ...prev, ideaCard: undefined, onboardingInitialStep: 1 }));
                setAppState("onboarding");
                return;
              }
              setStationData(prev => ({ ...prev, ideaCard: undefined, onboardingInitialStep: 1 }));
              setAppState("onboarding");
              return;
            }
          }
        } catch {}

        // Fallback: onboarding step 1
        setStationData(prev => ({ ...prev, ideaCard: undefined, onboardingInitialStep: 1 }));
        setAppState("onboarding");
        return;
      }

      // Fallback if no data
      {
        const sections = loginData?.progress?.sections_completed || loginData?.user?.progress?.sections_completed || [];
        if (sections.length > 0) {
          setUserData({
            hasIdea: true,
            businessType: (loginData.user.business_type as BusinessType) || null,
            ideaSummary: loginData.user.idea_summary || "",
          });
          setAppState("dashboard");
        } else {
          setAppState("account-creation");
        }
      }
    } catch (error) {
      console.error('Index - Error checking team status:', error);
      // Fallback to account creation or dashboard depending on progress
      if (isIdeaCompleted(loginData?.user)) {
        setUserData({
          hasIdea: true,
          businessType: (loginData.user.business_type as BusinessType) || null,
          ideaSummary: loginData.user.idea_summary || "",
        });
        setAppState("dashboard");
      } else {
        setAppState("account-creation");
      }
    }
  };

  const handleMentorComplete = async (data: any) => {
    try {
      const { apiClient } = await import("@/lib/api");
      const res = await apiClient.mentorRegister({
        name: data?.name,
        email: data?.email,
        password: data?.password,
        photo: data?.photo,
        expertise: data?.expertise,
        experience: data?.experience,
        background: data?.background,
        company: data?.company,
        position: data?.position,
        yearsExperience: data?.yearsExperience,
        successfulLaunches: data?.successfulLaunches,
        menteeCount: data?.menteeCount,
        industries: data?.industries || [],
        skills: data?.skills || [],
        availability: data?.availability,
        hourlyRate: data?.hourlyRate,
        linkedinUrl: data?.linkedinUrl,
        portfolioUrl: data?.portfolioUrl,
        calendlyUrl: data?.calendlyUrl,
      });
      if (res.status >= 200 && res.status < 300) {
        // After registration, prompt team selection if none
        const myTeams = await apiClient.get('/mentorship/my-teams/');
        const items = (myTeams as any)?.data?.items || [];
        setAppState(items.length === 0 ? "mentor-team-select" : "mentor-dashboard");
        setMentorData(res.data?.mentor || data);
      } else {
        alert(res.error || res.data?.error || "Mentor registration failed. If you are not licensed by an admin, you cannot register.");
      }
    } catch (e: any) {
      alert(e?.message || "Mentor registration failed");
    }
  };

  const handleInvestorComplete = (data: any) => {
    console.log("Investor account created:", data);
    setInvestorData(data);
    setAppState("investor-dashboard");
  };


  const handleAccountComplete = (accountData: any) => {
    console.log("Account created:", accountData);
    
    // Check if team was created - redirect to member addition screen
    if (accountData.teamChoice === "create" && accountData.teamData) {
      setTeamData(accountData.teamData);
      setAppState("member-addition");
      return;
    }
    
    // If joined a team, go to onboarding
    if (accountData.teamChoice === "join") {
      setAppState("onboarding");
      return;
    }

    // Check if invitation was accepted - redirect to member addition screen for that team
    if (accountData.action === 'accepted_invitation' && accountData.teamId) {
      // Load team data and redirect to member addition screen
      (async () => {
        try {
          const { apiClient } = await import("@/lib/api");
          const status = await apiClient.get('/team-formation/status/');
          const team = status.data?.current_team;
          if (team) {
            setTeamData(team);
            setAppState("member-addition");
          } else {
            // Fallback: go to account creation
            setAppState("account-creation");
          }
        } catch (error) {
          console.error('Failed to load team data:', error);
          setAppState("account-creation");
        }
      })();
      return;
    }

    // Fallback: go to account creation to choose team action
    setAppState("account-creation");
  };

  const handleOnboardingComplete = async (data: UserData) => {
    setUserData(data);
    
    // Mark the ideation section as completed in the backend
    try {
      const { apiClient } = await import("@/lib/api");
      const response = await apiClient.post('/auth/mark-completed/', {
        section: 'ideation'
      });
      console.log('Ideation section marked as completed');
      
      // Update the user's progress locally to reflect the completion
      if (user && response.data?.progress) {
        // Update the user object with the new progress
        user.progress = response.data.progress;
        
        // Also update localStorage to ensure the completion is recognized
        try {
          localStorage.setItem(scopedKey('xfactoryIdeaCompleted'), 'true');
        } catch {}
      }
    } catch (error) {
      console.error('Failed to mark ideation as completed:', error);
      
      // Even if backend fails, mark as completed locally to ensure user can proceed
      try {
        localStorage.setItem(scopedKey('xfactoryIdeaCompleted'), 'true');
      } catch {}
    }
    
    // After onboarding, go directly to the factory dashboard
    setAppState("dashboard");
  };

  const handleBackToLanding = () => {
    // Ensure any pending team id is persisted before leaving flows
    (async () => {
      try {
        const { apiClient } = await import("@/lib/api");
        const status = await apiClient.get('/team-formation/status/');
        const teamId = (status as any)?.data?.current_team?.id;
        if (teamId) { try { localStorage.setItem('xfactoryTeamId', String(teamId)); } catch {} }
      } catch {}
    })();
    setAppState("landing");
  };

  const handleMemberAdditionComplete = () => {
    // After member addition deadline, proceed to idea generation (onboarding)
    if (isIdeaCompleted(user)) {
      setAppState("dashboard");
    } else {
      setAppState("onboarding");
    }
  };

  const handleBackFromMemberAddition = () => {
    // Go back to account creation
    if (isIdeaCompleted(user)) {
      setAppState("dashboard");
    } else {
      setAppState("account-creation");
    }
  };

  const handleEnterStation = async (stationId: number, reviewMode = false) => {
    // If dashboard Review is clicked for Station 1, open popup here without navigating
    if (stationId === 1 && reviewMode) {
      await loadIdeaReviewData();
      await loadElevatorPitch(); // Ensure elevator pitch is loaded
      setShowIdeaReview(true);
      return;
    }

    // Special handling for Station 2: ensure ideaCard exists before rendering
    if (stationId === 2) {
      const placeholderIdeaCard: any = {
        productType: (userData?.businessType as any) || 'App',
        title: (() => { try { return lsGetScoped('xfactoryConceptTitle') || 'Concept'; } catch { return 'Concept'; } })(),
      };
              setStationData(prev => {
          const updated = { ...prev, currentStation: 2, reviewMode, ideaCard: prev.ideaCard || placeholderIdeaCard, mockups: undefined };
          try { localStorage.setItem(scopedKey('xfactoryCurrentStation'), '2'); } catch {}
          return updated;
        });
        setAppState("station");
        return;
    }

    // Ensure Station 4 (Investor Pitch Deck Generation) initializes with a placeholder ideaCard
    if (stationId === 4) {
      const placeholderIdeaCard: any = {
        productType: (userData?.businessType as any) || 'App',
        title: (() => { try { return lsGetScoped('xfactoryConceptTitle') || 'Concept'; } catch { return 'Concept'; } })(),
      };
      setStationData(prev => {
        const updated = { ...prev, currentStation: 4, reviewMode, ideaCard: prev.ideaCard || placeholderIdeaCard };
        try { localStorage.setItem(scopedKey('xfactoryCurrentStation'), '4'); } catch {}
          return updated;
        });
        setAppState("station");
        return;
    }

    // Force allow navigating to Validation Engine (3) even if ideaCard/mockups are missing
    if (stationId === 3) {
      // Load quantitative score when entering validation station
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (teamId) {
          // Pre-load quantitative score to trigger validation complete window if all scores exist
          const quantScore = await apiClient.getQuantitativeScoreTeam(teamId);
          
          // Only proceed if we got a valid score (not 404)
          const score = (quantScore as any)?.data?.score || (quantScore as any)?.score || null;
          if (score && typeof score.final_score_50 === 'number') {
          } else {
          }
        }
      } catch (e: any) {
        // Handle 404 specifically - don't mark as done if quantitative score doesn't exist
        if (e?.status === 404 || e?.response?.status === 404) {
        }
      }
      
      setStationData(prev => {
        const updated = { ...prev, currentStation: 3, reviewMode };
        try { localStorage.setItem(scopedKey('xfactoryCurrentStation'), '3'); } catch {}
        return updated;
      });
      setAppState("station");
      return;
    }

    // Always navigate to the station otherwise
    setStationData(prev => {
      const updated = { ...prev, currentStation: stationId, reviewMode };
      try { localStorage.setItem(scopedKey('xfactoryCurrentStation'), String(stationId)); } catch {}
      return updated;
    });
    setAppState("station");
  };

  const handleBackToDashboard = () => {
    setAppState("dashboard");
  };


  const handleStationComplete = (stationId: number, data: any) => {
    setStationData(prev => {
      const newData = { ...prev, reviewMode: false }; // Clear review mode when completing
      
      // Store station-specific data
      if (stationId === 1) {
        newData.ideaCard = data;
      } else if (stationId === 2) {
        newData.mockups = data;
      } else if (stationId === 3) {
        newData.validationData = data;
      } else if (stationId === 4) {
        newData.pitchData = data;
      } else if (stationId === 5) {
        newData.prototypeData = data; // Pre-MVP Mentorship data
      } else if (stationId === 6) {
        newData.mvpData = data;
      } else if (stationId === 7) {
        newData.testingData = data; // Post-MVP Mentorship data
      } else if (stationId === 8) {
        newData.launchData = data; // Launch Prep data
      } else if (stationId === 9) {
        newData.scalingData = data; // Launch Execution data
      } else if (stationId === 10) {
        newData.monitoringData = data; // Post-Launch Performance data
      } else if (stationId === 11) {
        newData.iterationData = data; // Pitch Practice data
      } else if (stationId === 12) {
        newData.marketingData = data;
      } else if (stationId === 13) {
        newData.legalData = data;
      } else if (stationId === 14) {
        newData.financialData = data;
      } else if (stationId === 15) {
        newData.investorData = data;
      }
      
      // Mark station as completed - don't auto-advance for workshop stations
      if (!prev.completedStations.includes(stationId)) {
        newData.completedStations = [...prev.completedStations, stationId];
      }
      
      // Persist completion per idea
      try {
        const ideaIdStr = lsGetScoped('xfactoryIdeaId');
        if (ideaIdStr) {
          const key = scopedKey('xfactoryCompletedStations');
          const merged = newData.completedStations;
          localStorage.setItem(key, JSON.stringify(merged));
        }
      } catch {}
      
      // NO AUTO-ADVANCE: Users stay on current step after completion
      // The step is marked as completed and unlocks the next step,
      // but the user must manually choose to proceed to the next step
      // This gives users control over their progression and allows them
      // to review their work before moving on
      
      return newData;
    });
    
    // Persist high-level section completion to backend for cross-device sync
    (async () => {
      try {
        const { apiClient } = await import("@/lib/api");
        // Map station to section
        const map: Record<number, string> = {
          1: 'ideation',
          3: 'validation',
          4: 'pitch_deck',
          6: 'mvp',
          7: 'testing',
          12: 'marketing',
          13: 'finance',
          14: 'legal',
          8: 'prelaunch',
        };
        const section = map[stationId];
        if (section === 'mvp' && !isPreMvpMentorshipDone) {
          // Don’t mark MVP without pre‑MVP
        } else if (section) {
          await apiClient.markSectionCompleted(section);
        }
        // When Pitch Deck station (4) completes, update team roadmap completion snapshot
        if (stationId === 4) {
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id;
            if (teamId) {
              // Check if there's a pitch deck submission
              const submission = await apiClient.getPitchDeckSubmissionTeam(teamId);
              const hasSubmission = submission?.status >= 200 && submission.status < 300;
              
              await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, { 
                pitch_deck: { 
                  slides_generated: true,
                  submission_completed: hasSubmission
                } 
              });
            }
          } catch {}
        }
        // Save mentorship gates when mentorship sessions complete
        if (stationId === 5) {
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id;
            if (teamId) await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, { mentorship: { pre_mvp_completed: true, notes: (data?.sessionNotes || ''), action_items: (data?.actionItems || ''), feedback: (data?.feedback || ''), completed_at: (data?.completedAt || new Date().toISOString()) } });
          } catch {}
        }
        if (stationId === 7) {
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id;
            if (teamId) await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, { mentorship: { post_mvp_completed: true, notes: (data?.sessionNotes || ''), action_items: (data?.actionItems || ''), feedback: (data?.feedback || ''), completed_at: (data?.completedAt || new Date().toISOString()) } });
          } catch {}
        }
        // For station 2 ensure mockup completion reflected in TRC as well
        if (stationId === 2) {
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id;
            if (teamId) await apiClient.markMockupCompleted(teamId);
          } catch {}
        }
        // For station 13 (Finance Workshop) ensure completion is reflected in TRC
        if (stationId === 13) {
          try {
            const status = await apiClient.get('/team-formation/status/');
            const teamId = (status as any)?.data?.current_team?.id;
            if (teamId) await apiClient.markFinanceWorkshopCompleted(teamId);
          } catch {}
        }
        

      } catch {}
    })();
    
    // NO AUTO-NAVIGATION: Always return to dashboard after completion
    // Users can manually choose to enter the next station from the dashboard
    // This gives users control over their progression and allows them
    // to review their work before moving on
    if (stationId === 15) {
      setAppState("completion");
    } else {
      setAppState("dashboard");
    }
  };

  // Gating helpers
  const isPitchDeckDone = !!(trcSnapshot?.pitch_deck?.slides_generated || trcSnapshot?.pitch_deck?.practice_completed || trcSnapshot?.pitch_deck?.mentor_deck_generated || trcSnapshot?.pitch_deck?.investor_deck_generated || trcSnapshot?.pitch_deck?.submission_completed);
  const isPreMvpMentorshipDone = !!(trcSnapshot?.mentorship?.pre_mvp_completed);
  const isMvpDone = !!(trcSnapshot?.mvp?.task_plan_generated || trcSnapshot?.mvp?.prototype_built);

  const canEnterPreMvp = isPitchDeckDone; // station 5
  const canEnterMvp = isPitchDeckDone && isPreMvpMentorshipDone; // station 6
  const canEnterPostMvpMentorship = true; // Always allow post-MVP mentorship if user navigates back

  if (appState === "landing") {
    return (
      <div>
        <FactoryLanding 
          onStartJourney={handleStartJourney} 
          onB2BConfig={handleB2BConfig}
          onMentorSignup={handleMentorSignup}
          onInvestorSignup={handleInvestorSignup}
          onLogin={handleLogin}
          onAccountCreation={handleAccountCreationFromLanding}
          onHome={() => { if (user) { logout(); } setAppState("landing"); }}
        />
      </div>
    );
  }

  if (appState === "admin-login") {
  return <AdminLoginFlow onLogin={handleAdminLogin} onBack={handleBackToLanding} />;
}

  if (appState === "user-login") {
    return <UserLoginFlow onLogin={handleUserLogin} onBack={handleBackToLanding} />;
  }

  if (appState === "admin-dashboard") {
    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

  if (appState === "account-creation") {
    return (
      <div>
        <AccountCreationFlow onComplete={handleAccountComplete} onBack={handleBackToLanding} forceNewAccount={!user} />
      </div>
    );
  }

  if (appState === "member-addition" && teamData) {
    return (
      <MemberAdditionScreen 
        teamData={teamData} 
        onComplete={handleMemberAdditionComplete}
        onBack={teamData?.fromDashboard ? () => setAppState("dashboard") : handleBackFromMemberAddition}
        fromDashboard={teamData?.fromDashboard || false}
      />
    );
  }

  if (appState === "mentor-signup") {
    return <MentorAccountCreation onComplete={handleMentorComplete} onBack={handleBackToLanding} />;
  }

  if (appState === "investor-signup") {
    return <InvestorAccountCreation onComplete={handleInvestorComplete} onBack={handleBackToLanding} />;
  }

  if (appState === "mentor-dashboard") {
    return <MentorDashboard onBack={handleBackToLanding} mentorData={mentorData} />;
  }

  if (appState === "investor-dashboard") {
    return <InvestorDashboard onBack={handleBackToLanding} investorData={investorData} />;
  }

  if (appState === "onboarding") {
    const onboardingBackHandler = isIdeaCompleted(user) ? handleBackToDashboard : handleBackToLanding;
    return (
      <div>
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onBack={onboardingBackHandler}
          // Force remount when we gain concept card data so initialStep applies or when pivoting
          key={stationData?._pivotReset ? `onboarding-pivot-${stationData._pivotReset}` : (stationData?.ideaCard ? 'onboarding-with-card' : 'onboarding-default')}
        />
      </div>
    );
  }

  if (appState === "community" && userData) {
    return (
      <FactoryCommunity 
        onGoBack={handleBackToDashboard}
      />
    );
  }

  if (appState === "dashboard" && userData) {
    return (
      <div>
        <FactoryDashboard 
          userData={userData} 
          stationData={stationData}
          onEnterStation={handleEnterStation}
          onGoHome={handleBackToLanding}
          onEnterCommunity={() => setAppState("community")}
          onEnterTeamFormation={() => {
            // Load team data and navigate to team formation
            (async () => {
              try {
                const { apiClient } = await import("@/lib/api");
                const status = await apiClient.get('/team-formation/status/');
                const team = status.data?.current_team;
                if (team) {
                  setTeamData({ ...team, fromDashboard: true }); // Mark as coming from dashboard
                  setAppState("member-addition");
                }
              } catch (error) {
                console.error('Failed to load team data:', error);
              }
            })();
          }}
        />

        {/* Idea Review Modal (dashboard-level, Station 1) */}
        <Dialog modal={false} open={showIdeaReview} onOpenChange={(open) => { 
          setShowIdeaReview(open); 
          if (open) { 
            try { loadElevatorPitch(); } catch {} 
          } else { 
            setIdeaReviewPage(0);
            // Force refresh of ProductionLineFlow by updating a dummy state
            setTimeout(() => {
              console.log('🔄 Forcing ProductionLineFlow refresh after dialog close');
              // This will trigger a re-render of the ProductionLineFlow component
              setStationData(prev => ({ ...prev, _refresh: Date.now() }));
            }, 100);
          }
        }}>
          {/* Custom backdrop to restore the shade */}
          {showIdeaReview && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowIdeaReview(false)}
            />
          )}
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto z-50 relative fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between w-full">
                <span>Idea Review</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{ideaReviewPage + 1} / 2</span>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            {ideaReviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading review data...</p>
                </div>
              </div>
            ) : !ideaReviewData ? (
              <div className="p-6 text-sm text-destructive">No idea data found.</div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const pages = [
                    {
                      key: 'card',
                      render: () => (
                        <>
                        <div id="concept-card-export" className="space-y-8">
                          <div className="text-center">
                            {ideaReviewData?.card?.business_name && (
                              <div className="mb-3">
                                <h2 className="text-2xl font-bold text-slate-800">{ideaReviewData.card.business_name}</h2>
                                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-2 rounded"></div>
                              </div>
                            )}
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white font-semibold text-lg shadow-lg">
                              {isEditingConcept ? (
                                <input
                                  value={editableConcept.title}
                                  onChange={(e) => setEditableConcept(prev => ({ ...prev, title: e.target.value }))}
                                  className="px-2 py-1 rounded bg-white/20 placeholder:text-white/70 text-white text-base focus:outline-none"
                                  placeholder="Concept title"
                                />
                              ) : (
                                <span>{ideaReviewData?.card?.title || 'AI-powered startup concept'}</span>
                              )}
                              <div className="flex gap-2 ml-2">
                                <Button variant="secondary" size="sm" onClick={() => setIsEditingConcept(v => !v)}>
                                  {isEditingConcept ? 'Cancel' : 'Edit'}
                                </Button>
                                <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-50" onClick={() => setIsPivotingConcept(true)}>
                                  Pivot
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div className="group">
                                <h4 className="text-lg font-bold text-slate-700 mb-3">🎯 The Problem</h4>
                                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  {isEditingConcept ? (
                                    <textarea
                                      value={editableConcept.problem}
                                      onChange={(e) => setEditableConcept(prev => ({ ...prev, problem: e.target.value }))}
                                      className="w-full px-3 py-2 rounded border bg-white text-slate-700 resize-none"
                                      rows={3}
                                      placeholder="Describe the core problem"
                                    />
                                  ) : (
                                    <p className="text-slate-700 leading-relaxed">{ideaReviewData?.card?.problem || 'Problem to be defined based on AI analysis'}</p>
                                  )}
                                </div>
                              </div>
                              <div className="group">
                                <h4 className="text-lg font-bold text-slate-700 mb-3">👥 Target Audience</h4>
                                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  {isEditingConcept ? (
                                    <textarea
                                      value={editableConcept.target_audience}
                                      onChange={(e) => setEditableConcept(prev => ({ ...prev, target_audience: e.target.value }))}
                                      className="w-full px-3 py-2 rounded border bg-white text-slate-700 resize-none"
                                      rows={3}
                                      placeholder="Describe your target users/audience"
                                    />
                                  ) : (
                                    <p className="text-slate-700 leading-relaxed">{ideaReviewData?.card?.target_audience || 'Target audience based on AI analysis'}</p>
                                  )}
                          </div>
                        </div>
                      </div>
                      <div className="group">
                        <h4 className="text-lg font-bold text-slate-700 mb-3">💵 Business Model</h4>
                        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                          {isEditingConcept ? (
                            <textarea
                              value={editableConcept.business_model || ''}
                              onChange={(e) => setEditableConcept(prev => ({ ...prev, business_model: e.target.value }))}
                              className="w-full px-3 py-2 rounded border bg-white text-slate-700 resize-none"
                              rows={3}
                              placeholder="How this makes money, key costs, and growth path"
                            />
                          ) : (
                            <p className="text-slate-700 leading-relaxed">{(ideaReviewData?.card as any)?.business_model || 'How this makes money, key costs, and growth path'}</p>
                          )}
                        </div>
                      </div>
                            <div className="space-y-6">
                              <div className="group">
                                <h4 className="text-lg font-bold text-slate-700 mb-3">💡 The Solution</h4>
                                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  {isEditingConcept ? (
                                    <textarea
                                      value={editableConcept.solution}
                                      onChange={(e) => setEditableConcept(prev => ({ ...prev, solution: e.target.value }))}
                                      className="w-full px-3 py-2 rounded border bg-white text-slate-700 resize-none"
                                      rows={3}
                                      placeholder="Describe your solution"
                                    />
                                  ) : (
                                    <p className="text-slate-700 leading-relaxed">{ideaReviewData?.card?.solution || 'Solution approach based on AI insights'}</p>
                                  )}
                                </div>
                              </div>
                              <div className="group">
                                <h4 className="text-lg font-bold text-slate-700 mb-3">⚠️ Current Solutions</h4>
                                <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  {isEditingConcept ? (
                                    <textarea
                                      value={editableConcept.current_solutions}
                                      onChange={(e) => setEditableConcept(prev => ({ ...prev, current_solutions: e.target.value }))}
                                      className="w-full px-3 py-2 rounded border bg-white text-slate-700 resize-none"
                                      rows={3}
                                      placeholder="Describe current/competing solutions"
                                    />
                                  ) : (
                                    <p className="text-slate-700 leading-relaxed">{ideaReviewData?.card?.current_solutions || 'Market solutions identified by AI analysis'}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Assumptions */}
                        {ideaReviewData?.card?.assumptions && Array.isArray(ideaReviewData.card.assumptions) && ideaReviewData.card.assumptions.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-lg font-bold text-slate-700">🔬 Key Assumptions</h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              {(isEditingConcept ? (editableConcept.assumptions || []) : ideaReviewData.card.assumptions.slice(0,3)).map((a: any, idx: number) => (
                                <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                  <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      {isEditingConcept ? (
                                        <>
                                          <textarea
                                            value={a.text || ''}
                                            onChange={(e) => {
                                              const newAssumptions = [...(editableConcept.assumptions || [])];
                                              newAssumptions[idx] = { ...newAssumptions[idx], text: e.target.value };
                                              setEditableConcept({ ...editableConcept, assumptions: newAssumptions });
                                            }}
                                            className="w-full px-3 py-2 rounded border bg-white text-slate-700 resize-none"
                                            rows={2}
                                            placeholder="Enter assumption"
                                          />
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-600">Confidence:</span>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={a.confidence || 75}
                                              onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 0 && val <= 100) {
                                                  const newAssumptions = [...(editableConcept.assumptions || [])];
                                                  newAssumptions[idx] = { ...newAssumptions[idx], confidence: val };
                                                  setEditableConcept({ ...editableConcept, assumptions: newAssumptions });
                                                }
                                              }}
                                              className="w-20 px-2 py-1 rounded border bg-white text-slate-700 text-sm"
                                              placeholder="75"
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-slate-700 font-medium mb-2">{typeof a === 'string' ? a : (a?.text || '')}</p>
                                          <div className="flex items-center gap-4 text-sm">
                                            {typeof a !== 'string' && typeof a?.confidence === 'number' && (
                                              <span className="inline-flex items-center gap-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                {a.confidence}% confidence
                                              </span>
                                            )}
                                            {typeof a !== 'string' && (a?.testing_plan) && (
                                              <span className="text-slate-500">{a.testing_plan}</span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isEditingConcept && (
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsEditingConcept(false)}>Cancel</Button>
                            <Button onClick={saveConceptChanges}>Save Changes</Button>
                          </div>
                        )}
                        </>
                      )
                    },
                    {
                      key: 'pitch',
                      render: () => (
                        <div className="space-y-4">
                          <h4 className="font-semibold mb-2">Elevator Pitch</h4>
                          {elevatorSaved && elevatorLink?.trim() ? (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm truncate">{elevatorLink}</div>
                                <div className="flex gap-2">
                                  <Button variant="secondary" onClick={() => { try { window.open(elevatorLink, '_blank'); } catch {} }}>Open</Button>
                                  <Button variant="outline" onClick={loadElevatorPitch}>Refresh</Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">Paste your Google Drive link to the 60–90s elevator pitch video (or slides with voiceover). Ensure the link is public.</p>
                              <div className="flex flex-col md:flex-row gap-2">
                                <input type="url" placeholder="https://drive.google.com/..." value={elevatorLink} onChange={(e) => setElevatorLink(e.target.value)} className="flex-1 px-3 py-2 rounded-md border bg-card text-card-foreground" />
                                <Button onClick={submitElevatorPitch} disabled={!elevatorLink?.trim()}>Submit Link</Button>
                                <Button variant="outline" onClick={loadElevatorPitch}>Refresh</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  ];
                  const current = pages[ideaReviewPage] || pages[0];
                  return (
                    <div className="space-y-6">
                      {current.render()}
                      <div className="flex justify-between pt-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => window.print()}>Save as PDF</Button>
                          <Button variant="outline" onClick={exportConceptCardAsImage}>Save as Image</Button>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" disabled={ideaReviewPage === 0} onClick={() => setIdeaReviewPage(p => Math.max(0, p - 1))}>Previous</Button>
                          {ideaReviewPage < pages.length - 1 ? (
                            <Button onClick={async () => { if (ideaReviewPage === 0) { try { await loadElevatorPitch(); } catch {} } setIdeaReviewPage(p => Math.min(p + 1, pages.length - 1)); }}>Next</Button>
                          ) : (
                            <DialogClose asChild>
                              <Button>Done</Button>
                            </DialogClose>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Pivot Confirmation Dialog */}
        <Dialog open={isPivotingConcept} onOpenChange={setIsPivotingConcept}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pivot Concept</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-4">
              Are you sure you want to pivot and start fresh? This will regenerate your concept card from scratch and overwrite the existing data. Your other sections won't be affected.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPivotingConcept(false)}>Cancel</Button>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handlePivotConcept}>Confirm Pivot</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (appState === "station") {
    const { currentStation, reviewMode } = stationData;

    if (currentStation === 1) {
      return (
        <IdeaCreationStation 
          onComplete={(data) => handleStationComplete(1, data)}
          onBack={handleBackToDashboard}
          reviewMode={reviewMode}
          existingData={stationData.ideaCard}
          businessType={userData?.businessType}
          onboardingData={stationData.onboardingData}
        />
      );
    }
    
    if (currentStation === 2) {
      return (
        <MockupStation 
          ideaCard={stationData.ideaCard}
          onComplete={(data) => handleStationComplete(2, data)}
          onBack={handleBackToDashboard}
          autoGenerate={!stationData.mockups}
          forceNewV0={reviewMode}
        />
      );
    }
    
    if (currentStation === 3) {
      return (
        <ValidationEngine 
          ideaCard={stationData.ideaCard}
          mockups={stationData.mockups}
          onComplete={(data) => handleStationComplete(3, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 4 && (stationData.ideaCard || reviewMode)) {
      return (
        <PitchPracticeStation 
          mvpData={stationData.mvpData}
          validationData={stationData.validationData}
          onComplete={(data) => handleStationComplete(4, data)}
          onBack={handleBackToDashboard}
          reviewMode={stationData.reviewMode}
          stationId={4}
        />
      );
    }
    
    if (currentStation === 5) {
      if (!canEnterPreMvp) return <div className="p-6 text-sm text-muted-foreground">Complete the Investor Pitch Deck first to unlock this station.</div>;
      return (
        <MentorshipStation 
          sessionType="pre-mvp"
          context={{ ideaCard: stationData.ideaCard, mockups: stationData.mockups }}
          onComplete={(data) => handleStationComplete(5, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 6) {
      if (!canEnterMvp) return <div className="p-6 text-sm text-muted-foreground">Complete the Pre‑MVP Mentorship Session to unlock this station.</div>;
      return (
        <MVPDevelopmentStation 
          mentorshipData={null}
          ideaData={stationData.ideaCard}
          mockupData={stationData.mockups}
          onComplete={(data) => handleStationComplete(6, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 7) {
      return (
        <MentorshipStation 
          sessionType="post-mvp"
          context={{ mvpData: stationData.mvpData, testingData: stationData.testingData }}
          onComplete={(data) => handleStationComplete(7, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 8) {
      return (
        <LaunchPrepStation 
          mvpData={stationData.mvpData}
          onComplete={(data) => handleStationComplete(8, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 9) {
      return (
        <LaunchExecutionStation 
          launchPrepData={stationData.launchData}
          onComplete={(data) => handleStationComplete(9, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 10) {
      return (
        <MonitoringStation 
          launchData={stationData.launchData}
          onComplete={(data) => handleStationComplete(10, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 11) {
      return (
        <PitchPracticeStation 
          mvpData={stationData.mvpData}
          validationData={stationData.validationData}
          marketingData={stationData.marketingData}
          onComplete={(data) => handleStationComplete(11, data)}
          onBack={handleBackToDashboard}
          stationId={11}
        />
      );
    }
    
    
    
    
    // Workshop stations that are always accessible
    if (currentStation === 12) {
      return (
        <FinancialStation 
          onComplete={(data) => handleStationComplete(12, data)}
          onBack={handleBackToDashboard}
          reviewMode={stationData.reviewMode}
        />
      );
    }
    
    if (currentStation === 13) {
      return (
        <MarketingStation 
          testingData={stationData.testingData}
          mvpData={stationData.mvpData}
          validationData={stationData.validationData}
          onComplete={(data) => handleStationComplete(13, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 14) {
      return (
        <LegalStation 
          businessType={userData?.businessType}
          mvpData={stationData.mvpData}
          onComplete={(data) => handleStationComplete(14, data)}
          onBack={handleBackToDashboard}
        />
      );
    }
    
    if (currentStation === 15) {
      return (
        <InvestorPresentationStation 
          onComplete={(data) => handleStationComplete(15, data)}
          onBack={handleBackToDashboard}
          pitchData={stationData.pitchData}
          mvpData={stationData.mvpData}
          financialData={stationData.financialData}
        />
      );
    }
    
    // If trying to access a station without prerequisites, go back to dashboard
    return (
      <FactoryDashboard 
        userData={userData} 
        stationData={stationData}
        onEnterStation={handleEnterStation}
        onGoHome={handleBackToLanding}
        onEnterCommunity={() => setAppState("community")}
      />
    );
  }

  if (appState === "completion") {
    return (
      <>
        <FactoryDashboard 
          userData={userData!} 
          stationData={stationData}
          onEnterStation={handleEnterStation}
          onGoHome={handleBackToLanding}
          onEnterCommunity={() => setAppState("community")}
          onEnterTeamFormation={() => {
            // Load team data and navigate to team formation
            (async () => {
              try {
                const { apiClient } = await import("@/lib/api");
                const status = await apiClient.get('/team-formation/status/');
                const team = status.data?.current_team;
                if (team) {
                  setTeamData({ ...team, fromDashboard: true }); // Mark as coming from dashboard
                  setAppState("member-addition");
                }
              } catch (error) {
                console.error('Failed to load team data:', error);
              }
            })();
          }}
        />
        <CompletionCelebration onClose={() => setAppState("community")} />
      </>
    );
  }

  if (appState === "mentor-team-select") {
    return <MentorDashboard onBack={handleBackToLanding} mentorData={mentorData} />;
  }

  return null;
};

export default Index;