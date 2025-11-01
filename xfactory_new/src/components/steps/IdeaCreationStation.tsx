import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OutputCard } from "@/components/OutputCard";
import { StationFlowManager } from "@/lib/stationFlow";
import { UserMenu } from "../UserMenu";
import { 
  Lightbulb, 
  Brain, 
  Target, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Smartphone,
  Globe,
  Cog,
  Cpu,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle,
  Settings
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { FactorAI } from "../FactorAI";
import { StructuredQuestionnaire } from "./StructuredQuestionnaire";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import InfoButton from "@/components/info-button";
import { lsGetScoped, lsSetScoped, scopedKey } from "@/lib/teamScope";
// PDF generation via browser print; no external deps

interface IdeaCreationProps {
  onComplete: (ideaCard: any) => void;
  onBack: () => void;
  reviewMode?: boolean;
  existingData?: any;
  businessType?: "App" | "Product" | "Platform" | "SaaS" | "Service";
  onboardingData?: {
    problem?: string;
    solution?: string;
    target?: string;
    businessType?: "App" | "Product" | "Platform" | "SaaS" | "Service" | null;
  };
}

type TechProductType = 
  | "Mobile App" | "Web App" | "Desktop Software" | "SaaS Platform" | "Internal Tool"
  | "Marketplace" | "Community Platform" | "Automation Tool" | "Data Platform" | "CMS"
  | "API Product" | "Chatbot" | "Widget/Plugin" | "Browser Extension" | "No-Code Tool"
  | "Hardware Product" | "IoT Device" | "Embedded System"
  | "AI Tool" | "ML Model" | "Generative Interface";

const techProductTypes = [
  {
    category: "Software-Based Products",
    types: ["Mobile App", "Web App", "Desktop Software", "SaaS Platform", "Internal Tool"],
    icon: Smartphone
  },
  {
    category: "Platform-Based Products", 
    types: ["Marketplace", "Community Platform", "Automation Tool", "Data Platform", "CMS"],
    icon: Globe
  },
  {
    category: "Tooling & Utility Products",
    types: ["API Product", "Chatbot", "Widget/Plugin", "Browser Extension", "No-Code Tool"],
    icon: Cog
  },
  {
    category: "Physical + Tech Products",
    types: ["Hardware Product", "IoT Device", "Embedded System"],
    icon: Cpu
  },
  {
    category: "AI-Driven Products",
    types: ["AI Tool", "ML Model", "Generative Interface"],
    icon: Zap
  }
];

export const IdeaCreationStation = ({ onComplete, onBack, reviewMode = false, existingData, businessType, onboardingData }: IdeaCreationProps) => {
  const [step, setStep] = useState(2); // Start at structured questionnaire
  const [showOutputCard, setShowOutputCard] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<any>(null);
  const [ideaData, setIdeaData] = useState({
    problemStatement: (onboardingData as any)?.problem || "",
    opportunityStatement: (onboardingData as any)?.solution || "",
    targetUsers: (onboardingData as any)?.target || "",
    productType: (businessType as any) || (onboardingData as any)?.businessType || ("" as TechProductType | ""),
    category: "",
    summary: "",
    assumptions: [] as string[]
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideaGenerated, setIdeaGenerated] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLockedReadOnly, setIsLockedReadOnly] = useState(false);
  const [showTakeControl, setShowTakeControl] = useState(false);
  const [reviewData, setReviewData] = useState<{ aiIdea?: any; brainstorm?: any; card?: any }|null>(null);
  const [reviewPage, setReviewPage] = useState<number>(0);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [elevatorLink, setElevatorLink] = useState<string>("");
  const [elevatorSaved, setElevatorSaved] = useState<boolean>(false);
  const [showElevatorModal, setShowElevatorModal] = useState<boolean>(false);
  const [showConceptExpanded, setShowConceptExpanded] = useState<boolean>(false);
  const [userArchetype, setUserArchetype] = useState<string>("");
  const [isUpdatingArchetype, setIsUpdatingArchetype] = useState(false);
  // Editing handled in Index.tsx review modal; keep IdeaCreationStation read-only for review

  const normalizeConceptCard = (raw: any, pstFallback?: { problem?: string; solution?: string; target?: string; output_name?: string } | null) => {
    try {
      const assumptions = Array.isArray(raw?.assumptions) ? raw.assumptions.map((a: any) => (typeof a === 'string' ? { text: a } : a)) : [];
      const problem = (raw?.problem || pstFallback?.problem || '').toString();
      const solution = (raw?.solution || pstFallback?.solution || '').toString();
      const target = (raw?.target_audience || pstFallback?.target || '').toString();
      const title = (raw?.title || pstFallback?.output_name || 'Concept').toString();
      const summary = [problem, solution, target ? `Target: ${target}` : ''].filter(Boolean).join('\n\n');
      return {
        ...raw,
        title,
        summary,
        primary_persona: raw?.primary_persona,
        assumptions,
      };
    } catch {
      return raw;
    }
  };

  // Editing and save handled in Index.tsx; no local edit lifecycle here

  const loadReviewData = async () => {
    try {
      // Resolve current team id
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      
      // Also load the current idea data from the team
      if (teamId) {
        try {
          const pst = await apiClient.getTeamProblemSolution(teamId);
          const d: any = (pst as any)?.data || {};
          if (d.input_problem || d.input_solution || d.input_target_audience) {
            setIdeaData(prev => ({
              ...prev,
              problemStatement: d.input_problem || prev.problemStatement,
              opportunityStatement: d.input_solution || prev.opportunityStatement,
              targetUsers: d.input_target_audience || prev.targetUsers
            }));
          }
        } catch (error) {
        }
      }

      // Idea id (still used for AI idea)
      let idStr = lsGetScoped('xfactoryIdeaId');
      let ideaId = idStr ? Number(idStr) : null;
      if (!ideaId && teamId) {
        try {
          // Create PST first with selected business type if available
          const bt = (businessType as any) || (onboardingData as any)?.businessType || undefined;
          await apiClient.createTeamProblemSolution(teamId, bt ? { business_type: String(bt) } : {});
          // Then read latest idea id
          const latest = await apiClient.getTeamLatestIdeaId(teamId);
          const newId = (latest as any)?.data?.id as number | undefined;
          if (newId) { ideaId = newId; try { localStorage.setItem(`xfactoryIdeaId_${teamId}`, String(newId)); } catch {} }
        } catch {}
      }
      // Continue loading even without ideaId since we have team-scoped data

      // AI Idea (idea-id based) with generation fallback
      // Build AI idea-like view directly from Idea PST
      let aiIdea: any = null;
      try {
        if (teamId) {
          const pstRes = await apiClient.getTeamProblemSolution(teamId);
          const d: any = pstRes?.data || {};
          aiIdea = {
            problem_statement: d.problem || d.input_problem || '',
            solution_overview: d.solution || d.input_solution || '',
            target_audience: d.target || d.input_target_audience || ''
          };
        }
      } catch {}

      // Team-scoped brainstorm with robust fallbacks
      let brainstorm: any = null;
      try {
        if (teamId) {
          let teamBs = await apiClient.getTeamBrainstorming(teamId);
          if (!(teamBs?.status >= 200 && teamBs.status < 300 && (teamBs as any).data)) {
            try { await apiClient.generateTeamBrainstorming(teamId); } catch {}
            try { teamBs = await apiClient.getTeamBrainstorming(teamId); } catch {}
          }
          const bsData: any = (teamBs as any)?.data;
          if (bsData && ((Array.isArray(bsData?.opportunity_statements) && bsData.opportunity_statements.some(Boolean)) || (Array.isArray(bsData?.user_problems) && bsData.user_problems.some(Boolean)))) {
            brainstorm = bsData;
          }
        }
      } catch {}
      // Fallback to idea-id-based brainstorming assistant (legacy saved) if team-scoped missing
      if (!brainstorm && ideaId) {
        try {
          let bs = await apiClient.getBrainstormingAssistant(ideaId);
          if (!(bs?.status >= 200 && bs.status < 300 && (bs as any).data)) {
            try { await apiClient.generateBrainstormingAssistant(ideaId); } catch {}
            try { bs = await apiClient.getBrainstormingAssistant(ideaId); } catch {}
          }
          const d: any = bs?.data;
          if (d && (Array.isArray(d?.opportunity_statements) || Array.isArray(d?.user_problems))) {
            brainstorm = d;
          }
        } catch {}
      }
      // Last resort: use local storage brainstorm if available
      if (!brainstorm) {
        try {
          const opps = localStorage.getItem(scopedKey('xfactoryBrainstormOpportunities'));
          const probs = localStorage.getItem(scopedKey('xfactoryBrainstormUserProblems'));
          const os = opps ? JSON.parse(opps) : [];
          const ps = probs ? JSON.parse(probs) : [];
          if (Array.isArray(os) || Array.isArray(ps)) brainstorm = { opportunity_statements: os, user_problems: ps };
        } catch {}
      }

      // Prefer concept NOTE (text-only)
      let card: any = null;
      // First, try team-scoped concept card
      try {
        if (teamId) {
          let teamCardRes: any = await apiClient.getTeamConceptCard(teamId);
          const ok = teamCardRes && teamCardRes.status >= 200 && teamCardRes.status < 300 && !('error' in teamCardRes);
          if (!ok) {
            try { await apiClient.generateTeamConceptCard(teamId); } catch {}
            try { teamCardRes = await apiClient.getTeamConceptCard(teamId) as any; } catch {}
          }
          const tcRaw: any = (teamCardRes && !('error' in teamCardRes)) ? (teamCardRes as any).data : null;
          let pstForSummary: any = {};
          try {
            const d: any = (await apiClient.getTeamProblemSolution(teamId))?.data || {};
            pstForSummary = { problem: d.problem || d.input_problem, solution: d.solution || d.input_solution, target: d.target || d.input_target_audience, output_name: d.output_name };
          } catch {}
          const tc = tcRaw ? normalizeConceptCard(tcRaw, pstForSummary as any) : null;
          if (tc && (tc.title || tc.summary || tc.primary_persona)) {
            card = tc;
            // Also hydrate stationData for downstream stations
            // setStationData(prev => ({ ...prev, ideaCard: tc })); // This line was removed as per the edit hint
          }
        }
      } catch {}
      // Fallback to concept note (text-only)
      if (!card) {
        try {
          const noteRes = await apiClient.get(`/concept-note/${ideaId}/`);
          if (noteRes?.status >= 200 && noteRes.status < 300 && (noteRes as any).data?.concept_note) {
            const n = (noteRes as any).data.concept_note;
            card = {
              title: n.title,
              summary: n.executive_summary,
              primary_persona: n.primary_persona,
              assumptions: [n.business_model, n.competitive_advantage, n.market_opportunity].filter(Boolean)
            };
          }
        } catch {}
      }
      // Fallback: if concept note is missing title, use AI idea title
      if (card && (!card.title || card.title.trim() === '') && aiIdea?.problem_statement) {
        card.title = aiIdea.problem_statement.split(' ').slice(0, 6).join(' ');
      }
      // Fallback: if still missing title, use idea.output_name
      if (card && (!card.title || card.title.trim() === '') && teamId) {
        try {
          const pstRes = await apiClient.getTeamProblemSolution(teamId);
          const d: any = (pstRes as any)?.data || {};
          if (typeof d.output_name === 'string' && d.output_name.trim()) card.title = d.output_name;
        } catch {}
      }
      // Do not fallback to team concept-card to avoid 404/HTML responses
      
      

      setReviewData({ aiIdea, brainstorm, card });
    } catch (e) {
      // ignore
    }
  };

  const refreshIdeaData = async () => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (teamId) {
        const pst = await apiClient.getTeamProblemSolution(teamId);
        const d: any = (pst as any)?.data || {};
        if (d.input_problem || d.input_solution || d.input_target_audience) {
          setIdeaData(prev => ({
            ...prev,
            problemStatement: d.input_problem || prev.problemStatement,
            opportunityStatement: d.input_solution || prev.opportunityStatement,
            targetUsers: d.input_target_audience || prev.targetUsers
          }));
        }
      }
    } catch (error) {
      console.log('Could not refresh idea data:', error);
    }
  };

  useEffect(() => {
    // Load team ID first
    const loadTeamId = async () => {
      try {
        const tidStr = localStorage.getItem('xfactoryTeamId');
        const tid = tidStr ? Number(tidStr) : null;
        if (tid) {
          setTeamId(tid);
        }
      } catch (error) {
        console.error('Failed to load team ID:', error);
      }
    };
    
    loadTeamId();
    loadReviewData();
    refreshIdeaData(); // Also refresh idea data on mount
    // Hydrate placeholders from backend if idea id exists
    (async () => {
      try {
        const id = lsGetScoped('xfactoryIdeaId');
        if (!id) return;
        // Prefer team-scoped PST for hydration
        let teamId: number | null = null;
        try {
          const tidStr = localStorage.getItem('xfactoryTeamId');
          teamId = tidStr ? Number(tidStr) : null;
        } catch { teamId = null; }
        if (teamId) {
          const pst = await apiClient.getTeamProblemSolution(teamId);
          const d: any = (pst as any)?.data || {};
          setIdeaData(prev => ({
            ...prev,
            problemStatement: d.problem || d.input_problem || prev.problemStatement,
            opportunityStatement: d.solution || d.input_solution || prev.opportunityStatement,
            targetUsers: d.target || d.input_target_audience || prev.targetUsers
          }));
        }
      } catch {}
    })();
  }, []);

  // Check if concept card exists and adjust step accordingly
  useEffect(() => {
    const checkExistingConceptCard = async () => {
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        
        if (teamId && !reviewMode) {
          // Check if a concept card already exists
          try {
            const cardRes: any = await apiClient.getTeamConceptCard(teamId);
            const hasCard = !!(cardRes && cardRes.status >= 200 && cardRes.status < 300 && (cardRes as any).data);
            
            if (hasCard) {
              // If concept card exists, skip to step 3 (concept card generation/display)
              setStep(3);
            }
          } catch (error) {
            // If no concept card exists, stay at step 2
            console.log('No existing concept card found, staying at step 2');
          }
        }
      } catch (error) {
        console.error('Error checking for existing concept card:', error);
      }
    };

    checkExistingConceptCard();
  }, [teamId, reviewMode]);

  // Completion gating considers both locally built state and backend-loaded review data
  const hasBrainstorm = (
    Array.isArray((ideaData as any).opportunities) && (ideaData as any).opportunities.length > 0 &&
    Array.isArray((ideaData as any).userProblems) && (ideaData as any).userProblems.length > 0
  ) || (
    Array.isArray(reviewData?.brainstorm?.opportunity_statements) && reviewData!.brainstorm!.opportunity_statements.length > 0 &&
    Array.isArray(reviewData?.brainstorm?.user_problems) && reviewData!.brainstorm!.user_problems.length > 0
  );
  const hasConcept = !!(generatedCard?.title || generatedCard?.summary || reviewData?.card?.title || reviewData?.card?.summary);
  const hasAllArtifacts = hasBrainstorm && hasConcept;
  useEffect(() => {
    if (hasAllArtifacts && showReview) setReviewPage(0);
  }, [hasAllArtifacts, showReview]);

  const STATION_ID = 1;
  const LOCK_KEY = `station_lock_${STATION_ID}`;

  useEffect(() => {
    // Load team members for richer context if user has a team
    (async () => {
      try {
        const tidStr = localStorage.getItem('xfactoryTeamId');
        const tid = tidStr ? Number(tidStr) : null;
        if (tid) {
          const membersRes = await apiClient.get(`/team-formation/teams/${tid}/members/`);
          if (membersRes.data) setTeamMembers(membersRes.data);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    // Seed problem/solution/target from onboarding AI-generated idea, if present
    try {
      // Prefer syncing context from actual Idea record if id exists
      const id = lsGetScoped('xfactoryIdeaId');
      if (id) {
        // Prefer team PST for hydration
        (async () => {
          try {
            const teamIdStr = localStorage.getItem('xfactoryTeamId');
            const teamId = teamIdStr ? Number(teamIdStr) : null;
            if (teamId) {
              const pst = await apiClient.getTeamProblemSolution(teamId);
              const d: any = (pst as any)?.data || {};
              setIdeaData(prev => ({
                ...prev,
                problemStatement: d.problem || d.input_problem || prev.problemStatement,
                opportunityStatement: d.solution || d.input_solution || prev.opportunityStatement,
                targetUsers: d.target || d.input_target_audience || prev.targetUsers,
              }));
              return;
            }
          } catch {}
          // Fallback to local storage
          const p = localStorage.getItem(scopedKey('xfactoryIdeaProblem'));
          const s = localStorage.getItem(scopedKey('xfactoryIdeaSolution'));
          const t = localStorage.getItem(scopedKey('xfactoryIdeaTarget'));
          setIdeaData(prev => ({
            ...prev,
            problemStatement: p || prev.problemStatement,
            opportunityStatement: s || prev.opportunityStatement,
            targetUsers: t || prev.targetUsers,
          }));
        })();
      } else {
        const p = localStorage.getItem(scopedKey('xfactoryIdeaProblem'));
        const s = localStorage.getItem(scopedKey('xfactoryIdeaSolution'));
        const t = localStorage.getItem(scopedKey('xfactoryIdeaTarget'));
        setIdeaData(prev => ({
          ...prev,
          problemStatement: p || prev.problemStatement,
          opportunityStatement: s || prev.opportunityStatement,
          targetUsers: t || prev.targetUsers,
        }));
      }
    } catch {}
    // Auto-run AI brainstorming only in non-review flow
    if (!reviewMode && !(ideaData as any).opportunities && !(ideaData as any).userProblems) {
      handleAIBrainstorm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // In review mode, show the same Concept Card popup UI as when generated
    if (reviewMode) {
      (async () => {
        try {
          if (existingData) {
            // Normalize to ensure assumptions and title derived from AI/PST
            let pstForSummary: any = {};
            try {
              const teamIdStr = localStorage.getItem('xfactoryTeamId');
              const tid = teamIdStr ? Number(teamIdStr) : null;
              if (tid) {
                const d: any = (await apiClient.getTeamProblemSolution(tid))?.data || {};
                pstForSummary = { problem: d.problem || d.input_problem, solution: d.solution || d.input_solution, target: d.target || d.input_target_audience, output_name: d.output_name };
              }
            } catch {}
            setGeneratedCard(normalizeConceptCard(existingData, pstForSummary));
            setIdeaGenerated(true);
            try { localStorage.setItem(scopedKey('xfactoryConceptTitle'), existingData.title || ''); } catch {}
            return;
          }
          // Fetch team-scoped concept card for the popup
          const teamIdStr = localStorage.getItem('xfactoryTeamId');
          const teamId = teamIdStr ? Number(teamIdStr) : null;
          if (teamId) {
            let teamCardRes: any = await apiClient.getTeamConceptCard(teamId);
            const ok = teamCardRes && teamCardRes.status >= 200 && teamCardRes.status < 300 && (teamCardRes as any).data;
            if (!ok) {
              try { await apiClient.generateTeamConceptCard(teamId); } catch {}
              try { teamCardRes = await apiClient.getTeamConceptCard(teamId) as any; } catch {}
            }
            const tcRaw: any = (teamCardRes && !('error' in teamCardRes)) ? (teamCardRes as any).data : null;
            let pstForSummary: any = {};
            try {
              const d: any = (await apiClient.getTeamProblemSolution(teamId))?.data || {};
              pstForSummary = { problem: d.problem || d.input_problem, solution: d.solution || d.input_solution, target: d.target || d.input_target_audience, output_name: d.output_name };
            } catch {}
            const tc: any = tcRaw ? normalizeConceptCard(tcRaw, pstForSummary) : null;
            if (tc) {
              setGeneratedCard(tc);
              setIdeaGenerated(true);
              try { if (tc.title) localStorage.setItem(scopedKey('xfactoryConceptTitle'), tc.title); } catch {}
              return;
            }
          }
        } catch {}
        // Fallback to review modal if popup data isn't available
        setShowReview(true);
      })();
      return;
    }
    const existingOutput = StationFlowManager.getStationOutput("idea");
    if (existingOutput && existingOutput.data) {
      // Populate idea data from previously saved output
      setIdeaData((prev) => ({
        ...prev,
        summary: existingOutput.data.summary || prev.summary,
        assumptions: existingOutput.data.assumptions || prev.assumptions,
      }));
      try { if (existingOutput.data.title) localStorage.setItem(scopedKey('xfactoryConceptTitle'), existingOutput.data.title); } catch {}
    }
  }, [reviewMode, existingData]);

  useEffect(() => {
    // Simple localStorage-based edit lock
    try {
      const lockRaw = localStorage.getItem(LOCK_KEY);
      const now = Date.now();
      const me = user?.email || "anonymous";
      if (lockRaw) {
        const lock = JSON.parse(lockRaw);
        const isExpired = now - (lock.timestamp || 0) > 30 * 60 * 1000; // 30 minutes
        if (isExpired || lock.user === me) {
          localStorage.setItem(LOCK_KEY, JSON.stringify({ user: me, timestamp: now }));
          setIsLockedReadOnly(false);
        } else {
          setIsLockedReadOnly(true);
          setShowTakeControl(true);
        }
      } else {
        localStorage.setItem(LOCK_KEY, JSON.stringify({ user: me, timestamp: now }));
        setIsLockedReadOnly(false);
      }
    } catch {}
  }, [user]);

  const takeControl = () => {
    try {
      const me = user?.email || "anonymous";
      localStorage.setItem(LOCK_KEY, JSON.stringify({ user: me, timestamp: Date.now() }));
      setIsLockedReadOnly(false);
      setShowTakeControl(false);
    } catch {}
  };

  const handleAIBrainstorm = async () => {
    setIsGenerating(true);
    try {
      // Prefer team-scoped endpoints when a team exists
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (teamId) {
        await apiClient.generateTeamBrainstorming(teamId);
        let bsRes = await apiClient.getTeamBrainstorming(teamId);
        if (!(bsRes.status >= 200 && bsRes.status < 300)) {
          for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 500));
            bsRes = await apiClient.getTeamBrainstorming(teamId);
            if (bsRes.status >= 200 && bsRes.status < 300) break;
          }
        }
        const bsResData: any = (bsRes as any)?.data || {};
        let opportunities = (Array.isArray(bsResData.opportunity_statements) ? bsResData.opportunity_statements : [])
          .filter(Boolean)
          .map((text: string) => ({ title: text, description: '', icon: 'TrendingUp', color: 'text-primary' }));
        let userProblems = (Array.isArray(bsResData.user_problems) ? bsResData.user_problems : [])
          .filter(Boolean)
          .map((text: string) => ({ title: text, description: '', icon: 'AlertTriangle', color: 'text-destructive' }));
        // Fallback to stateless route if saved results are not ready
        if (opportunities.length === 0 && userProblems.length === 0) {
          const res = await apiClient.brainstormingAI({ problem: ideaData.problemStatement, solution: ideaData.opportunityStatement, target_market: ideaData.targetUsers });
          const resData: any = (res as any)?.data || {};
          opportunities = Array.isArray(resData.opportunities) ? resData.opportunities : [];
          userProblems = Array.isArray(resData.user_problems) ? resData.user_problems : [];
        }
        try {
          localStorage.setItem(scopedKey('xfactoryBrainstormOpportunities'), JSON.stringify(opportunities));
          localStorage.setItem(scopedKey('xfactoryBrainstormUserProblems'), JSON.stringify(userProblems));
        } catch {}
        setIdeaData(prev => ({ ...prev, opportunities, userProblems }));
      } else {
        // Fallback to idea-id based brainstorming assistant if no team
        // Ensure we have an idea id to attach brainstorming to
        let ideaIdStr = lsGetScoped('xfactoryIdeaId');
        const p0 = localStorage.getItem(scopedKey('xfactoryIdeaProblem')) || ideaData.problemStatement;
        const s0 = localStorage.getItem(scopedKey('xfactoryIdeaSolution')) || ideaData.opportunityStatement;
        const t0 = localStorage.getItem(scopedKey('xfactoryIdeaTarget')) || ideaData.targetUsers;
        if (!ideaIdStr) {
          // If no idea id, update fields and return without remote brainstorming
          setIdeaData(prev => ({ ...prev, problemStatement: p0, opportunityStatement: s0, targetUsers: t0 }));
          return;
        }
        const ideaIdNum = parseInt(String(ideaIdStr), 10);
        if (!isNaN(ideaIdNum)) {
          try { await apiClient.generateBrainstormingAssistant(ideaIdNum); } catch {}
          let bs = await apiClient.getBrainstormingAssistant(ideaIdNum);
          if (!(bs?.status >= 200 && bs.status < 300)) {
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 500));
              bs = await apiClient.getBrainstormingAssistant(ideaIdNum);
              if (bs?.status >= 200 && bs.status < 300) break;
            }
          }
          const opportunities = (Array.isArray((bs as any)?.data?.opportunity_statements) ? (bs as any).data.opportunity_statements : []).filter(Boolean).map((text: string) => ({ title: text, description: '', icon: 'TrendingUp', color: 'text-primary' }));
          const userProblems = (Array.isArray((bs as any)?.data?.user_problems) ? (bs as any).data.user_problems : []).filter(Boolean).map((text: string) => ({ title: text, description: '', icon: 'AlertTriangle', color: 'text-destructive' }));
          try {
            localStorage.setItem(scopedKey('xfactoryBrainstormOpportunities'), JSON.stringify(opportunities));
            localStorage.setItem(scopedKey('xfactoryBrainstormUserProblems'), JSON.stringify(userProblems));
          } catch {}
          setIdeaData(prev => ({
            ...prev,
            opportunities,
            userProblems,
            problemStatement: p0,
            opportunityStatement: s0,
            targetUsers: t0,
          }));
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateIdea = async () => {
    setIsGenerating(true);
    try {
      // Try team-scoped PST upsert to get an ideaId (preferred)
      let ideaId: number | undefined;
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (teamId) {
          // Ensure a POST happens with selected business type
          const bt = (businessType as any) || (onboardingData as any)?.businessType || undefined;
          const createRes = await apiClient.createTeamProblemSolution(teamId, bt ? { business_type: String(bt) } : {});
          // Resolve idea id via latest endpoint to avoid parsing issues
          const latest = await apiClient.getTeamLatestIdeaId(teamId);
          ideaId = (latest as any)?.data?.id as number | undefined;
          if (ideaId) {
            try { lsSetScoped('xfactoryIdeaId', String(ideaId)); } catch {}
          }
        }
      } catch {}

      // Attempt to build a concept card
      let card: any = null;
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (teamId) {
          // Always generate a new concept card when not in review mode
          if (!reviewMode) {
            try { 
              console.log('Generating new concept card for team:', teamId);
              const generateResult = await apiClient.generateTeamConceptCard(teamId);
              console.log('Generate concept card result:', generateResult);
            } catch (error) {
              console.error('Failed to generate concept card:', error);
            }
          }
          
          // Get the concept card (either newly generated or existing)
          let teamCardRes: any = await apiClient.getTeamConceptCard(teamId);
          console.log('Get concept card result:', teamCardRes);
          const ok = teamCardRes && teamCardRes.status >= 200 && teamCardRes.status < 300 && !('error' in teamCardRes);
          if (!ok) {
            console.log('Concept card not found or error, attempting to generate...');
            try { 
              const retryGenerate = await apiClient.generateTeamConceptCard(teamId);
              console.log('Retry generate result:', retryGenerate);
            } catch (error) {
              console.error('Retry generate failed:', error);
            }
            try { 
              teamCardRes = await apiClient.getTeamConceptCard(teamId) as any;
              console.log('Retry get concept card result:', teamCardRes);
            } catch (error) {
              console.error('Retry get concept card failed:', error);
            }
          }
          const tcRaw: any = (teamCardRes && !('error' in teamCardRes)) ? (teamCardRes as any).data : null;
          let pstForSummary: any = {};
          try {
            const d: any = (await apiClient.getTeamProblemSolution(teamId))?.data || {};
            pstForSummary = { problem: d.problem || d.input_problem, solution: d.solution || d.input_solution, target: d.target || d.input_target_audience, output_name: d.output_name };
          } catch {}
          const tc: any = tcRaw ? normalizeConceptCard(tcRaw, pstForSummary) : null;
          if (tc && (tc.title || tc.summary || tc.primary_persona)) {
            card = tc;
          }
          }
        } catch {}

      // If still no card, reuse already loaded reviewData.card if available
      if (!card && reviewData?.card) {
        card = { ...reviewData.card };
      }

      // Title remains as concept-note or lightweight fallback; no dependency on AI idea

      // Fallback: construct a lightweight card from current inputs if concept-note is not available
      if (!card) {
        card = {
          title: (ideaData.summary && ideaData.summary.split(' ').slice(0, 6).join(' ')) || 'Concept',
          summary: ideaData.opportunityStatement || ideaData.problemStatement || '',
          primary_persona: typeof (generatedCard as any)?.primary_persona === 'object' ? (generatedCard as any).primary_persona : undefined,
          assumptions: Array.isArray(ideaData.assumptions) ? ideaData.assumptions : [],
        };
      }

      // Save for Station output and display modal (+hydrate review data immediately). Ensure AI fields present.
      StationFlowManager.saveStationOutput('idea', card, 80);
      setGeneratedCard(card);
      setReviewData(prev => ({ ...(prev || {}), card }));
      setIdeaGenerated(true);

      // Persist team concept card so other browsers/devices can load it
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (teamId) {
          await apiClient.generateTeamConceptCard(teamId);
        }
      } catch {}

      // Best-effort hydration of idea fields if we got an ideaId
      if (ideaId) {
        try {
          const tidStr = localStorage.getItem('xfactoryTeamId');
          const teamIdHydrate = tidStr ? Number(tidStr) : null;
          if (teamIdHydrate) {
            const pstRes = await apiClient.getTeamProblemSolution(teamIdHydrate);
            const d: any = (pstRes as any)?.data || {};
            setIdeaData(prev => ({
              ...prev,
              problemStatement: d.problem || d.input_problem || prev.problemStatement,
              opportunityStatement: d.solution || d.input_solution || prev.opportunityStatement,
              targetUsers: d.target || d.input_target_audience || prev.targetUsers,
            }));
          }
        } catch {}
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Note: legacy idea-card generator removed to avoid non-team-scoped flows

  const handleDownloadPDF = () => {
    // Simple fallback: open browser print dialog for PDF save
    window.print();
  };

  const loadElevatorPitch = async () => {
    try {
      if (!teamId) return;
      const res = await apiClient.getElevatorPitchSubmission(teamId);
      const d: any = res?.data || {};
      if (typeof d.google_drive_link === 'string') setElevatorLink(d.google_drive_link);
      setElevatorSaved(!!(d?.submitted || (typeof d?.google_drive_link === 'string' && d.google_drive_link.trim())));
    } catch {
      try {
        const v = localStorage.getItem(scopedKey('xfactoryElevatorPitchLink')) || '';
        if (v) {
          setElevatorLink(v);
          setElevatorSaved(true);
        }
      } catch {}
    }
  };

  useEffect(() => { loadElevatorPitch(); }, [teamId]);

  // Ensure pitch link is hydrated when review opens
  useEffect(() => {
    if (showReview) { try { loadElevatorPitch(); } catch {} }
  }, [showReview]);

  // Fetch elevator pitch when navigating to the pitch page in review (page index 1)
  useEffect(() => {
    if (showReview && reviewPage === 1) {
      try { loadElevatorPitch(); } catch {}
    }
  }, [showReview, reviewPage]);

  const handleSubmitElevatorLink = async () => {
    try {
      if (teamId && elevatorLink?.trim()) {
        const res = await apiClient.submitElevatorPitch(teamId, elevatorLink.trim());
        if (res.status >= 200 && res.status < 300) {
          setElevatorSaved(true);
          try { localStorage.setItem(scopedKey('xfactoryElevatorPitchLink'), elevatorLink.trim()); } catch {}
          return;
        }
      }
    } catch {}
    // Fallback to local storage
    try {
      if (elevatorLink?.trim()) {
        localStorage.setItem(scopedKey('xfactoryElevatorPitchLink'), elevatorLink.trim());
        setElevatorSaved(true);
      }
    } catch {}
  };

  const finalizeIdea = async (): Promise<any> => {
    // Ensure backend artifacts exist and mark ideation complete
    try {
      // Resolve ideaId or create
      let ideaIdStr = lsGetScoped('xfactoryIdeaId');
      if (!ideaIdStr) {
        const seedMembers = [{ name: 'Auto', abilities: ['ideation'], interests: ['general'] }];
        const createRes = await apiClient.generateTeamIdea(seedMembers as any);
        if (!createRes.data?.id) throw new Error('Failed to initialize idea');
        ideaIdStr = String(createRes.data.id);
        lsSetScoped('xfactoryIdeaId', ideaIdStr);
      }
      const ideaId = Number(ideaIdStr);

      // Ensure brainstorming assistant exists (for opportunities/problems)
      const needBrainstorm = !Array.isArray((ideaData as any).opportunities) || (ideaData as any).opportunities.length === 0
        || !Array.isArray((ideaData as any).userProblems) || (ideaData as any).userProblems.length === 0;
      if (needBrainstorm) {
        try { await apiClient.generateBrainstormingAssistant(ideaId); } catch {}
      }

      // Mark ideation completed in backend progress
      try { await apiClient.markSectionCompleted('ideation'); } catch {}

      // Persist station completion on frontend
      try { localStorage.setItem(scopedKey('xfactoryStationCompleted_1'), 'true'); } catch {}

      // Persist team concept card for cross-device hydration
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (teamId) {
          await apiClient.generateTeamConceptCard(teamId);
        }
      } catch {}

      return ideaData;
    } catch {
      return ideaData;
    }
  };

  const handleProductTypeSelect = (type: TechProductType, category: string) => {
    setIdeaData(prev => ({ ...prev, productType: type, category }));
    setStep(4);
  };

  const generateIdeaCard = () => {
    const ideaCard = {
      ideaName: ideaData.summary.split(' ').slice(0, 3).join(' ') || "Startup Concept",
      ...ideaData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      status: "concept",
      persona: generatePersona(),
      confidenceScore: Math.floor(Math.random() * 30) + 70 // 70-100%
    };
    
    // Save to station flow
    StationFlowManager.saveStationOutput("idea", ideaCard, ideaCard.confidenceScore);
    
    // Show output card
    setGeneratedCard(ideaCard);
    setShowOutputCard(true);
  };

  const generatePersona = () => {
    const personas = [
      "Sarah, 28, Product Manager at a startup, works remotely, values efficiency and team connection",
      "Alex, 35, Software Developer, leads a distributed team, wants better async collaboration tools", 
      "Maria, 32, Creative Director, manages freelancers globally, needs streamlined creative workflow"
    ];
    return personas[Math.floor(Math.random() * personas.length)];
  };

  // If in review mode, force open the 3-page review modal (effect to avoid render loop)
  useEffect(() => {
    if (reviewMode) {
      setShowReview(true);
    }
  }, [reviewMode]);

  // Load user archetype
  useEffect(() => {
    if (user?.preferred_archetype) {
      setUserArchetype(user.preferred_archetype);
    }
  }, [user]);

  const updateUserArchetype = async (newArchetype: string) => {
    try {
      setIsUpdatingArchetype(true);
      
      // Update user's preferred archetype
      const response = await apiClient.put('/auth/user/', {
        preferred_archetype: newArchetype
      });
      
      setUserArchetype(newArchetype);
      
      toast({
        title: "Archetype Updated!",
        description: `Your archetype has been updated to ${newArchetype}`,
      });
    } catch (error: any) {
      console.error('Error updating archetype:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.error || "Failed to update archetype. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingArchetype(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Factory Station Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50 w-full relative">
        {/* Logos positioned at absolute left edge */}
        <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
          <img 
            src="/logos/prov_logo_white.png" 
            alt="xFactory Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackIcon = document.createElement('div');
                fallbackIcon.innerHTML = '<svg class="h-8 w-8 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>';
                parent.appendChild(fallbackIcon);
              }
            }}
          />
          <img 
            src="/logos/fiualonetransreverse.png" 
            alt="FIU Logo" 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              const imgElement = e.target as HTMLImageElement;
              imgElement.style.display = 'none';
              const parent = imgElement.parentElement;
              if (parent) {
                const fallbackText = document.createElement('span');
                fallbackText.textContent = 'FIU';
                fallbackText.className = 'text-white font-bold text-lg';
                parent.appendChild(fallbackText);
              }
            }}
          />
        </div>

        {/* User controls positioned at absolute right edge */}
        <div className="absolute right-0 top-0 h-full flex items-center gap-3 pr-6">
          <UserMenu />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center">
            {/* Left: Section name and icon (bounded left) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
                <Lightbulb className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Idea Creation Station</h1>
                <p className="text-sm text-white/80">Structured Questionnaire & AI-Powered Ideation</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Idea Development Flow</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="flex items-center gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Choose Method
              </Button>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Factory
              </Button>
            </div>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <span className="text-sm">Choose Method</span>
            </div>
            <div className="w-8 h-0.5 bg-muted"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className="text-sm">Questionnaire</span>
            </div>
            <div className="w-8 h-0.5 bg-muted"></div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
              <span className="text-sm">Input Idea</span>
            </div>
            <div className="w-8 h-0.5 bg-muted"></div>
            <div className={`flex items-center gap-2 ${step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                4
              </div>
              <span className="text-sm">Brainstorm</span>
            </div>
          </div>
        </div>

        {/* Step 1: Choose Input Method */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">Choose Your Idea Input Method</CardTitle>
              <CardDescription className="text-lg">
                Select how you'd like to develop your idea
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Structured Questionnaire Option */}
                <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => setStep(2)}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Structured Questionnaire</h3>
                    <p className="text-muted-foreground mb-4">
                      Go through our comprehensive 7-section questionnaire to systematically develop your idea
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>7 structured sections</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>AI-powered insights</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>One question per page</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Input Option */}
                <Card className="border-2 hover:border-primary transition-colors cursor-pointer" onClick={() => setStep(3)}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lightbulb className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Manual Input</h3>
                    <p className="text-muted-foreground mb-4">
                      Directly input your problem, solution, and target audience
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Quick input</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Direct control</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Skip to brainstorming</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Structured Questionnaire */}
        {step === 2 && (
          teamId ? (
            <StructuredQuestionnaire
              teamId={teamId}
              onComplete={(data) => {
                console.log('Questionnaire completed:', data);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          ) : (
            <Card className="shadow-lg">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading team information...</p>
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Step 3: Manual Idea Input (for users with ideas) */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Lightbulb className="h-6 w-6 text-primary" />
                Define Your Idea
              </CardTitle>
              <CardDescription>
                Input your problem, solution, and target audience to save to your team's idea model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show current saved data if it exists */}
              {(ideaData.problemStatement || ideaData.opportunityStatement || ideaData.targetUsers) && (
                <div className="mb-4 p-4 bg-muted/20 rounded-lg border">
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Current Saved Data:</h4>
                  <div className="space-y-2 text-sm">
                    {ideaData.problemStatement && (
                      <div><strong>Problem:</strong> {ideaData.problemStatement}</div>
                    )}
                    {ideaData.opportunityStatement && (
                      <div><strong>Solution:</strong> {ideaData.opportunityStatement}</div>
                    )}
                    {ideaData.targetUsers && (
                      <div><strong>Target:</strong> {ideaData.targetUsers}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-1 gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label htmlFor="idea-problem" className="text-sm font-medium">Problem Statement</label>
                    <InfoButton
                      title="Problem Statement Decoder"
                      content={`**Define the problem**
                      Describe the specific problem your users face.
                      Be clear and specific about the issue they need solved.`}
                    />
                  </div>
                  <textarea
                    id="idea-problem"
                    name="problem"
                    className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="What problem are you solving?"
                    value={ideaData.problemStatement}
                    onChange={(e) => setIdeaData(prev => ({ ...prev, problemStatement: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label htmlFor="idea-solution" className="text-sm font-medium">Solution Approach</label>
                    <InfoButton
                      title="Solution Glow-Up"
                      content={`**Explain your solution**
                      Describe what your solution does and how it works.
                      Be clear about how it solves the problem you identified.`}
                    />
                  </div>
                  <textarea
                    id="idea-solution"
                    name="solution"
                    className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="How do you solve this problem?"
                    value={ideaData.opportunityStatement}
                    onChange={(e) => setIdeaData(prev => ({ ...prev, opportunityStatement: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label htmlFor="idea-target" className="text-sm font-medium">Target Audience</label>
                    <InfoButton
                      title="Who Are The Humans?"
                      content={`**Define your target audience**
                      Identify the main people who need your solution.
                      Describe their characteristics, needs, and preferences.`}
                    />
                  </div>
                  <textarea
                    id="idea-target"
                    name="target"
                    className="w-full h-24 p-3 rounded-lg border border-border bg-card text-card-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Who is your target market?"
                    value={ideaData.targetUsers}
                    onChange={(e) => setIdeaData(prev => ({ ...prev, targetUsers: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={refreshIdeaData}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      const teamIdStr = localStorage.getItem('xfactoryTeamId');
                      const teamId = teamIdStr ? Number(teamIdStr) : null;
                      if (teamId) {
                        const result = await apiClient.axiosSetTeamIdeaInputs(teamId, {
                          input_problem: ideaData.problemStatement,
                          input_solution: ideaData.opportunityStatement,
                          input_target_audience: ideaData.targetUsers
                        });
                        
                        if (result.status >= 200 && result.status < 300) {
                          toast({
                            title: "Success!",
                            description: "Your idea has been saved to your team's idea model.",
                          });
                          setStep(4);
                        } else {
                          throw new Error(result.error || 'Failed to save idea');
                        }
                      }
                    } catch (error: any) {
                      console.error('Failed to save idea:', error);
                      toast({
                        title: "Error",
                        description: error?.message || "Failed to save idea. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!ideaData.problemStatement?.trim() || !ideaData.opportunityStatement?.trim() || !ideaData.targetUsers?.trim()}
                  className="px-8"
                >
                  Save Idea
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Brainstorming Station */}
        {step === 4 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                Brainstorming Station
              </CardTitle>
              <CardDescription>
                Explore market opportunities and identify user problems with AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleAIBrainstorm} disabled={isGenerating}>
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Refresh AI Brainstorm
                </Button>
              </div>

              {/* Opportunity Statements */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Market Opportunities</h3>
                <div className="grid gap-4">
                  {(ideaData as any).opportunities?.map((op: any, idx: number) => {
                    const IconComp = { TrendingUp, Target, Lightbulb, Users, AlertTriangle, Clock }[op.icon] || Lightbulb;
                    const colorClass = op.color || 'text-primary';
                    return (
                      <div key={idx} className="p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <IconComp className={`h-5 w-5 ${colorClass} mt-1`} />
                          <div>
                            <h4 className="font-medium mb-2">{op.title}</h4>
                            <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{String(op.description || '')}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Problems */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Key User Problems</h3>
                <div className="grid gap-4">
                  {(ideaData as any).userProblems?.map((up: any, idx: number) => {
                    const IconComp = { TrendingUp, Target, Lightbulb, Users, AlertTriangle, Clock }[up.icon] || AlertTriangle;
                    const colorClass = up.color || 'text-destructive';
                    return (
                      <div key={idx} className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                        <div className="flex items-start gap-3">
                          <IconComp className={`h-5 w-5 ${colorClass} mt-1`} />
                          <div>
                            <h4 className={`font-medium mb-2 ${colorClass}`}>{up.title}</h4>
                            <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{String(up.description || '')}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
                          <div className="flex justify-center pt-4 gap-3">
              <Button onClick={handleGenerateIdea} disabled={isGenerating} size="lg" className="px-8">
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Final Concept
              </Button>
              <Button variant="outline" asChild disabled={!hasConcept}>
                <a href="#idea-review" onClick={async (e) => { e.preventDefault(); try { await loadReviewData(); } catch {} try { await loadElevatorPitch(); } catch {} setShowReview(true); }}>
                  Review
                </a>
              </Button>
            </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Idea Card Dialog/Modal */}
        <Dialog open={ideaGenerated} onOpenChange={setIdeaGenerated}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                {generatedCard?.title || 'Your Startup Concept'}
              </DialogTitle>
              <p className="sr-only">Concept card details and actions</p>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                      <strong>{generatedCard?.title || 'Concept Name'}</strong>
                      <ReactMarkdown>
                        {String(generatedCard?.summary || ideaData.opportunityStatement || '')}
                      </ReactMarkdown>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Persona</h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        <strong>
                          {(() => {
                            const p: any = generatedCard?.primary_persona || {};
                            const line = [p?.name, p?.age, p?.occupation].filter(Boolean).join(', ');
                            if (line) return line;
                            if (typeof p === 'string') return p;
                            if (typeof p?.description === 'string' && p.description.trim()) return p.description;
                            return 'Primary target persona';
                          })()}
                        </strong><br/>
                        {(() => {
                          const p: any = generatedCard?.primary_persona || {};
                          return p?.location ? `${p.location} · ` : '';
                        })()}
                        {Array.isArray(generatedCard?.primary_persona?.pain_points) && generatedCard.primary_persona.pain_points.length > 0
                          ? `Pain points: ${generatedCard.primary_persona.pain_points.slice(0,3).join(', ')}`
                          : ''}
                        {Array.isArray(generatedCard?.primary_persona?.goals) && generatedCard.primary_persona.goals.length > 0
                          ? `\nGoals: ${generatedCard.primary_persona.goals.slice(0,3).join(', ')}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Assumptions</h4>
                    <div className="space-y-2">
                      {(generatedCard?.assumptions || ideaData.assumptions || []).slice(0,3).map((a: any, idx: number) => (
                        <div key={idx} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                          {idx+1}. {typeof a === 'string' ? a : a.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Concept Overview</h4>
                  <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">📋</span>
                      </div>
                      <h5 className="text-lg font-semibold text-slate-800">Ready for Development</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Concept validated and ready</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Target audience defined</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Business model outlined</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setIdeaGenerated(false);
                      onBack();
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Factory
                  </Button>
                </DialogClose>
                                 <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Save as PDF
                </Button>
                <Button 
                  onClick={async () => {
                    try { await loadReviewData(); } catch {}
                    setShowElevatorModal(true);
                  }}
                  className="flex-1"
                >
                  Record Elevator Pitch
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Elevator Pitch Deliverable Modal */}
        <Dialog open={showElevatorModal} onOpenChange={(open) => { setShowElevatorModal(open); if (open) { try { loadElevatorPitch(); } catch {} } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between w-full">
                <span>Record Your Elevator Pitch</span>
              </DialogTitle>
              <p className="sr-only">Submit a Google Drive link to your elevator pitch</p>
            </DialogHeader>
            <div className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/10 text-sm text-muted-foreground">
                Submit a Google Drive link to your 60–90 second elevator pitch video (or slides with voiceover). Make sure the link is set to "Anyone with the link can view" so admins can review it.
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={elevatorLink}
                  onChange={(e) => setElevatorLink(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border bg-card text-card-foreground"
                />
                <Button onClick={handleSubmitElevatorLink} disabled={!elevatorLink?.trim()}>
                  Submit Link
                </Button>
                <Button variant="outline" onClick={loadElevatorPitch}>Refresh</Button>
              </div>
              {elevatorSaved && (
                <p className="text-xs text-green-600">Link saved. You can update it anytime.</p>
              )}

              {/* Expandable Concept Card Preview */}
              <div className="border rounded-lg">
                <button
                  className="w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between"
                  onClick={() => setShowConceptExpanded(v => !v)}
                >
                  <span>Show Concept Card Preview</span>
                  <span className="text-muted-foreground">{showConceptExpanded ? 'Hide' : 'Expand'}</span>
                </button>
                {showConceptExpanded && (
                  <div className="px-4 pb-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Concept Card</h4>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Title</div>
                      <div className="font-semibold">{(reviewData?.card?.title || generatedCard?.title || 'Concept')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Summary</div>
                      <div className="text-muted-foreground"><ReactMarkdown>{String(reviewData?.card?.summary || generatedCard?.summary || ideaData.opportunityStatement || '')}</ReactMarkdown></div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Primary Persona</div>
                      <div className="text-muted-foreground">
                        {(() => {
                          const p: any = (reviewData?.card?.primary_persona || generatedCard?.primary_persona) || {};
                          const line = [p?.name, p?.age, p?.occupation].filter(Boolean).join(', ');
                          if (line) return line;
                          if (typeof p === 'string') return p;
                          if (typeof p?.description === 'string' && p.description.trim()) return p.description;
                          return 'Primary target persona';
                        })()}
                      </div>
                    </div>
                    {(Array.isArray(reviewData?.card?.assumptions) ? reviewData?.card?.assumptions : generatedCard?.assumptions) && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Top Assumptions</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {(Array.isArray(reviewData?.card?.assumptions) ? reviewData!.card!.assumptions : (generatedCard?.assumptions || [])).slice(0,3).map((a: any, i: number) => (
                            <li key={i}>{typeof a === 'string' ? a : a?.text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Modal (3-page, PDF-exportable) */}
        <Dialog open={showReview} onOpenChange={(open) => { setShowReview(open); if (!open) setReviewPage(0); }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between w-full">
                <span>Idea Review</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{reviewPage + 1} / 2</span>
                </div>
              </DialogTitle>
              <p className="sr-only">Concept card and elevator pitch review</p>
            </DialogHeader>
            {!reviewData ? null : (() => {
              const pages = [
                {
                  key: 'card',
                  title: 'Concept Card',
                  render: () => (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold">Summary</h4>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                              <>
                                <strong>{reviewData?.card?.title || 'Concept Name'}</strong>
                                <ReactMarkdown>
                                  {String(reviewData?.card?.summary || '')}
                                </ReactMarkdown>
                              </>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Persona</h4>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm">
                                <strong>
                                  {(() => {
                                    const p: any = reviewData?.card?.primary_persona || {};
                                    const line = [p?.name, p?.age, p?.occupation].filter(Boolean).join(', ');
                                    if (line) return line;
                                    if (typeof p === 'string') return p;
                                    if (typeof p?.description === 'string' && p.description.trim()) return p.description;
                                    return 'Primary target persona';
                                  })()}
                                </strong><br/>
                                {(() => {
                                  const p: any = reviewData?.card?.primary_persona || {};
                                  return p?.location ? `${p.location} · ` : '';
                                })()}
                                {Array.isArray(reviewData?.card?.primary_persona?.pain_points) && reviewData!.card!.primary_persona.pain_points.length > 0
                                  ? `Pain points: ${reviewData!.card!.primary_persona.pain_points.slice(0,3).join(', ')}`
                                  : ''}
                                {Array.isArray(reviewData?.card?.primary_persona?.goals) && reviewData!.card!.primary_persona.goals.length > 0
                                  ? `\nGoals: ${reviewData!.card!.primary_persona.goals.slice(0,3).join(', ')}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Assumptions</h4>
                            <div className="space-y-2">
                              {(reviewData?.card?.assumptions || []).slice(0,3).map((a: any, idx: number) => (
                                <div key={idx} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                                  {idx+1}. {typeof a === 'string' ? a : a.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Concept Overview</h4>
                          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-gray-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-lg">📋</span>
                              </div>
                              <h5 className="text-lg font-semibold text-slate-800">Ready for Development</h5>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Concept validated and ready</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Target audience defined</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>Business model outlined</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  )
                },
                {
                  key: 'pitch',
                  title: 'Elevator Pitch',
                  render: () => (
                    <div className="space-y-6">
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-50 via-rose-50 to-amber-50 border border-fuchsia-200/50">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-fuchsia-400 to-rose-500 rounded-full opacity-20 blur-2xl" />
                        <div className="relative p-6 md:p-8">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-fuchsia-900">Your Elevator Pitch</h3>
                            <div className="p-2 rounded-lg bg-white/70 border border-white/50 shadow-sm">🎬</div>
                          </div>
                          {elevatorSaved && elevatorLink?.trim() ? (
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-fuchsia-200/60">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-fuchsia-900 truncate">
                                  {elevatorLink}
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="secondary" onClick={() => { try { window.open(elevatorLink, '_blank'); } catch {} }}>Open Video</Button>
                                  <Button variant="outline" onClick={loadElevatorPitch}>Refresh</Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-fuchsia-900/80">Paste your Google Drive link to the 60–90s elevator pitch recording (or slides with voiceover). Ensure link is public.</p>
                              <div className="flex flex-col md:flex-row gap-2">
                                <input
                                  type="url"
                                  placeholder="https://drive.google.com/..."
                                  value={elevatorLink}
                                  onChange={(e) => setElevatorLink(e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-md border bg-card text-card-foreground"
                                />
                                <Button onClick={handleSubmitElevatorLink} disabled={!elevatorLink?.trim()}>Submit Link</Button>
                                <Button variant="outline" onClick={loadElevatorPitch}>Refresh</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }
              ];
              const current = pages[reviewPage] || pages[0];
              return (
                <div className="space-y-6">
                  {current.render()}
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={handleDownloadPDF}>Save as PDF</Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" disabled={reviewPage === 0} onClick={() => setReviewPage(p => Math.max(0, p - 1))}>Previous</Button>
                      {reviewPage < pages.length - 1 ? (
                        <Button onClick={() => setReviewPage(p => Math.min(p + 1, pages.length - 1))}>Next</Button>
                      ) : (
                        <DialogClose asChild>
                          <Button onClick={async () => { await finalizeIdea(); }}>
                            Done
                          </Button>
                        </DialogClose>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};