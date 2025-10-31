import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from "react-markdown";
import { FocusGroupKit } from "./FocusGroupKit";
import { 
  Target, 
  Search, 
  Users, 
  BarChart3, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  PieChart,
  FileText,
  Lightbulb,
  Upload,
  FileAudio,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Save
} from "lucide-react";
import { FactorAI } from "../FactorAI";
import { apiClient } from "@/lib/api";
import { lsGetScoped } from "@/lib/teamScope";

interface ValidationEngineProps {
  ideaCard: any;
  mockups: any;
  onComplete: (validationData: any) => void;
  onBack: () => void;
}

type ValidationTier = "secondary" | "qualitative" | "quantitative" | "interviews" | "focus-groups";

interface ValidationScore {
  tier: ValidationTier;
  score: number;
  status: "excellent" | "good" | "warning" | "poor";
  insights: string[];
  data: any;
}

export const ValidationEngine = ({ ideaCard, mockups, onComplete, onBack }: ValidationEngineProps) => {
  const [currentTier, setCurrentTier] = useState<ValidationTier | null>(null);
  const [completedTiers, setCompletedTiers] = useState<ValidationTier[]>([]);
  const [validationScores, setValidationScores] = useState<ValidationScore[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  // Optional GFM support removed to avoid bundler resolution errors when not installed
  const pollingAbortRef = useRef<boolean>(false);
  const [selectedQualOption, setSelectedQualOption] = useState<"diy" | "focus-group" | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [ideaId, setIdeaId] = useState<number | null>(null);
  const [showDataUpload, setShowDataUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyLink, setSurveyLink] = useState("");
  const [surveyName, setSurveyName] = useState("");
  const [aiSurveyQuestions, setAISurveyQuestions] = useState<Array<{ id: string; type: 'multiple_choice'|'multi_select'|'scale_0_100'|'open'; text: string; options?: string[]; required?: boolean; insights?: string }>>([]);
  const [surveyAssembled, setSurveyAssembled] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isRedoingSecondary, setIsRedoingSecondary] = useState(false);
  
  // Rate limiting state
  const [lastApiCall, setLastApiCall] = useState<number>(0);
  const apiCallDelay = 1000; // Minimum 1 second between API calls

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Throttled API call function to prevent rate limiting
  const throttledApiCall = async (apiCall: () => Promise<any>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    
    if (timeSinceLastCall < apiCallDelay) {
      const waitTime = apiCallDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    setLastApiCall(Date.now());
    return await apiCall();
  };

  // Check if survey should be considered assembled
  const isSurveyAssembled = () => {
    // Survey is assembled if there are questions AND links have been submitted
    const hasQuestions = aiSurveyQuestions.length > 0;
    const hasLinks = (qualInterviewLink || '').trim() || (qualFocusGroupLink || '').trim() || (qualTranscriptLink || '').trim();
    return hasQuestions && hasLinks;
  };

  // Save survey insights with debouncing
  const saveSurveyInsights = async (questions: typeof aiSurveyQuestions) => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (teamId) {
        await apiClient.saveSurveyInsightsTeam(teamId, questions);
      }
    } catch (e) {
    }
  };

  // Debounced save function
  const debouncedSaveInsights = (questions: typeof aiSurveyQuestions) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      saveSurveyInsights(questions);
    }, 1000); // Save after 1 second of inactivity
    setSaveTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Interviews + qualitative scoring (team-scoped)
  const [interviews, setInterviews] = useState<Array<{ 
    id: number; 
    title: string; 
    interviewee?: { 
      id: number; 
      name: string; 
      persona_target: string; 
      team_interviewee_id: number; 
    } | null; 
  }>>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(null);
  const [qualEvidenceLink, setQualEvidenceLink] = useState<string>("");
  const [qualInsightsState, setQualInsightsState] = useState<Array<{ section: string; question: string; insight: string }>>([]);
  const [focusGroupInsightsState, setFocusGroupInsightsState] = useState<Array<{ section: string; question: string; insight: string }>>([]);
  const [focusGroupData, setFocusGroupData] = useState<any | null>(null);
  const [qualitativeViewMode, setQualitativeViewMode] = useState<'interview' | 'focus-group'>('interview');
  const [deepResearch, setDeepResearch] = useState<any | null>(null);
  // Secondary score (0–20) with simple animation counter
  const [secondaryScore20, setSecondaryScore20] = useState<number | null>(null);
  const [secondaryScoreAnim, setSecondaryScoreAnim] = useState<number>(0);
  const [secondaryScoreLoading, setSecondaryScoreLoading] = useState<boolean>(false);
  // Quantitative submission modal
  const [showQuantSubmitModal, setShowQuantSubmitModal] = useState<boolean>(false);
  const [quantFormLink, setQuantFormLink] = useState<string>("");
  const [quantVideoLink, setQuantVideoLink] = useState<string>("");
  const [quantitativeData, setQuantitativeData] = useState<any | null>(null);
  const [validationEvidence, setValidationEvidence] = useState<any | null>(null);
  const [qualInterviewLink, setQualInterviewLink] = useState<string>("");
  const [qualFocusGroupLink, setQualFocusGroupLink] = useState<string>("");
  const [qualTranscriptLink, setQualTranscriptLink] = useState<string>("");
  const [responseVolume, setResponseVolume] = useState<string>("");
  const [quantitativeInsights, setQuantitativeInsights] = useState<Record<string, string>>({});
  const [quantitativeScore, setQuantitativeScore] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Confetti effect for excellent scores
  const triggerConfetti = () => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    const confettiContainer = document.createElement('div');
    confettiContainer.style.position = 'fixed';
    confettiContainer.style.top = '0';
    confettiContainer.style.left = '0';
    confettiContainer.style.width = '100%';
    confettiContainer.style.height = '100%';
    confettiContainer.style.pointerEvents = 'none';
    confettiContainer.style.zIndex = '9999';
    document.body.appendChild(confettiContainer);

    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'absolute';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      confetti.style.borderRadius = '50%';
      confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s linear forwards`;
      confettiContainer.appendChild(confetti);
    }

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      document.body.removeChild(confettiContainer);
      document.head.removeChild(style);
    }, 5000);
  };

  // Auto-resize all textareas when content changes
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea[data-auto-resize]');
    textareas.forEach((textarea) => {
      autoResizeTextarea(textarea as HTMLTextAreaElement);
    });
  }, [aiSurveyQuestions, quantitativeInsights]);
  const [qualScore, setQualScore] = useState<{
    repetition_of_pain_points: number;
    specificity_of_problems: number;
    workarounds_identified: number;
    emotional_intensity: number;
    solution_resonance: number;
    final_score_10: number;
    created_at?: string;
  } | null>(null);

  // Check if all three scores exist and show validation complete window
  useEffect(() => {
    const hasSecondary = typeof secondaryScore20 === 'number';
    const hasQual = Number.isFinite((qualScore as any)?.final_score_10) || Number.isFinite((validationScores.find(s=>s.tier==='qualitative')?.data as any)?.final_score_10);
    const hasQuant = Number.isFinite((quantitativeScore as any)?.final_score_50);
    const hasThreeScores = Boolean(hasSecondary && hasQual && hasQuant);
    
    if (hasThreeScores) {
      // If all three scores exist, switch to quantitative tier and mark as completed
      if (currentTier !== "quantitative") {
        setCurrentTier("quantitative");
      }
      setCompletedTiers(prev => prev.includes('quantitative') ? prev : [...prev, 'quantitative']);
      
      // Trigger confetti if overall score is excellent (90+)
      const overallScore = calculateOverallScore();
      if (overallScore >= 90 && !showConfetti) {
        setShowConfetti(true);
        triggerConfetti();
        // Hide confetti after 4 seconds
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  }, [secondaryScore20, qualScore, quantitativeScore, validationScores, currentTier]);

  // Interview menu state (localized to Interview Guide)
  const [showInterviewMenu, setShowInterviewMenu] = useState<boolean>(false);
  const [newIntervieweeName, setNewIntervieweeName] = useState<string>("");
  const [newInterviewPersona, setNewInterviewPersona] = useState<string>("");

  // Load qualitative evidence links on component mount (similar to focus groups and interviews)
  useEffect(() => {
    const loadQualitativeEvidenceLinks = async () => {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const currentTeamId = teamIdStr ? Number(teamIdStr) : null;
      if (!currentTeamId) return;
      
      // Check if validation station is marked as complete; if not, don't load existing (treat as reset)
      let shouldLoadValidation = true;
      try {
        const roadmap = await apiClient.getTeamRoadmap(currentTeamId);
        const validation = (roadmap as any)?.data?.validation || {};
        if (!validation.secondary && !validation.qualitative && !validation.quantitative) {
          shouldLoadValidation = false;
        }
      } catch {}
      
      if (!shouldLoadValidation) return;
      
      try {
        const ev = await apiClient.getValidationEvidence(currentTeamId);
        const d: any = (ev as any)?.data || {};
        setQualInterviewLink(d.qual_interview_link || "");
        setQualFocusGroupLink(d.qual_focus_group_link || "");
        setQualTranscriptLink(d.qual_transcript_link || "");
        console.log('DEBUG: Loaded qualitative evidence links:', d);
      } catch (error) {
        console.error('DEBUG: Error loading qualitative evidence links:', error);
      }
    };
    
    loadQualitativeEvidenceLinks();
  }, []);

  // Load all scores on component mount to check if validation is complete
  useEffect(() => {
    const loadAllScoresOnMount = async () => {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const currentTeamId = teamIdStr ? Number(teamIdStr) : null;
      if (!currentTeamId) return;
      
      // Check if validation station is marked as complete; if not, don't load existing data (treat as reset)
      let shouldLoadValidation = true;
      try {
        const roadmap = await apiClient.getTeamRoadmap(currentTeamId);
        const validation = (roadmap as any)?.data?.validation || {};
        // If validation flags are explicitly false or all missing, don't load existing (treat as reset)
        if (!validation.secondary && !validation.qualitative && !validation.quantitative) {
          shouldLoadValidation = false;
        }
      } catch {}
      
      if (!shouldLoadValidation) return; // Skip loading if station is reset
      
      // Load secondary score
      try {
        const sec = await apiClient.getSecondaryScoreTeam(currentTeamId);
        const s: any = (sec as any)?.data?.score;
        if (s && typeof s.final_score_20 === 'number') {
          setSecondaryScore20(Number(s.final_score_20) || 0);
          console.log('DEBUG: Loaded secondary score on mount:', s.final_score_20);
        }
      } catch (e: any) {
        console.log('DEBUG: Error loading secondary score on mount:', e);
      }
      
      // Load qualitative score
      try {
        const qs = await apiClient.getQualitativeScoreTeam(currentTeamId);
        const score: any = (qs as any)?.data?.score;
        if (score && typeof score.final_score_10 === 'number') {
          setQualScore(score);
          console.log('DEBUG: Loaded qualitative score on mount:', score.final_score_10);
        }
      } catch (e: any) {
        console.log('DEBUG: Error loading qualitative score on mount:', e);
      }
      
      // Load quantitative score
      try {
        const quantScore = await apiClient.getQuantitativeScoreTeam(currentTeamId);
        // Handle both response formats: data.score or score
        const score = (quantScore as any)?.data?.score || (quantScore as any)?.score || null;
        setQuantitativeScore(score);
        console.log('DEBUG: Loaded quantitative score on mount:', score);
      } catch (e: any) {
        // Handle 404 specifically - don't mark as done if quantitative score doesn't exist
        if (e?.status === 404 || e?.response?.status === 404) {
          console.log('DEBUG: Quantitative score not found (404) on mount');
        } else {
          console.log('DEBUG: Error loading quantitative score on mount:', e);
        }
      }
    };
    
    loadAllScoresOnMount();
  }, []);

  // Load quantitative insights on component mount (similar to focus groups and interviews)
  useEffect(() => {
    const loadQuantitativeInsights = async () => {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const currentTeamId = teamIdStr ? Number(teamIdStr) : null;
      if (!currentTeamId) return;
      
      // Check if validation station is marked as complete; if not, don't load existing (treat as reset)
      let shouldLoadValidation = true;
      try {
        const roadmap = await apiClient.getTeamRoadmap(currentTeamId);
        const validation = (roadmap as any)?.data?.validation || {};
        if (!validation.secondary && !validation.qualitative && !validation.quantitative) {
          shouldLoadValidation = false;
        }
      } catch {}
      
      if (!shouldLoadValidation) return;
      
      try {
        const qi = await apiClient.getQualInsightsTeam(currentTeamId);
        const qidata: any = (qi as any)?.data || {};
        const insightsArr = Array.isArray(qidata?.data) ? qidata.data : [];
        
        if (insightsArr.length > 0) {
          const newInsights: Record<string, string> = {};
          insightsArr.forEach((insight: any) => {
            if (insight.section === 'quantitative') {
              newInsights[insight.question] = insight.insight;
            }
          });
          setQuantitativeInsights(newInsights);
          console.log('DEBUG: Loaded quantitative insights:', newInsights);
        }
      } catch (error) {
        console.error('DEBUG: Error loading quantitative insights:', error);
      }
    };
    
    loadQuantitativeInsights();
  }, []);

  // Auto-generate + poll Deep Research; then fetch report, score, and populate bullets
  useEffect(() => {
    const run = async () => {
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (!teamId) return;
        if (deepResearch) return; // already loaded

        // Check if validation station is marked as complete; if not, don't auto-load (treat as reset)
        let shouldLoadValidation = true;
        try {
          const roadmap = await apiClient.getTeamRoadmap(teamId);
          const validation = (roadmap as any)?.data?.validation || {};
          if (!validation.secondary && !validation.qualitative && !validation.quantitative) {
            shouldLoadValidation = false;
          }
        } catch {}
        
        if (!shouldLoadValidation) return; // Skip auto-loading if station is reset

        // Ensure generation is started (safe to POST; backend guards latest idea)
        try { await apiClient.post(`/validation/teams/${teamId}/deep-research/`, {}); } catch {}

        // Poll status until completed or timeout (~2 minutes)
        let attempts = 0;
        while (attempts < 40) {
          try {
            const st = await apiClient.get(`/validation/teams/${teamId}/deep-research/status/`);
            const status = (st as any)?.data?.status;
            if (status === 'completed') break;
          } catch {}
          await new Promise(r => setTimeout(r, 3000));
          attempts += 1;
        }

        // Fetch final report
        try {
          const rep = await apiClient.get(`/validation/teams/${teamId}/deep-research/`);
          const report = (rep as any)?.data?.report;
          if (report) {
            setDeepResearch(report);
            // Compute + fetch secondary score if missing
            try { await apiClient.computeSecondaryScoreTeam(teamId); } catch {}
            try {
              const sec = await apiClient.getSecondaryScoreTeam(teamId);
              const s: any = (sec as any)?.data?.score;
              if (s && typeof s.final_score_20 === 'number') {
                const sc = Number(s.final_score_20);
                setSecondaryScore20(sc);
                // Populate a secondary ValidationScore entry if absent
                setValidationScores(prev => {
                  if (prev.some(v => v.tier === 'secondary')) return prev;
                  const bullets = Array.isArray(report?.key_findings) && report.key_findings.length > 0
                    ? report.key_findings
                    : (Array.isArray(report?.market_insights) ? report.market_insights : []);
                  const status: any = sc >= 17 ? 'excellent' : sc >= 14 ? 'good' : sc >= 11 ? 'fair' : 'poor';
                  return [...prev, { tier: 'secondary', score: sc, status, insights: bullets.slice(0, 4), data: { report, score: s } }];
                });
                setCompletedTiers(prev => prev.includes('secondary') ? prev : [...prev, 'secondary']);
              }
            } catch {}
          }
        } catch (e) {
          console.error('Failed to fetch deep research report', e);
        }
      } catch (e) {
        console.error('Deep research generation failed', e);
      }
    };
    run();
  }, [currentTier, deepResearch]);

  // Save quantitative insights (similar to focus group insights)
  const saveQuantitativeInsights = async () => {
    const teamIdStr = localStorage.getItem('xfactoryTeamId');
    const teamId = teamIdStr ? Number(teamIdStr) : null;
    if (!teamId) return;
    
    try {
      const insightsData = Object.entries(quantitativeInsights).map(([questionId, insight]) => ({
        section: 'quantitative',
        question: questionId,
        insight
      }));

      if (insightsData.length > 0) {
        await apiClient.saveQualInsightsOnlyTeam(teamId, insightsData, selectedInterviewId || undefined);
        console.log('DEBUG: Saved quantitative insights:', insightsData);
      }
    } catch (error) {
      console.error('Failed to save quantitative insights:', error);
    }
  };

  // Load interviews (team-scoped)
  const loadInterviews = async () => {
    const teamIdStr = localStorage.getItem('xfactoryTeamId');
    const teamId = teamIdStr ? Number(teamIdStr) : null;
    if (!teamId) return;
    try {
      const res = await apiClient.getTeamInterviews(teamId);
      const rows: Array<any> = (res as any)?.data?.data || [];
      setInterviews(rows.map(r => ({ 
        id: r.id, 
        title: r.title, 
        interviewee: r.interviewee || null 
      })));
      if (rows.length && !selectedInterviewId) setSelectedInterviewId(rows[0].id);
    } catch {}
  };

  const createInterview = async () => {
    const teamIdStr = localStorage.getItem('xfactoryTeamId');
    const teamId = teamIdStr ? Number(teamIdStr) : null;
    if (!teamId) return;
    try {
      const title = `Interview Session ${interviews.length + 1}`;
      const res = await apiClient.createTeamInterview(teamId, title);
      if ((res as any)?.data?.data) await loadInterviews();
    } catch {}
  };

  const loadInsightsForInterview = async (interviewId: number | null) => {
    const teamIdStr = localStorage.getItem('xfactoryTeamId');
    const teamId = teamIdStr ? Number(teamIdStr) : null;
    if (!teamId) return;
    try {
      const qi = await apiClient.getQualInsightsTeam(teamId, interviewId || undefined);
      const qidata: any = (qi as any)?.data || {};
      const insightsArr = Array.isArray(qidata?.data) ? qidata.data : [];
      setQualInsightsState(insightsArr);
      // Also project into the draft fields for this interview only
      const newDraft: Record<string, string> = {};
      if (personaKit) {
        const sections: Array<{ key: string; items: string[] }> = [
          { key: 'demographic', items: (personaKit?.demographic_questions || []).slice(0,10) },
          { key: 'behavioral', items: (personaKit?.behavioral_questions || []).slice(0,10) },
          { key: 'pain_point', items: (personaKit?.pain_point_questions || []).slice(0,10) },
          { key: 'solution', items: (personaKit?.solution_questions || []).slice(0,10) },
          { key: 'market', items: (personaKit?.market_questions || []).slice(0,10) },
          { key: 'persona_validation', items: (personaKit?.persona_validation_questions || []).slice(0,10) },
        ];
        insightsArr.forEach((insight: any) => {
          sections.forEach(sec => {
            sec.items.forEach((q, i) => {
              if (q === insight.question && sec.key === insight.section) {
                const key = `${sec.key}:${i}`;
                newDraft[key] = insight.insight || '';
              }
            });
          });
        });
      }
      setInsightsDraft(newDraft);
    } catch {}
  };

  // Handle quantitative insight changes with auto-saving (debounced)
  const handleQuantitativeInsightChange = (questionId: string, insight: string) => {
    setQuantitativeInsights(prev => ({
      ...prev,
      [questionId]: insight
    }));
    
    // Auto-save insights as user types (debounced)
    clearTimeout((window as any).quantitativeSaveTimeout);
    (window as any).quantitativeSaveTimeout = setTimeout(() => {
      saveQuantitativeInsights();
    }, 1000);
  };

  // On selecting qualitative or quantitative, prefetch existing data and auto-open sections
  useEffect(() => {
    (async () => {
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const currentTeamId = teamIdStr ? Number(teamIdStr) : null;
        const ideaIdStr = lsGetScoped('xfactoryIdeaId');
        const currentIdeaId = ideaIdStr ? Number(ideaIdStr) : null;
        if (!currentTeamId && !currentIdeaId) return;
        
        // Set state variables
        setTeamId(currentTeamId);
        setIdeaId(currentIdeaId);
        // On main entry, fetch snapshot and roadmap to reflect server state
        await loadQualSnapshot(false); // Don't auto-complete based on prompt
        await syncValidationCompletionFromServer(); // Server state takes precedence
        if (currentTier === 'qualitative') {
          // Try to fetch existing persona/interview kit (team-scoped)
          if (currentTeamId) {
            try {
              const res = await apiClient.get(`/validation/teams/${currentTeamId}/user-personas/`);
              const data = (res as any)?.data?.data;
              if (data) {
                setPersonaKit(mapInterviewKit({ data }));
              }
            } catch {}
          }
          // Prefetch qualitative evidence link (team-scoped)
          try {
            if (currentTeamId) {
              const resLink = await apiClient.getValidationEvidence(currentTeamId);
              const d: any = resLink?.data || {};
              const link = typeof d.qual_folder_link === 'string' ? d.qual_folder_link : '';
              if (link) setQualEvidenceLink(link);
            }
          } catch {}

          // Load interview sessions and qualitative score
          try { await loadInterviews(); } catch {}
          // Note: Qualitative score is loaded separately when needed, not on every data load

          // Prefetch focus group insights (team-scoped)
          try {
            if (currentTeamId) {
              const res = await apiClient.get(`/validation/teams/${currentTeamId}/focus-group-insights/`);
              const data = (res as any)?.data?.data;
              if (Array.isArray(data)) {
                setFocusGroupInsightsState(data);
              }
            }
          } catch {}
        }
        if (currentTier === 'quantitative') {
          // Do NOT generate survey on tier select; only generate after explicit submit
          // Prefetch qualitative evidence link (team-scoped)
          if (currentTeamId) {
            try {
              const res = await apiClient.getValidationEvidence(currentTeamId);
              const d: any = res?.data || {};
              const link = typeof d.qual_folder_link === 'string' ? d.qual_folder_link : '';
              if (link) setQualEvidenceLink(link);
              
              // Load Google Forms link and response volume for quantitative validation
              const quantFormLink = typeof d.quant_form_link === 'string' ? d.quant_form_link : '';
              const responseVolume = typeof d.response_volume === 'number' ? d.response_volume : 0;
              
              if (quantFormLink) {
                setSurveyLink(quantFormLink);
                // Show survey interface if there's already a saved link
                setShowSurvey(true);
              }
              if (responseVolume > 0) setResponseVolume(responseVolume.toString());
            } catch {}
          }
          // Determine qualitative completeness via GETs: if a quant prompt or questions exist, mark qualitative done
          try {
            if (currentTeamId) {
              // Do not generate survey here; only read saved insights/prompt to infer completeness
              const qi = await apiClient.getQualInsightsTeam(currentTeamId);
              const maybePrompt = (qi as any)?.data?.prompt || (qi as any)?.data?.quant_prompt;
              const hasPrompt = typeof maybePrompt === 'string' && maybePrompt.trim().length > 0;
              const arr = Array.isArray((qi as any)?.data?.insights) ? (qi as any).data.insights : [];
              setQualInsightsState(arr);
              
              // Load focus group insights
              try {
                const fgi = await apiClient.getFocusGroupInsightsTeam(currentTeamId);
                const fgiArr = Array.isArray((fgi as any)?.data?.insights) ? (fgi as any).data.insights : [];
                setFocusGroupInsightsState(fgiArr);
              } catch {}
              if (hasPrompt) {
                setQualMarkedComplete(true);
                setCompletedTiers(prev => {
                  const newTiers = [...prev];
                  if (!newTiers.includes('interviews')) {
                    newTiers.push('interviews');
                  }
                  // Check if both interviews and focus groups are completed
                  if (newTiers.includes('interviews') && newTiers.includes('focus-groups')) {
                    if (!newTiers.includes('qualitative')) {
                      newTiers.push('qualitative');
                    }
                  }
                  return newTiers;
                });
                setValidationScores(prev => prev.some(s => s.tier === 'qualitative') ? prev : [...prev, { tier: 'qualitative', score: 78, status: 'good', insights: arr.slice(0,4), data: { quant_prompt: maybePrompt } }]);
                setPollfishPrompt(maybePrompt);
              }
            }
          } catch {}
        }
        
        // Load quantitative score when entering quantitative tier
        try {
          if (currentTeamId) {
            const quantScore = await apiClient.getQuantitativeScoreTeam(currentTeamId);
            // Handle both response formats: data.score or score
            const score = (quantScore as any)?.data?.score || (quantScore as any)?.score || null;
            setQuantitativeScore(score);
            console.log('DEBUG: Loaded quantitative score on tier entry:', score);
          }
        } catch (e: any) {
          // Handle 404 specifically - don't mark as done if quantitative score doesn't exist
          if (e?.status === 404 || e?.response?.status === 404) {
            console.log('DEBUG: Quantitative score not found (404) on tier entry');
          } else {
            console.log('DEBUG: Error loading quantitative score on tier entry:', e);
          }
        }
      } catch {}
    })();
  }, [currentTier]);

  const [personaKit, setPersonaKit] = useState<any | null>(null);
  // Removed secondary summary from DIY kit view per UX request
  const hasSecondaryScore = () => validationScores.some(s => s.tier === 'secondary');
  const [insightsDraft, setInsightsDraft] = useState<Record<string, string>>({});
  const [pollfishPrompt, setPollfishPrompt] = useState<string>("");
  const [qualMarkedComplete, setQualMarkedComplete] = useState<boolean>(false);
  const updateInsight = (section: string, idx: number, question: string, value: string) => {
    const key = `${section}:${idx}`;
    setInsightsDraft(prev => ({ ...prev, [key]: value }));
  };
  const loadSavedInsights = async (interviewId?: number | null): Promise<void> => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      // Load interview insights scoped to the provided interview (or currently selected)
      const targetInterviewId = typeof interviewId === 'number' ? interviewId : (selectedInterviewId || null);
      try {
        const qi = await apiClient.getQualInsightsTeam(teamId, targetInterviewId || undefined);
        const qidata: any = (qi as any)?.data || {};
        const insightsArr = Array.isArray(qidata?.data) ? qidata.data : [];
          setQualInsightsState(insightsArr);
          const newDraft: Record<string, string> = {};
        if (personaKit) {
            const sections: Array<{ key: string; items: string[] }> = [
              { key: 'demographic', items: (personaKit?.demographic_questions || []).slice(0,10) },
              { key: 'behavioral', items: (personaKit?.behavioral_questions || []).slice(0,10) },
              { key: 'pain_point', items: (personaKit?.pain_point_questions || []).slice(0,10) },
              { key: 'solution', items: (personaKit?.solution_questions || []).slice(0,10) },
              { key: 'market', items: (personaKit?.market_questions || []).slice(0,10) },
              { key: 'persona_validation', items: (personaKit?.persona_validation_questions || []).slice(0,10) },
            ];
          insightsArr.forEach((insight: any) => {
            sections.forEach(sec => {
              sec.items.forEach((q, i) => {
                if (q === insight.question && sec.key === insight.section) {
                  const key = `${sec.key}:${i}`;
                  newDraft[key] = insight.insight || '';
                }
              });
            });
          });
        }
        setInsightsDraft(newDraft);
      } catch (e) {
        console.log('No saved interview insights found');
        setInsightsDraft({});
      }
    } catch (error) {
      console.error('Failed to load saved insights:', error);
    }
  };

  const saveInsightsOnly = async (): Promise<void> => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      // Build payload from current visible questions
      const payload: Array<{ section: string; question: string; insight: string }> = [];
      const sections: Array<{ key: string; items: string[] }> = [
        { key: 'demographic', items: (personaKit?.demographic_questions || []).slice(0,10) },
        { key: 'behavioral', items: (personaKit?.behavioral_questions || []).slice(0,10) },
        { key: 'pain_point', items: (personaKit?.pain_point_questions || []).slice(0,10) },
        { key: 'solution', items: (personaKit?.solution_questions || []).slice(0,10) },
        { key: 'market', items: (personaKit?.market_questions || []).slice(0,10) },
        { key: 'persona_validation', items: (personaKit?.persona_validation_questions || []).slice(0,10) },
      ];
      sections.forEach(sec => {
        sec.items.forEach((q, i) => {
          const key = `${sec.key}:${i}`;
          const val = (insightsDraft[key] || '').trim();
          if (q && val) payload.push({ section: sec.key, question: q, insight: val });
        });
      });
      if (payload.length > 0) {
        await apiClient.saveQualInsightsOnlyTeam(teamId, payload, selectedInterviewId || undefined);
        // Merge saved insights into local state for immediate display
        setQualInsightsState(prev => {
          const next = Array.isArray(prev) ? [...prev] : [];
          const makeKey = (x: any) => `${x.section}::${x.question}`;
          const existingIndexMap: Record<string, number> = {};
          next.forEach((x, idx) => existingIndexMap[makeKey(x)] = idx);
          payload.forEach(item => {
            const key = makeKey(item);
            if (key in existingIndexMap) {
              next[existingIndexMap[key]] = item;
            } else {
              next.push(item);
            }
          });
          return next;
        });
        // Do not fetch or compute qualitative score on save-only to avoid Solar-Pro-2 calls
      }
    } catch (error) {
      console.error('Failed to save insights:', error);
    }
  };

  const saveInsights = async (): Promise<string> => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return "";
      // Build payload from current visible questions
      const payload: Array<{ section: string; question: string; insight: string }> = [];
      const sections: Array<{ key: string; items: string[] }> = [
        { key: 'demographic', items: (personaKit?.demographic_questions || []).slice(0,10) },
        { key: 'behavioral', items: (personaKit?.behavioral_questions || []).slice(0,10) },
        { key: 'pain_point', items: (personaKit?.pain_point_questions || []).slice(0,10) },
        { key: 'solution', items: (personaKit?.solution_questions || []).slice(0,10) },
        { key: 'market', items: (personaKit?.market_questions || []).slice(0,10) },
        { key: 'persona_validation', items: (personaKit?.persona_validation_questions || []).slice(0,10) },
      ];
      sections.forEach(sec => {
        sec.items.forEach((q, i) => {
          const key = `${sec.key}:${i}`;
          const val = (insightsDraft[key] || '').trim();
          if (q && val) payload.push({ section: sec.key, question: q, insight: val });
        });
      });
      if (payload.length > 0) {
        const res = await apiClient.saveQualInsightsOnlyTeam(teamId, payload, selectedInterviewId || undefined);
        // Note: Quant prompt should only be generated when "Submit Qualitative Research" is clicked
        // Merge saved insights into local state for immediate display
        setQualInsightsState(prev => {
          const next = Array.isArray(prev) ? [...prev] : [];
          const makeKey = (x: any) => `${x.section}::${x.question}`;
          const existingIndexMap: Record<string, number> = {};
          next.forEach((x, idx) => existingIndexMap[makeKey(x)] = idx);
          payload.forEach(item => {
            const key = makeKey(item);
            if (key in existingIndexMap) {
              next[existingIndexMap[key]] = item;
            } else {
              next.push(item);
            }
          });
          return next;
        });
        return "";
      }
      return "";
    } catch {
      return "";
    }
  };
  // Robust parsing for secondary research reports (handles JSON, markdown, and free text)
  const parseSecondaryReport = (report: any) => {
    const textParts: string[] = [
      String(report?.title || ''),
      String(report?.abstract || ''),
      String(report?.content || ''),
      String(report?.text || ''),
      String(report?.body || ''),
    ].filter(Boolean);

    const fullText: string = textParts.join('\n\n');
    const extracted: any = report?.extracted || report || {};

    const marketInsightsRaw: string[] = Array.isArray(extracted.market_insights) ? extracted.market_insights : [];
    const competitiveRaw: any[] = Array.isArray(extracted.competitive_analysis) ? extracted.competitive_analysis : [];
    const personasRaw: any[] = Array.isArray(extracted.personas) ? extracted.personas : [];

    const normCompetitive = competitiveRaw.map((c: any) => ({
      competitor: c?.competitor || c?.name || c?.company || '',
      summary: c?.summary || c?.notes || '',
    })).filter((c: any) => c.competitor);

    const normPersonas = personasRaw.map((p: any) => ({
      name: p?.name || p?.label || 'Persona',
      summary: p?.summary || p?.description || '',
    }));

    // Utility to parse numbers with K/M/B and currency
    const parseNumberish = (val?: string | number | null): number | null => {
      if (typeof val === 'number') return val;
      const s = String(val || '').trim();
      if (!s) return null;
      const m = s.match(/\$?([\d,.]+)\s*(k|m|b|million|billion)?/i);
      if (!m) return null;
      const base = Number(m[1].replace(/,/g, ''));
      const unit = (m[2] || '').toLowerCase();
      if (!isFinite(base)) return null;
      if (unit === 'k') return base * 1e3;
      if (unit === 'm' || unit === 'million') return base * 1e6;
      if (unit === 'b' || unit === 'billion') return base * 1e9;
      return base;
    };

    // Try structured first, then regex from free text
    const tam = extracted.tam ?? (() => {
      const m = fullText.match(/\bTAM\b[^\n:$]*[:$]?\s*([\$\d,\.]+\s*(?:k|m|b|million|billion)?)/i);
      return parseNumberish(m?.[1] || null);
    })();

    const sam = extracted.sam ?? (() => {
      const m = fullText.match(/\bSAM\b[^\n:$]*[:$]?\s*([\$\d,\.]+\s*(?:k|m|b|million|billion)?)/i);
      return parseNumberish(m?.[1] || null);
    })();

    const som = extracted.som ?? (() => {
      const m = fullText.match(/\bSOM\b[^\n:$]*[:$]?\s*([\$\d,\.]+\s*(?:k|m|b|million|billion)?)/i);
      return parseNumberish(m?.[1] || null);
    })();

    // Derive market insights if not provided
    let marketInsights: string[] = [...marketInsightsRaw];
    if (marketInsights.length === 0) {
      // Look for markdown bullets or key findings section
      const bullets = fullText
        .split('\n')
        .filter(l => /^\s*[-*•]/.test(l))
        .map(l => l.replace(/^\s*[-*•]\s*/, '').trim())
        .filter(Boolean);
      marketInsights = bullets.slice(0, 6);
    }

    // Build top-level insights for the UI bullets
    const insights: string[] = [];
    if (marketInsights[0]) insights.push(String(marketInsights[0]));
    if (normCompetitive[0]?.competitor) insights.push(`Competitive: ${normCompetitive[0].competitor}`);
    if (typeof tam === 'number') insights.push(`TAM: ${tam.toLocaleString()}`);
    if (normPersonas[0]?.name) insights.push(`Persona: ${normPersonas[0].name}`);
    while (insights.length < 4) insights.push('Key finding identified');

    return {
      title: String(report?.title || 'Secondary Market Research Report'),
      abstract: String(report?.abstract || ''),
      content: fullText,
      tam, sam, som,
      personas: normPersonas,
      marketInsights,
      competitive: normCompetitive,
      sources: extracted.sources || report?.sources || [],
      insights,
      // Compose a readable markdown essay for rendering in the UI
      report: (() => {
        const lines: string[] = [];
        const fmt = (n: number | null) => (typeof n === 'number' ? n.toLocaleString() : 'N/A');
        const title = String(report?.title || 'Secondary Market Research Report');
        const abstract = String(report?.abstract || '').trim();
        lines.push(`# ${title}`);
        if (abstract) {
          lines.push('', abstract);
        }
        lines.push('', '## Market Sizing');
        lines.push(`- TAM: ${fmt(tam)}`);
        lines.push(`- SAM: ${fmt(sam)}`);
        lines.push(`- SOM: ${fmt(som)}`);
        if (normPersonas.length) {
          lines.push('', '## Personas');
          normPersonas.forEach(p => {
            lines.push(`- ${p.name}${p.summary ? ` — ${p.summary}` : ''}`);
          });
        }
        if (normCompetitive.length) {
          lines.push('', '## Competitors');
          normCompetitive.forEach(c => {
            lines.push(`- ${c.competitor}${c.summary ? ` — ${c.summary}` : ''}`);
          });
        }
        if (insights.length) {
          lines.push('', '## Key Insights');
          insights.forEach(i => lines.push(`- ${i}`));
        }
        if (marketInsights.length) {
          lines.push('', '## Market Findings');
          marketInsights.forEach(i => lines.push(`- ${i}`));
        }
        if (fullText) {
          lines.push('', '## Full Report');
          // Remove duplicate sections from fullText that are already shown above
          let cleanedFullText = fullText;
          
          // Remove duplicate title at the start if it matches the report title (with or without markdown heading)
          const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const titleRegex = new RegExp(`^#+\\s*${escapedTitle}\\s*$`, 'im');
          cleanedFullText = cleanedFullText.replace(titleRegex, '').trim();
          
          // Remove duplicate Executive Summary section (non-greedy, stop at next major section)
          const execSummaryRegex = /##+\s*Executive\s+Summary\s*[\r\n]+[\s\S]*?(?=\n##+\s*(?:Market\s+Research|Target\s+Market|Market\s+Sizing|User\s+Personas|Competitive|SWOT|Key\s+Market|User\s+Pain|Opportunities|References|Full\s+Report|$))/i;
          cleanedFullText = cleanedFullText.replace(execSummaryRegex, '').trim();
          
          // Remove duplicate Market Sizing section (with various formats)
          const marketSizingRegex = /##+\s*Market\s+Sizing\s*[\r\n]+[\s\S]*?(?=\n##+\s*(?:Target\s+Market|User\s+Personas|Competitive|SWOT|Key\s+Market|User\s+Pain|Opportunities|References|Full\s+Report|$))/i;
          cleanedFullText = cleanedFullText.replace(marketSizingRegex, '').trim();
          
          // Remove duplicate "Market Size (TAM / SAM / SOM)" section
          const marketSizeRegex = /##+\s*Market\s+Size\s*\(?TAM\s*[\/\\]\s*SAM\s*[\/\\]\s*SOM\)?\s*[\r\n]+[\s\S]*?(?=\n##+\s*(?:Target\s+Market|User\s+Personas|Competitive|SWOT|Key\s+Market|User\s+Pain|Opportunities|References|Full\s+Report|$))/i;
          cleanedFullText = cleanedFullText.replace(marketSizeRegex, '').trim();
          
          // Remove duplicate Personas section (User Personas or just Personas)
          const personasRegex = /##+\s*(?:User\s+)?Personas\s*[\r\n]+[\s\S]*?(?=\n##+\s*(?:Competitive|Market\s+Size|SWOT|Key\s+Market|User\s+Pain|Opportunities|References|Full\s+Report|$))/i;
          cleanedFullText = cleanedFullText.replace(personasRegex, '').trim();
          
          // Remove duplicate Competitors/Competitive Landscape section
          const competitorsRegex = /##+\s*Competitive\s+(?:Landscape|Analysis)\s*[\r\n]+[\s\S]*?(?=\n##+\s*(?:SWOT|Key\s+Market|User\s+Pain|Opportunities|References|Full\s+Report|$))/i;
          cleanedFullText = cleanedFullText.replace(competitorsRegex, '').trim();
          
          // Remove any standalone "TAM:", "SAM:", "SOM:" lines that might be leftover (with N/A or empty values)
          cleanedFullText = cleanedFullText.replace(/^\s*(TAM|SAM|SOM):\s*(?:N\/A|\s*)$/gim, '').trim();
          
          // Remove any duplicate "Market Research Report:" title lines
          cleanedFullText = cleanedFullText.replace(/^Market\s+Research\s+Report:\s*[\w\s]+\s*$/gim, '').trim();
          
          // Clean up multiple consecutive blank lines
          cleanedFullText = cleanedFullText.replace(/\n{3,}/g, '\n\n').trim();
          
          // Only add if there's still meaningful content after cleaning (more than just whitespace/short text)
          if (cleanedFullText && cleanedFullText.length > 100) {
            lines.push(cleanedFullText);
          }
        }
        return lines.join('\n');
      })(),
    };
  };

  const markSecondaryFromReport = (report: any, shouldMarkComplete: boolean = false) => {
    const normalized = parseSecondaryReport(report);
    const insights: string[] = Array.isArray(normalized.insights) ? normalized.insights : [];
    // Initialize with 0% until the /20 score is computed
    const validationScore: ValidationScore = {
      tier: 'secondary',
      score: 0,
      status: 'warning',
      insights: insights.slice(0,4),
      data: normalized,
    };
    setValidationScores(prev => {
      // Update existing secondary score or add new one
      const existingIndex = prev.findIndex(s => s.tier === 'secondary');
      if (existingIndex >= 0) {
        // Update existing secondary score
        const updated = [...prev];
        updated[existingIndex] = validationScore;
        return updated;
      } else {
        // Add new secondary score
        return [...prev, validationScore];
      }
    });
    // Only mark as completed if explicitly requested (e.g., after user action)
    if (shouldMarkComplete) {
      setCompletedTiers(prev => prev.includes('secondary') ? prev : [...prev, 'secondary']);
    }
  };
  const loadExistingSecondaryIfAny = async () => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      
      // Check if backend marks secondary as complete
      let isBackendComplete = false;
      try {
        const roadmap = await apiClient.getTeamRoadmap(teamId);
        const validation = (roadmap as any)?.data?.validation || {};
        isBackendComplete = validation.secondary === true;
      } catch {}
      
      const reportRes = await apiClient.getDeepResearchReportTeam(teamId);
      const report = (reportRes.data as any)?.report;
      if (report) {
        // Mark as complete if backend says it's complete
        markSecondaryFromReport(report, isBackendComplete);
        
        // Also load the secondary score if it exists
        if (isBackendComplete) {
          try {
            const sec = await apiClient.getSecondaryScoreTeam(teamId);
            const s: any = (sec as any)?.data?.score;
            if (s && typeof s.final_score_20 === 'number') {
              const target = Math.max(0, Math.min(20, Number(s.final_score_20) || 0));
              setSecondaryScore20(target);
              setSecondaryScoreAnim(target);
              const percent = Math.round(target * 5);
              const mappedStatus = target >= 17 ? 'excellent' : target >= 14 ? 'good' : target >= 11 ? 'warning' : 'poor';
              setValidationScores(prev => prev.map(sv => sv.tier === 'secondary' ? { ...sv, score: percent, status: mappedStatus as any } : sv));
            }
          } catch {}
        }
      }
    } catch {}
  };

  const tiers = [
    {
      id: "secondary" as ValidationTier,
      title: "Secondary Data Analysis",
      description: "Web scraping & trend analysis",
      icon: Search,
      color: "text-info"
    },
    {
      id: "qualitative" as ValidationTier,
      title: "Qualitative Testing",
      description: "Focus groups & interviews",
      icon: MessageSquare,
      color: "text-warning"
    },
    {
      id: "quantitative" as ValidationTier,
      title: "Quantitative Testing", 
      description: "Surveys & statistical analysis",
      icon: BarChart3,
      color: "text-success"
    }
  ];

  const mapInterviewKit = (raw: any) => {
    console.log('DEBUG: mapInterviewKit called with raw data:', raw);
    if (!raw) return null;
    const data = raw.data || raw;
    console.log('DEBUG: mapInterviewKit data:', data);
    const user_personas = data.user_personas || data.interview_profiles || [];
    console.log('DEBUG: mapInterviewKit user_personas:', user_personas);
    const demographic_questions = data.demographic_questions || data.warm_up_questions || [];
    const market_validation_questions = data.market_validation_questions || [];
    const solution_questions = data.solution_questions || data.solution_feedback_questions || [];
    const result = {
      user_personas,
      demographic_questions,
      behavioral_questions: data.behavioral_questions || market_validation_questions,
      pain_point_questions: data.pain_point_questions || market_validation_questions,
      solution_questions,
      market_questions: data.market_questions || market_validation_questions,
      persona_validation_questions: data.persona_validation_questions || [],
      interview_strategy: data.interview_strategy || '',
      target_interview_count: data.target_interview_count || 15,
      interview_duration: data.interview_duration || '30-45 minutes',
    };
    console.log('DEBUG: mapInterviewKit result:', result);
    return result;
  };

  const runSecondaryValidation = async () => {
    setIsValidating(true);
    try {
      // Require current team id
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) throw new Error('Missing team id');

      // Kick off deep research (team-scoped)
      await apiClient.generateDeepResearchTeam(teamId);

      // Long-poll for status (resilient, up to ~15 minutes total if tab stays open)
      let reportReady = false;
      let waitedMs = 0;
      pollingAbortRef.current = false;
      while (!reportReady && !pollingAbortRef.current && waitedMs < 15 * 60 * 1000) {
        // Increase polling interval to reduce API calls and avoid 429 errors
        await new Promise(r => setTimeout(r, 5000)); // Changed from 1500ms to 5000ms
        waitedMs += 5000;
        try {
          const statusRes = await apiClient.getDeepResearchStatusTeam(teamId);
          const s = (statusRes.data as any)?.status;
          if (s === 'completed') { reportReady = true; break; }
          if (s === 'failed') throw new Error((statusRes.data as any)?.error_message || 'Deep research failed');
        } catch (error: any) {
          // If we get a 429 error, wait longer before retrying
          if (error?.response?.status === 429) {
            console.log('Rate limited, waiting 30 seconds before retry...');
            await new Promise(r => setTimeout(r, 30000));
            waitedMs += 30000;
          }
        }
      }

      // Fetch report
      const reportRes = await apiClient.getDeepResearchReportTeam(teamId);
      const report = (reportRes.data as any)?.report;
      if (!report) throw new Error('Deep research report not found');

      // Parse and normalize the report content
      const normalized = parseSecondaryReport(report);

      // Build 4-insight summary from extracted data or content
      const insights: string[] = [];
      const extracted = report || {};
      const marketInsights = extracted.market_insights || [];
      const competitive = extracted.competitive_analysis || [];
      const personas = extracted.personas || [];
      if (marketInsights.length) insights.push(String(marketInsights[0]));
      if (competitive.length) insights.push(`Competitive: ${competitive[0]?.competitor || 'key player'}`);
      if (extracted.tam) insights.push(`TAM: ${extracted.tam}`);
      if (personas.length) insights.push(`Persona: ${personas[0]?.name || 'Target persona identified'}`);
      while (insights.length < 4) insights.push('Key finding identified');

      // Initialize secondary tier with 0% (we will compute /20 and sync %)
      const score = 0;
      const status = 'warning' as const;
    
    const validationScore: ValidationScore = {
      tier: 'secondary',
      score,
      status,
      insights: normalized.insights.slice(0,4),
      data: normalized,
    };

    setValidationScores(prev => {
      // Update existing secondary score or add new one
      const existingIndex = prev.findIndex(s => s.tier === 'secondary');
      if (existingIndex >= 0) {
        // Update existing secondary score
        const updated = [...prev];
        updated[existingIndex] = validationScore;
        return updated;
      } else {
        // Add new secondary score
        return [...prev, validationScore];
      }
    });
      // Try to compute and fetch the secondary score (0–20) now that report exists
      try {
        await apiClient.computeSecondaryScoreTeam(teamId);
        const sec = await apiClient.getSecondaryScoreTeam(teamId);
        const s: any = (sec as any)?.data?.score;
        if (s && typeof s.final_score_20 === 'number') {
          setSecondaryScore20(Number(s.final_score_20) || 0);
          let current = 0;
          setSecondaryScoreAnim(0);
          const target = Math.max(0, Math.min(20, Number(s.final_score_20) || 0));
          const step = Math.max(1, Math.round(target / 20));
          const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            setSecondaryScoreAnim(current);
          }, 40);
          // Sync percentage in validationScores from the /20 score
          const percent = Math.round(target * 5);
          const mappedStatus = target >= 17 ? 'excellent' : target >= 14 ? 'good' : target >= 11 ? 'warning' : 'poor';
          setValidationScores(prev => prev.map(sv => sv.tier === 'secondary' ? { ...sv, score: percent, status: mappedStatus as any } : sv));
        }
      } catch {}
      setCompletedTiers(prev => [...prev, 'secondary']);
      // Mark backend team completion for secondary
      try { await apiClient.markValidationCompleted(teamId, { secondary: true }); } catch {}

      // Auto-open results after first generation completes
      setShowValidationResults(true);
      setIsReportExpanded(true);
    } catch (e: any) {
      console.error('Secondary research failed', e);
    } finally {
      setIsValidating(false);
    }
  };

  const runQualitativeValidation = async () => {
    setIsValidating(true);
    try {
      // Send analysis request if notes provided
      const ideaIdStr = lsGetScoped('xfactoryIdeaId');
      const ideaId = ideaIdStr ? Number(ideaIdStr) : null;
      if (ideaId && (uploadedFiles.length > 0 || analysisNotes.trim())) {
        // For now, we only send notes as transcript; file upload pipeline can be added later
        await apiClient.analyzeInterview(ideaId, {
          interview_transcript: analysisNotes || 'See uploaded attachments',
          interview_source: 'notes',
        });
      }
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const mockData = {
      focusGroupSize: 12,
      interviewCount: 8,
      keyThemes: ["Ease of use", "Time savings", "Team collaboration"],
      painPointValidation: "87% confirmed primary pain point",
      solutionFit: "73% would use proposed solution"
    };

    const score = Math.floor(Math.random() * 25) + 70;
    const status = score >= 85 ? "excellent" : score >= 75 ? "good" : score >= 65 ? "warning" : "poor";
    
    const validationScore: ValidationScore = {
      tier: "qualitative",
      score,
      status,
      insights: [
        "Users strongly relate to the core problem",
        "Solution approach resonates with target audience",
        "Key feature preferences identified",
        "Pricing sensitivity within acceptable range"
      ],
      data: mockData
    };

    setValidationScores(prev => [...prev, validationScore]);
    setCompletedTiers(prev => {
      const newTiers = [...prev];
      if (!newTiers.includes('interviews')) {
        newTiers.push('interviews');
      }
      // Check if both interviews and focus groups are completed
      if (newTiers.includes('interviews') && newTiers.includes('focus-groups')) {
        if (!newTiers.includes('qualitative')) {
          newTiers.push('qualitative');
        }
      }
      return newTiers;
    });
      // Mark backend team completion for qualitative
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (teamId) { await apiClient.markValidationCompleted(teamId, { qualitative: true }); }
        // Note: Survey generation should only happen when "Submit Evidence & Assemble Survey" is pressed
      } catch {}
    } finally {
    setIsValidating(false);
    }
  };

  const runQuantitativeValidation = async () => {
    setIsValidating(true);
    try {
      // Prefer team-scoped endpoints when available
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      const ideaIdStr = lsGetScoped('xfactoryIdeaId');
      const ideaId = ideaIdStr ? Number(ideaIdStr) : null;
      
      if (!teamId && !ideaId) throw new Error('Missing team id and idea id');
      
      // Generate survey ONLY now, on explicit action
      let surveyData;
      if (teamId) {
        try { surveyData = await apiClient.generateAISurveyTeam(teamId); } catch {}
      } else if (ideaId) {
        try { surveyData = await apiClient.generateAISurvey(ideaId); } catch {}
      }
      const questions = (surveyData?.data as any)?.questions || [];
      setAISurveyQuestions(Array.isArray(questions) ? questions : []);
      setSurveyAssembled(true); // Mark survey as assembled
      // 2) Show modal with instructions to create Google Form and a link field to submit survey link
      setShowSurvey(true);
    } catch (e) {
      console.error('Quantitative launch failed', e);
    } finally {
      setIsValidating(false);
    }
  };

  const generateQuantitativeReport = async () => {
    setIsValidating(true);
    try {
      const ideaIdStr = lsGetScoped('xfactoryIdeaId');
      const ideaId = ideaIdStr ? Number(ideaIdStr) : null;
      if (!ideaId) throw new Error('Missing idea id');
      const res = await apiClient.obtainQuantResults(ideaId);
      const ok = (res?.data as any)?.status === 'success';
      if (ok) {
        // Treat as completed tier
        const mockData = (res?.data as any) || {};
        const score = 82;
        const status = "good" as const;
        const validationScore: ValidationScore = {
          tier: "quantitative",
          score,
          status,
          insights: [
            "Quant results successfully obtained",
            "Export file stored in media",
            "Initial signals ready",
            "Proceed to analysis"
          ],
          data: mockData
        };
        setValidationScores(prev => [...prev, validationScore]);
        setCompletedTiers(prev => [...prev, "quantitative"]);
        setShowSurvey(false);
        try {
          const teamIdStr = localStorage.getItem('xfactoryTeamId');
          const teamId = teamIdStr ? Number(teamIdStr) : null;
          if (teamId) { await apiClient.markValidationCompleted(teamId, { quantitative: true }); }
        } catch {}
      }
    } catch (e) {
      console.error('Quantitative results fetch failed', e);
    } finally {
      setIsValidating(false);
    }
  };

  const calculateOverallScore = () => {
    // Additive scoring: Secondary up to 20 pts, Qualitative up to 30 pts, Quantitative up to 50 pts
    let ptsSecondary = 0; // out of 20
    let ptsQual = 0;      // out of 30
    let ptsQuant = 0;     // out of 50

    // Secondary from state (already in /20)
    try { ptsSecondary = Math.max(0, Math.min(20, Number(secondaryScore20 || 0))); } catch {}

    // Qual from backend score (final_score_10) scaled to /30 if available
    try {
      const qdata = (validationScores.find(s => s.tier === 'qualitative')?.data as any) || (qualScore as any) || {};
      const f10 = Number(qdata?.final_score_10 || 0);
      ptsQual = Math.max(0, Math.min(30, Math.round((f10 / 10) * 30)));
    } catch {}

    // Quant from quantitativeScore state (final_score_50) - already in /50
    try {
      ptsQuant = Math.max(0, Math.min(50, Number(quantitativeScore?.final_score_50 || 0)));
    } catch {}

    const total = Math.max(0, Math.min(100, Math.round(ptsSecondary + ptsQual + ptsQuant)));
    return total;
  };

  const getOverallStatus = () => {
    const score = calculateOverallScore();
    if (score >= 90) return "excellent";
    if (score >= 70) return "good"; 
    if (score >= 50) return "average";
    return "bad";
  };

  // Sync completion flags from server roadmap and merge into UI
  const syncValidationCompletionFromServer = async () => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      const res = await apiClient.getTeamRoadmap(teamId);
      const data: any = (res as any)?.data || {};
      const validation = data?.validation || {};
      console.log('DEBUG: Server validation state:', validation);
      const isQualDone = Boolean(validation?.qualitative);
      console.log('DEBUG: isQualDone:', isQualDone);
      if (isQualDone) {
        console.log('DEBUG: Marking qualitative as complete from server state');
        setCompletedTiers(prev => {
          const newTiers = [...prev];
          if (!newTiers.includes('interviews')) {
            newTiers.push('interviews');
          }
          if (!newTiers.includes('focus-groups')) {
            newTiers.push('focus-groups');
          }
          if (!newTiers.includes('qualitative')) {
            newTiers.push('qualitative');
          }
          console.log('DEBUG: Updated completedTiers:', newTiers);
          return newTiers;
        });
      }
    } catch (error) {
      console.error('DEBUG: Error syncing validation completion from server:', error);
    }
  };

  // Fetch qualitative insights + quant prompt snapshot and optionally mark as complete
  const loadQualSnapshot = async (autoCompleteIfPrompt = false) => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      // Fetch insights; tolerate 404 without marking done
      let insightsArr: Array<{ section: string; question: string; insight: string }> = [];
      try {
        const qi = await apiClient.getQualInsightsTeam(teamId);
        console.log('DEBUG: Full API response:', qi);
        const qidata: any = (qi as any)?.data || {};
        console.log('DEBUG: Raw qualitative insights response:', qidata);
        console.log('DEBUG: Response keys:', Object.keys(qidata));
        console.log('DEBUG: qidata.insights:', qidata?.insights);
        console.log('DEBUG: qidata.data:', qidata?.data);
        console.log('DEBUG: qidata.data?.insights:', qidata?.data?.insights);
        
        insightsArr = Array.isArray(qidata?.data) ? qidata.data : [];
        console.log('DEBUG: Parsed insights array:', insightsArr);
      } catch (e: any) {
        // Ignore 404; do not mark done
        console.log('DEBUG: Error loading qualitative insights:', e);
        insightsArr = [];
      }
      if (insightsArr.length) {
        console.log('DEBUG: Setting qualInsightsState to:', insightsArr);
        setQualInsightsState(insightsArr);
      } else {
        console.log('DEBUG: No insights to set, qualInsightsState remains empty');
      }

      // Load focus group insights
      try {
        const fgi = await apiClient.getFocusGroupInsightsTeam(teamId);
        const fgiData: any = (fgi as any)?.data || {};
        const fgiInsightsArr = Array.isArray(fgiData?.data) ? fgiData.data : [];
        console.log('DEBUG: Focus group insights loaded:', fgiInsightsArr);
        setFocusGroupInsightsState(fgiInsightsArr);
      } catch (e: any) {
        console.log('DEBUG: Error loading focus group insights:', e);
        setFocusGroupInsightsState([]);
      }

      // Load focus group data for questions
      try {
        const fg = await apiClient.get(`/validation/teams/${teamId}/focus-group/`);
        if (fg?.data?.success && fg.data.data) {
          console.log('DEBUG: Focus group data loaded:', fg.data.data);
          setFocusGroupData(fg.data.data);
        }
      } catch (e: any) {
        console.log('DEBUG: Error loading focus group data:', e);
        setFocusGroupData(null);
      }

      // Load qualitative score
      try {
        const qs = await apiClient.getQualitativeScoreTeam(teamId);
        const score: any = (qs as any)?.data?.score;
        if (score && typeof score.final_score_10 === 'number') {
          setQualScore(score);
          const score30 = Math.round(((score.final_score_10 || 0) / 10) * 30);
          const status = score.final_score_10 >= 8 ? 'excellent'
                       : score.final_score_10 >= 6 ? 'good'
                       : score.final_score_10 >= 4 ? 'warning' : 'poor';
          setValidationScores(prev => {
            const existing = prev.find(s => s.tier === 'qualitative');
            const entry = { tier: 'qualitative' as const, score: score30, status, insights: [], data: score };
            if (existing) return prev.map(s => s.tier === 'qualitative' ? entry as any : s);
            return [...prev, entry as any];
          });
        }
      } catch (e) {
        console.log('DEBUG: Error loading qualitative score:', e);
      }

      // Load quantitative prompt
      try {
        const qp = await apiClient.getTeamQuantPrompt(teamId);
        const qpRaw: any = qp || {};
        const qpData: any = qpRaw.data || {};
        const prompt = (typeof qpData?.prompt === 'string' && qpData.prompt) ||
                       (typeof qpData?.quant_prompt === 'string' && qpData.quant_prompt) ||
                       (typeof qpRaw?.prompt === 'string' && qpRaw.prompt) ||
                       (typeof qpData?.data?.prompt === 'string' && qpData.data.prompt) ||
                       (typeof qpData?.data?.quant_prompt === 'string' && qpData.data.quant_prompt) || '';
        if (prompt) {
          setPollfishPrompt(prompt);
        }
      } catch (e) {
        console.log('DEBUG: Error loading quantitative prompt:', e);
      }

      // Fetch prompt; only mark done if prompt exists (and not 404)
      try {
        const qp = await apiClient.getTeamQuantPrompt(teamId);
        const qpRaw: any = qp || {};
        const qpData: any = qpRaw.data || {};
        const prompt = (typeof qpData?.prompt === 'string' && qpData.prompt) ||
                       (typeof qpData?.quant_prompt === 'string' && qpData.quant_prompt) ||
                       (typeof qpRaw?.prompt === 'string' && qpRaw.prompt) ||
                       (typeof qpData?.data?.prompt === 'string' && qpData.data.prompt) ||
                       (typeof qpData?.data?.quant_prompt === 'string' && qpData.data.quant_prompt) || '';
        const statusOk = typeof qpRaw.status === 'number' ? (qpRaw.status >= 200 && qpRaw.status < 300) : true;
        if (statusOk && typeof prompt === 'string' && prompt.trim()) {
          console.log('DEBUG: Setting pollfishPrompt to:', prompt);
          setPollfishPrompt(prompt);
          if (autoCompleteIfPrompt) {
            setQualMarkedComplete(true);
            setCompletedTiers(prev => {
          const newTiers = [...prev];
          if (!newTiers.includes('interviews')) {
            newTiers.push('interviews');
          }
          // Check if both interviews and focus groups are completed
          if (newTiers.includes('interviews') && newTiers.includes('focus-groups')) {
            if (!newTiers.includes('qualitative')) {
              newTiers.push('qualitative');
            }
          }
          return newTiers;
        });
          }
          // Upsert qualitative in validationScores with latest insights/prompt
          setValidationScores(prev => {
            const next = [...prev];
            const idx = next.findIndex(s => s.tier === 'qualitative');
            const updated = {
              tier: 'qualitative' as const,
              score: idx >= 0 ? next[idx].score : 78,
              status: idx >= 0 ? next[idx].status : ('good' as const),
              insights: (Array.isArray(insightsArr) ? insightsArr : []).slice(0, 4),
              data: { ...(idx >= 0 ? (next[idx].data || {}) : {}), quant_prompt: prompt, insights: insightsArr }
            };
            if (idx >= 0) next[idx] = updated as any; else next.push(updated as any);
            return next;
          });
        }
      } catch (e: any) {
        // Ignore 404; do not mark done
      }
    } catch {}
  };

  const completeValidation = () => {
    const overallScore = calculateOverallScore();
    const status = getOverallStatus();
    
    onComplete({
      overallScore,
      status,
      tierScores: validationScores,
      recommendation: status === "excellent" || status === "good" ? "proceed" : "pivot",
      completedAt: new Date().toISOString()
    });
  };

  // Load qualitative score when entering qualitative tier
  useEffect(() => {
    if (currentTier === 'qualitative') {
      (async () => {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (!teamId) return;

        // Load qualitative score immediately when entering qualitative tier
        try {
          const qs = await apiClient.getQualitativeScoreTeam(teamId);
          const score: any = (qs as any)?.data?.score;
          if (score && typeof score.final_score_10 === 'number') {
            setQualScore(score);
            const score30 = Math.round(((score.final_score_10 || 0) / 10) * 30);
            const status = score.final_score_10 >= 8 ? 'excellent'
                         : score.final_score_10 >= 6 ? 'good'
                         : score.final_score_10 >= 4 ? 'warning' : 'poor';
            setValidationScores(prev => {
              const existing = prev.find(s => s.tier === 'qualitative');
              const entry = { tier: 'qualitative' as const, score: score30, status, insights: [], data: score };
              if (existing) return prev.map(s => s.tier === 'qualitative' ? entry as any : s);
              return [...prev, entry as any];
            });
          }
        } catch (e) {
          console.log('DEBUG: Error loading qualitative score on tier entry:', e);
        }
      })();
    }
  }, [currentTier]);

  // When the Validation Results dialog opens, refresh qualitative snapshot and mark done if prompt exists
  useEffect(() => {
    if (showValidationResults) {
      (async () => {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (!teamId) return;

        // Load all validation data (same as admin dashboard)
        await loadQualSnapshot(false); // Don't auto-complete based on prompt
        await syncValidationCompletionFromServer(); // Server state takes precedence
        
        // Load insights for the currently selected interview to ensure correct filtering
        // This will override the global insights with interview-specific ones
        if (selectedInterviewId) {
          await loadInsightsForInterview(selectedInterviewId);
        }

        // Load existing survey questions if they exist
        try {
          if (teamId) {
            const surveyData = await apiClient.getAISurveyTeam(teamId);
            const questions = (surveyData?.data as any)?.questions || [];
            if (Array.isArray(questions) && questions.length > 0) {
              setAISurveyQuestions(questions);
            }
          }
        } catch (e) {
          console.log('DEBUG: Error loading existing survey questions:', e);
        }

        if (interviews.length > 0) {
          // If no interview is selected but interviews exist, select the first one
          const firstInterviewId = interviews[0].id;
          setSelectedInterviewId(firstInterviewId);
          await loadInsightsForInterview(firstInterviewId);
        }
        
        // Load quantitative prompt for display in validation results
        try {
          const qp = await apiClient.getTeamQuantPrompt(teamId);
          const qpRaw: any = qp || {};
          const qpData: any = qpRaw.data || {};
          const prompt = (typeof qpData?.prompt === 'string' && qpData.prompt) ||
                         (typeof qpData?.quant_prompt === 'string' && qpData.quant_prompt) ||
                         (typeof qpRaw?.prompt === 'string' && qpRaw.prompt) ||
                         (typeof qpData?.data?.prompt === 'string' && qpData.data.prompt) ||
                         (typeof qpData?.data?.quant_prompt === 'string' && qpData.data.quant_prompt) || '';
          if (prompt) {
            setPollfishPrompt(prompt);
          }
        } catch (e) {
          console.log('DEBUG: Error loading quantitative prompt for validation results:', e);
        }
        
        // Quantitative score is now loaded when entering the station from ProductionLineFlow
        // No need to load it here in the validation results dialog
        
        // Survey questions are only loaded when "Assemble Survey" button is clicked
        // No automatic loading here to ensure survey is only shown when explicitly assembled
        
        // Personas/interview kit (team-scoped)
        try {
          const res = await apiClient.get(`/validation/teams/${teamId}/user-personas/`);
          const data = (res as any)?.data?.data;
          console.log('DEBUG: Personas data loaded:', data);
          if (data) {
            const mappedData = mapInterviewKit({ data });
            console.log('DEBUG: Mapped personas data:', mappedData);
            setPersonaKit(mappedData);
            console.log('DEBUG: PersonaKit state set to:', mappedData);
          }
        } catch (e) {
          console.log('DEBUG: Error loading personas:', e);
        }
        
        // Deep research (secondary validation)
        try { 
          const dr = await apiClient.getDeepResearchReportTeam(teamId); 
          console.log('DEBUG: Deep research data loaded:', (dr as any).data);
          setDeepResearch((dr as any).data || null); 
          // If a report exists, attempt to fetch the secondary score (0–20)
          try {
            const sec = await apiClient.getSecondaryScoreTeam(teamId);
            const s: any = (sec as any)?.data?.score;
            if (s && typeof s.final_score_20 === 'number') {
              setSecondaryScore20(Number(s.final_score_20) || 0);
              // Animate from 0 to final
              let current = 0;
              setSecondaryScoreAnim(0);
              const target = Math.max(0, Math.min(20, Number(s.final_score_20) || 0));
              const step = Math.max(1, Math.round(target / 20));
              const timer = setInterval(() => {
                current += step;
                if (current >= target) { current = target; clearInterval(timer); }
                setSecondaryScoreAnim(current);
              }, 40);
              // Also sync the percentage value used by overall score
              const percent = Math.round(target * 5);
              const mappedStatus = target >= 17 ? 'excellent' : target >= 14 ? 'good' : target >= 11 ? 'warning' : 'poor';
              setValidationScores(prev => prev.map(sv => sv.tier === 'secondary' ? { ...sv, score: percent, status: mappedStatus as any } : sv));
            } else {
              setSecondaryScore20(null);
              setSecondaryScoreAnim(0);
            }
          } catch {}
        } catch (e) {
          console.log('DEBUG: Error loading deep research:', e);
        }
        
        // Load interview sessions and qualitative score
        try { await loadInterviews(); } catch {}
        // Note: Qualitative score is loaded separately when needed, not on every data load

        // Note: Survey data should only be loaded when explicitly needed, not in validation results dialog
        
        // Validation evidence (for survey links, etc.)
        try { 
          const ev = await apiClient.getValidationEvidence(teamId); 
          console.log('DEBUG: Validation evidence loaded:', (ev as any).data);
          const evidenceData = (ev as any).data || null;
          setValidationEvidence(evidenceData);
          if (evidenceData) {
            setResponseVolume(evidenceData.response_volume ? String(evidenceData.response_volume) : "");
          }
          // Note: Evidence links are loaded in dedicated useEffect on component mount
        } catch (e) {
          console.log('DEBUG: Error loading validation evidence:', e);
        }
      })();
    }
  }, [showValidationResults]);

  const canProceedToNext = (tier: ValidationTier) => {
    const tierIndex = tiers.findIndex(t => t.id === tier);
    if (tierIndex === 0) return true;
    return completedTiers.includes(tiers[tierIndex - 1].id);
  };

  const fetchSecondarySummary = async () => {
    try {
      const teamIdStr = localStorage.getItem('xfactoryTeamId');
      const teamId = teamIdStr ? Number(teamIdStr) : null;
      if (!teamId) return;
      const reportRes = await apiClient.getDeepResearchReportTeam(teamId);
      const report = (reportRes.data as any)?.report;
      const summary = report?.summary || report?.content?.slice(0, 800) || '';
      // setSecondarySummary(summary || ''); // Removed secondary summary from DIY kit view per UX request
    } catch {}
  };

  // Resume polling if a report is in progress when user returns
  useEffect(() => {
    (async () => {
      // First, if a report already exists, mark it complete in UI
      await loadExistingSecondaryIfAny();
      try {
        const teamIdStr = localStorage.getItem('xfactoryTeamId');
        const teamId = teamIdStr ? Number(teamIdStr) : null;
        if (!teamId) return;
        const statusRes = await apiClient.getDeepResearchStatusTeam(teamId);
        const s = (statusRes.data as any)?.status;
        if (s === 'pending' || s === 'processing') {
          // Soft-resume: start a background poll without blocking UI
          setIsValidating(true);
          let reportReady = false;
          let waitedMs = 0;
          pollingAbortRef.current = false;
          while (!reportReady && !pollingAbortRef.current && waitedMs < 15 * 60 * 1000) {
            // Increase polling interval to reduce API calls and avoid 429 errors
            await new Promise(r => setTimeout(r, 5000)); // Changed from 2000ms to 5000ms
            waitedMs += 5000;
            try {
              const st = await apiClient.getDeepResearchStatusTeam(teamId);
              const stv = (st.data as any)?.status;
              if (stv === 'completed') { reportReady = true; break; }
              if (stv === 'failed') break;
            } catch (error: any) {
              // If we get a 429 error, wait longer before retrying
              if (error?.response?.status === 429) {
                console.log('Rate limited, waiting 30 seconds before retry...');
                await new Promise(r => setTimeout(r, 30000));
                waitedMs += 30000;
              }
            }
          }
          if (reportReady) {
            try {
              const reportRes = await apiClient.getDeepResearchReportTeam(teamId);
              const report = (reportRes.data as any)?.report;
              if (report) { 
                markSecondaryFromReport(report, true); // Mark complete since report just finished
              }
            } catch {}
          }
          setIsValidating(false);
        }
      } catch {}
    })();
    return () => { pollingAbortRef.current = true; };
  }, []);

  // When selecting Secondary tier, if a saved report exists, show it as completed
  useEffect(() => {
    if (currentTier === 'secondary' && !hasSecondaryScore()) {
      loadExistingSecondaryIfAny();
    }
  }, [currentTier]);

  // Markdown tables plugin intentionally omitted; install 'remark-gfm' and wire it if needed

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-success">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Validation Engine</h1>
                <p className="text-sm text-primary-foreground/80">
                  3-Tier Market Validation System
                </p>
              </div>
            </div>
            <Badge variant="success">Station 3</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Progress Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Validation Progress</h2>
            <div className="flex gap-3">
              {validationScores.length > 0 && (
                <Dialog open={showValidationResults} onOpenChange={setShowValidationResults}>
                  <Button 
                    variant="outline"
                    onClick={async () => { 
                      setIsLoadingResults(true);
                      try { 
                        await loadQualSnapshot(true); 
                      } catch {} 
                      setIsLoadingResults(false);
                      setShowValidationResults(true); 
                    }}
                    disabled={isLoadingResults}
                  >
                    {isLoadingResults ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Loading Results...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show Validation Results
                      </>
                    )}
                  </Button>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6" />
                        Validation Results Dashboard
                      </DialogTitle>
                      <DialogDescription>
                        Comprehensive market validation analysis across all tiers
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {isLoadingResults ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span className="text-lg">Loading validation results...</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Overall Score Card */}
                          <Card className="bg-gradient-machinery text-primary-foreground">
                        <CardHeader className="text-center">
                          <CardTitle className="text-3xl font-bold">
                            {calculateOverallScore()} / 100
                          </CardTitle>
                          <CardDescription className="text-primary-foreground/80 text-lg">
                            Overall Validation Score
                          </CardDescription>
                          <Progress value={calculateOverallScore()} className="h-3 mt-3" />
                          <Badge 
                            variant={getOverallStatus() === "excellent" ? "success" : 
                                    getOverallStatus() === "good" ? "default" : 
                                    getOverallStatus() === "average" ? "warning" : "destructive"}
                            className="mt-2"
                          >
                            {getOverallStatus().toUpperCase()}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Final score is additive: 20 (secondary) + 30 (qualitative) + 50 (quantitative)
                          </div>
                        </CardHeader>
                      </Card>

                      {/* Individual Score Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Secondary Score */}
                        <Card className="shadow-machinery">
                          <CardHeader className="text-center">
                            <CardTitle className="text-lg">Secondary Research</CardTitle>
                            <div className={`text-2xl font-bold ${
                              (secondaryScore20 ?? 0) >= 17 ? "text-success" :
                              (secondaryScore20 ?? 0) >= 14 ? "text-info" :
                              (secondaryScore20 ?? 0) >= 11 ? "text-warning" : "text-destructive"
                            }`}>
                              {secondaryScore20 !== null ? `${secondaryScore20}/20` : '0/20'}
                            </div>
                            <Progress value={secondaryScore20 !== null ? (secondaryScore20 / 20) * 100 : 0} className="h-2 mt-2" />
                            <Badge variant={
                              (secondaryScore20 ?? 0) >= 17 ? "success" :
                              (secondaryScore20 ?? 0) >= 14 ? "default" :
                              (secondaryScore20 ?? 0) >= 11 ? "warning" : "destructive"
                            } className="mt-2">
                              {secondaryScore20 !== null ? 
                                (secondaryScore20 >= 17 ? "Excellent" :
                                 secondaryScore20 >= 14 ? "Good" :
                                 secondaryScore20 >= 11 ? "Fair" : "Poor") : "Pending"
                              }
                            </Badge>
                          </CardHeader>
                        </Card>

                        {/* Qualitative Score */}
                        <Card className="shadow-machinery">
                          <CardHeader className="text-center">
                            <CardTitle className="text-lg">Qualitative Testing</CardTitle>
                            <div className={`text-2xl font-bold ${
                              (validationScores.find(s=>s.tier==='qualitative')?.status) === "excellent" ? "text-success" :
                              (validationScores.find(s=>s.tier==='qualitative')?.status) === "good" ? "text-info" :
                              (validationScores.find(s=>s.tier==='qualitative')?.status) === "warning" ? "text-warning" : "text-destructive"
                            }`}>
                              {(() => {
                                const qdata = (validationScores.find(s=>s.tier==='qualitative')?.data as any) || (qualScore as any) || {};
                                const f10 = Number(qdata?.final_score_10 || 0);
                                const score30 = Math.round((f10 / 10) * 30);
                                return `${score30}/30`;
                              })()}
                            </div>
                            <Progress value={(() => {
                              const qdata = (validationScores.find(s=>s.tier==='qualitative')?.data as any) || (qualScore as any) || {};
                              const f10 = Number(qdata?.final_score_10 || 0);
                              return (f10 / 10) * 100;
                            })()} className="h-2 mt-2" />
                            <Badge variant={
                              (validationScores.find(s=>s.tier==='qualitative')?.status) === "excellent" ? "success" :
                              (validationScores.find(s=>s.tier==='qualitative')?.status) === "good" ? "default" : 
                              (validationScores.find(s=>s.tier==='qualitative')?.status) === "warning" ? "warning" : "destructive"
                            } className="mt-2">
                              {(validationScores.find(s=>s.tier==='qualitative')?.status) || "Pending"}
                            </Badge>
                          </CardHeader>
                        </Card>

                        {/* Quantitative Score */}
                        <Card className="shadow-machinery">
                          <CardHeader className="text-center">
                            <CardTitle className="text-lg">Quantitative Testing</CardTitle>
                            <div className={`text-2xl font-bold ${
                              quantitativeScore ? "text-success" : "text-muted-foreground"
                            }`}>
                              {quantitativeScore ? `${Math.round(quantitativeScore.final_score_50 || 0)}/50` : '0/50'}
                            </div>
                            <Progress value={quantitativeScore ? (quantitativeScore.final_score_50 || 0) * 2 : 0} className="h-2 mt-2" />
                            <Badge variant={quantitativeScore ? "success" : "secondary"} className="mt-2">
                              {quantitativeScore ? "Scored" : "Pending"}
                            </Badge>
                          </CardHeader>
                        </Card>
                      </div>

                      {/* Qualitative Results Window (only if questions have been generated) */}
                      {(() => {
                        const hasQualQuestions = !!(personaKit && (
                          (personaKit.demographic_questions || []).length ||
                          (personaKit.behavioral_questions || []).length ||
                          (personaKit.pain_point_questions || []).length ||
                          (personaKit.solution_questions || []).length ||
                          (personaKit.market_questions || []).length ||
                          (personaKit.persona_validation_questions || []).length
                        ));
                        return hasQualQuestions ? (
                          <Card className="shadow-machinery">
                      
                          <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-primary-foreground" />
                              </div>
                              <div>
                                <CardTitle className="capitalize">Qualitative Validation</CardTitle>
                                <CardDescription>Focus groups & interviews</CardDescription>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                (validationScores.find(s=>s.tier==='qualitative')?.status) === "excellent" ? "text-success" :
                                (validationScores.find(s=>s.tier==='qualitative')?.status) === "good" ? "text-info" :
                                (validationScores.find(s=>s.tier==='qualitative')?.status) === "warning" ? "text-warning" : "text-destructive"
                              }`}>
                                {(() => {
                                  const qdata = (validationScores.find(s=>s.tier==='qualitative')?.data as any) || (qualScore as any) || {};
                                  const f10 = Number(qdata?.final_score_10 || 0);
                                  const score30 = Math.round((f10 / 10) * 30);
                                  return `${score30}/30`;
                                })()}
                              </div>
                              <Badge variant={
                                (validationScores.find(s=>s.tier==='qualitative')?.status) === "excellent" ? "success" :
                                (validationScores.find(s=>s.tier==='qualitative')?.status) === "good" ? "default" : 
                                (validationScores.find(s=>s.tier==='qualitative')?.status) === "warning" ? "warning" : "destructive"
                              }>
                                {(validationScores.find(s=>s.tier==='qualitative')?.status) || "pending"}
                              </Badge>
                            </div>
                          </div>
                          <Progress value={(() => {
                            const qdata = (validationScores.find(s=>s.tier==='qualitative')?.data as any) || (qualScore as any) || {};
                            const f10 = Number(qdata?.final_score_10 || 0);
                            return Math.round((f10 / 10) * 100);
                          })()} className="h-2 mt-3" />
                          </CardHeader>
                          <CardContent>
                          {/* Interview session selector for validation results */}
                          <div className="mb-6">
                            <div className="text-sm font-medium mb-2">Interview Session</div>
                              <select
                              className="w-full sm:w-auto px-3 py-2 border rounded bg-background text-foreground text-sm"
                                value={selectedInterviewId || ""}
                                onChange={async (e) => {
                                  const id = e.target.value ? Number(e.target.value) : null;
                                  setSelectedInterviewId(id);
                                  await loadInsightsForInterview(id);
                                }}
                              >
                              <option value="">All Interviews</option>
                                {interviews.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.title} {it.interviewee?.name ? `(${it.interviewee.name})` : ''}
                                </option>
                                ))}
                              </select>
                            </div>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Personas
                              </h4>
                              <div className="space-y-3">
                                {(() => {
                                  console.log('DEBUG: Rendering personas, personaKit:', personaKit);
                                  console.log('DEBUG: user_personas:', personaKit?.user_personas);
                                  return (personaKit?.user_personas || []).slice(0,3);
                                })().map((p: any, idx: number) => (
                                  <div key={idx} className="p-3 rounded border bg-muted/30">
                                    <div className="text-sm font-medium">{p?.name || `Persona ${idx+1}`}</div>
                                    <div className="text-xs text-muted-foreground">{[p?.age, p?.occupation].filter(Boolean).join(' · ')}</div>
                                    {(p?.brief_description || p?.description) && (
                                      <div className="text-xs text-muted-foreground mt-1">{String(p.brief_description || p.description).slice(0,160)}{String(p.brief_description || p.description).length>160?'…':''}</div>
                                    )}
                                  </div>
                                ))}
                                {(!personaKit?.user_personas || personaKit.user_personas.length === 0) && (
                                  <div className="text-sm text-muted-foreground">No personas yet.</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Quantitative Prompt
                              </h4>
                              <div className="p-3 rounded border bg-muted/30 text-sm whitespace-pre-wrap min-h-[60px]">
                                {(() => {
                                  console.log('DEBUG: Rendering quantitative prompt, pollfishPrompt:', pollfishPrompt);
                                  console.log('DEBUG: Quantitative data for prompt:', quantitativeData);
                                  console.log('DEBUG: Quantitative data keys:', quantitativeData ? Object.keys(quantitativeData) : 'null');
                                  
                                  // Try multiple possible locations for the prompt
                                  const prompt = pollfishPrompt || 
                                               quantitativeData?.prompt || 
                                               quantitativeData?.quant_prompt || 
                                               quantitativeData?.data?.prompt ||
                                               quantitativeData?.data?.quant_prompt ||
                                               'Not yet available.';
                                  
                                  console.log('DEBUG: Final prompt value:', prompt);
                                  return prompt;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" /> Qualitative Questions & Insights
                              </h4>
                              <div className="flex space-x-2">
                                <Button
                                  variant={qualitativeViewMode === 'interview' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setQualitativeViewMode('interview')}
                                >
                                  Interview
                                </Button>
                                <Button
                                  variant={qualitativeViewMode === 'focus-group' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setQualitativeViewMode('focus-group')}
                                >
                                  Focus Group
                                </Button>
                              </div>
                            </div>
                            
                            {/* Display questions based on selected view mode */}
                            {(() => {
                              console.log('Qualitative insights state:', qualInsightsState);
                              console.log('Focus group insights state:', focusGroupInsightsState);
                              console.log('PersonaKit state:', personaKit);
                              console.log('Deep research state:', deepResearch);
                              console.log('Quantitative data state:', quantitativeData);
                              console.log('Validation evidence state:', validationEvidence);
                              
                              // Collect all questions based on view mode
                              const allQuestions: Array<{section: string, question: string, insight?: string}> = [];
                              
                              if (qualitativeViewMode === 'interview' && personaKit) {
                                // Add demographic questions
                                if (personaKit.demographic_questions?.length > 0) {
                                  personaKit.demographic_questions.forEach((q: string) => {
                                    const insight = qualInsightsState.find((i: any) => i.section === 'demographic' && i.question === q);
                                    allQuestions.push({
                                      section: 'demographic',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                }
                                
                                // Add behavioral questions
                                if (personaKit.behavioral_questions?.length > 0) {
                                  personaKit.behavioral_questions.forEach((q: string) => {
                                    const insight = qualInsightsState.find((i: any) => i.section === 'behavioral' && i.question === q);
                                    allQuestions.push({
                                      section: 'behavioral',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                }
                                
                                // Add pain point questions
                                if (personaKit.pain_point_questions?.length > 0) {
                                  personaKit.pain_point_questions.forEach((q: string) => {
                                    const insight = qualInsightsState.find((i: any) => i.section === 'pain_point' && i.question === q);
                                    allQuestions.push({
                                      section: 'pain_point',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                }
                                
                                // Add solution questions
                                if (personaKit.solution_questions?.length > 0) {
                                  personaKit.solution_questions.forEach((q: string) => {
                                    const insight = qualInsightsState.find((i: any) => i.section === 'solution' && i.question === q);
                                    allQuestions.push({
                                      section: 'solution',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                }
                              } else if (qualitativeViewMode === 'focus-group') {
                                // Display focus group questions and insights - exactly matching FocusGroupKit structure
                                if (focusGroupData) {
                                  // Add opening prompts (problem validation) - max 3 questions
                                  const problemQuestions = focusGroupData.opening_prompts?.slice(0, 3) || [
                                    `How often do you encounter ${ideaCard?.problem || 'this problem'}?`,
                                    "What have you tried to solve this?",
                                    "On a scale of 1-10, how frustrating is this?"
                                  ];
                                  problemQuestions.forEach((q: string, i: number) => {
                                    const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'problem' && insight.question === `problem_${i}`);
                                    allQuestions.push({
                                      section: 'problem',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                  
                                  // Add key discussion prompts (solution feedback) - max 3 questions
                                  const solutionQuestions = focusGroupData.key_discussion_prompts?.slice(0, 3) || [
                                    `What's your first impression of ${ideaCard?.solution || 'this solution'}?`,
                                    `Would this solve your ${ideaCard?.problem || 'problem'}?`,
                                    "How likely are you to use this? (1-10)"
                                  ];
                                  solutionQuestions.forEach((q: string, i: number) => {
                                    const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'solution' && insight.question === `solution_${i}`);
                                    allQuestions.push({
                                      section: 'solution',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                  
                                  // Add market prompts (pricing & adoption) - max 2 questions
                                  const pricingQuestions = focusGroupData.market_prompts?.slice(0, 2) || [
                                    "What would you expect to pay?",
                                    "Who makes the purchase decision?"
                                  ];
                                  pricingQuestions.forEach((q: string, i: number) => {
                                    const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'pricing' && insight.question === `pricing_${i}`);
                                    allQuestions.push({
                                      section: 'pricing',
                                      question: q,
                                      insight: insight?.insight
                                    });
                                  });
                                } else {
                                  // Fallback to default questions if no focus group data
                                  const defaultQuestions = [
                                    { section: 'problem', question: `How often do you encounter ${ideaCard?.problem || 'this problem'}?`, key: 'problem_0' },
                                    { section: 'problem', question: "What have you tried to solve this?", key: 'problem_1' },
                                    { section: 'problem', question: "On a scale of 1-10, how frustrating is this?", key: 'problem_2' },
                                    { section: 'solution', question: `What's your first impression of ${ideaCard?.solution || 'this solution'}?`, key: 'solution_0' },
                                    { section: 'solution', question: `Would this solve your ${ideaCard?.problem || 'problem'}?`, key: 'solution_1' },
                                    { section: 'solution', question: "How likely are you to use this? (1-10)", key: 'solution_2' },
                                    { section: 'pricing', question: "What would you expect to pay?", key: 'pricing_0' },
                                    { section: 'pricing', question: "Who makes the purchase decision?", key: 'pricing_1' }
                                  ];
                                  
                                  defaultQuestions.forEach((q) => {
                                    const insight = focusGroupInsightsState.find((insight: any) => insight.section === q.section && insight.question === q.key);
                                    allQuestions.push({
                                      section: q.section,
                                      question: q.question,
                                      insight: insight?.insight
                                    });
                                  });
                                }
                              }
                              
                              return allQuestions.length > 0;
                            })() ? (
                              <div className="space-y-4">
                                {qualitativeViewMode === 'interview' && (
                                  <div>
                                    <div className="text-xs font-medium mb-1">Interview Session</div>
                                    <select
                                      className="w-full sm:w-auto px-2 py-1 border rounded bg-background text-foreground text-sm"
                                      value={selectedInterviewId || ""}
                                      onChange={async (e) => {
                                        const id = e.target.value ? Number(e.target.value) : null;
                                        setSelectedInterviewId(id);
                                        await loadInsightsForInterview(id);
                                      }}
                                    >
                                      {interviews.length === 0 && <option value="">No sessions</option>}
                                      {interviews.map((it) => (
                                        <option key={it.id} value={it.id}>{it.title}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground mb-3">
                                  {(() => {
                                    const allQuestions: Array<{section: string, question: string, insight?: string}> = [];
                                    if (qualitativeViewMode === 'interview' && personaKit) {
                                      if (personaKit.demographic_questions?.length > 0) {
                                        personaKit.demographic_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'demographic' && i.question === q);
                                          allQuestions.push({section: 'demographic', question: q, insight: insight?.insight});
                                        });
                                      }
                                      if (personaKit.behavioral_questions?.length > 0) {
                                        personaKit.behavioral_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'behavioral' && i.question === q);
                                          allQuestions.push({section: 'behavioral', question: q, insight: insight?.insight});
                                        });
                                      }
                                      if (personaKit.pain_point_questions?.length > 0) {
                                        personaKit.pain_point_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'pain_point' && i.question === q);
                                          allQuestions.push({section: 'pain_point', question: q, insight: insight?.insight});
                                        });
                                      }
                                      if (personaKit.solution_questions?.length > 0) {
                                        personaKit.solution_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'solution' && i.question === q);
                                          allQuestions.push({section: 'solution', question: q, insight: insight?.insight});
                                        });
                                      }
                                    } else if (qualitativeViewMode === 'focus-group') {
                                      // Add focus group questions - exactly matching FocusGroupKit structure
                                      if (focusGroupData) {
                                        // Problem validation - max 3 questions
                                        const problemQuestions = focusGroupData.opening_prompts?.slice(0, 3) || [
                                          `How often do you encounter ${ideaCard?.problem || 'this problem'}?`,
                                          "What have you tried to solve this?",
                                          "On a scale of 1-10, how frustrating is this?"
                                        ];
                                        problemQuestions.forEach((q: string, i: number) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'problem' && insight.question === `problem_${i}`);
                                          allQuestions.push({section: 'problem', question: q, insight: insight?.insight});
                                        });
                                        
                                        // Solution feedback - max 3 questions
                                        const solutionQuestions = focusGroupData.key_discussion_prompts?.slice(0, 3) || [
                                          `What's your first impression of ${ideaCard?.solution || 'this solution'}?`,
                                          `Would this solve your ${ideaCard?.problem || 'problem'}?`,
                                          "How likely are you to use this? (1-10)"
                                        ];
                                        solutionQuestions.forEach((q: string, i: number) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'solution' && insight.question === `solution_${i}`);
                                          allQuestions.push({section: 'solution', question: q, insight: insight?.insight});
                                        });
                                        
                                        // Pricing & adoption - max 2 questions
                                        const pricingQuestions = focusGroupData.market_prompts?.slice(0, 2) || [
                                          "What would you expect to pay?",
                                          "Who makes the purchase decision?"
                                        ];
                                        pricingQuestions.forEach((q: string, i: number) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'pricing' && insight.question === `pricing_${i}`);
                                          allQuestions.push({section: 'pricing', question: q, insight: insight?.insight});
                                        });
                                      } else {
                                        // Fallback to default questions
                                        const defaultQuestions = [
                                          { section: 'problem', question: `How often do you encounter ${ideaCard?.problem || 'this problem'}?`, key: 'problem_0' },
                                          { section: 'problem', question: "What have you tried to solve this?", key: 'problem_1' },
                                          { section: 'problem', question: "On a scale of 1-10, how frustrating is this?", key: 'problem_2' },
                                          { section: 'solution', question: `What's your first impression of ${ideaCard?.solution || 'this solution'}?`, key: 'solution_0' },
                                          { section: 'solution', question: `Would this solve your ${ideaCard?.problem || 'problem'}?`, key: 'solution_1' },
                                          { section: 'solution', question: "How likely are you to use this? (1-10)", key: 'solution_2' },
                                          { section: 'pricing', question: "What would you expect to pay?", key: 'pricing_0' },
                                          { section: 'pricing', question: "Who makes the purchase decision?", key: 'pricing_1' }
                                        ];
                                        
                                        defaultQuestions.forEach((q) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === q.section && insight.question === q.key);
                                          allQuestions.push({section: q.section, question: q.question, insight: insight?.insight});
                                        });
                                      }
                                    }
                                    const answeredCount = allQuestions.filter(q => q.insight).length;
                                    return `${answeredCount} of ${allQuestions.length} questions answered`;
                                  })()}
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {(() => {
                                    const allQuestions: Array<{section: string, question: string, insight?: string}> = [];
                                    if (qualitativeViewMode === 'interview' && personaKit) {
                                      if (personaKit.demographic_questions?.length > 0) {
                                        personaKit.demographic_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'demographic' && i.question === q);
                                          allQuestions.push({section: 'demographic', question: q, insight: insight?.insight});
                                        });
                                      }
                                      if (personaKit.behavioral_questions?.length > 0) {
                                        personaKit.behavioral_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'behavioral' && i.question === q);
                                          allQuestions.push({section: 'behavioral', question: q, insight: insight?.insight});
                                        });
                                      }
                                      if (personaKit.pain_point_questions?.length > 0) {
                                        personaKit.pain_point_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'pain_point' && i.question === q);
                                          allQuestions.push({section: 'pain_point', question: q, insight: insight?.insight});
                                        });
                                      }
                                      if (personaKit.solution_questions?.length > 0) {
                                        personaKit.solution_questions.forEach((q: string) => {
                                          const insight = qualInsightsState.find((i: any) => i.section === 'solution' && i.question === q);
                                          allQuestions.push({section: 'solution', question: q, insight: insight?.insight});
                                        });
                                      }
                                    } else if (qualitativeViewMode === 'focus-group') {
                                      // Add focus group questions - exactly matching FocusGroupKit structure
                                      if (focusGroupData) {
                                        // Problem validation - max 3 questions
                                        const problemQuestions = focusGroupData.opening_prompts?.slice(0, 3) || [
                                          `How often do you encounter ${ideaCard?.problem || 'this problem'}?`,
                                          "What have you tried to solve this?",
                                          "On a scale of 1-10, how frustrating is this?"
                                        ];
                                        problemQuestions.forEach((q: string, i: number) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'problem' && insight.question === `problem_${i}`);
                                          allQuestions.push({section: 'problem', question: q, insight: insight?.insight});
                                        });
                                        
                                        // Solution feedback - max 3 questions
                                        const solutionQuestions = focusGroupData.key_discussion_prompts?.slice(0, 3) || [
                                          `What's your first impression of ${ideaCard?.solution || 'this solution'}?`,
                                          `Would this solve your ${ideaCard?.problem || 'problem'}?`,
                                          "How likely are you to use this? (1-10)"
                                        ];
                                        solutionQuestions.forEach((q: string, i: number) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'solution' && insight.question === `solution_${i}`);
                                          allQuestions.push({section: 'solution', question: q, insight: insight?.insight});
                                        });
                                        
                                        // Pricing & adoption - max 2 questions
                                        const pricingQuestions = focusGroupData.market_prompts?.slice(0, 2) || [
                                          "What would you expect to pay?",
                                          "Who makes the purchase decision?"
                                        ];
                                        pricingQuestions.forEach((q: string, i: number) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === 'pricing' && insight.question === `pricing_${i}`);
                                          allQuestions.push({section: 'pricing', question: q, insight: insight?.insight});
                                        });
                                      } else {
                                        // Fallback to default questions
                                        const defaultQuestions = [
                                          { section: 'problem', question: `How often do you encounter ${ideaCard?.problem || 'this problem'}?`, key: 'problem_0' },
                                          { section: 'problem', question: "What have you tried to solve this?", key: 'problem_1' },
                                          { section: 'problem', question: "On a scale of 1-10, how frustrating is this?", key: 'problem_2' },
                                          { section: 'solution', question: `What's your first impression of ${ideaCard?.solution || 'this solution'}?`, key: 'solution_0' },
                                          { section: 'solution', question: `Would this solve your ${ideaCard?.problem || 'problem'}?`, key: 'solution_1' },
                                          { section: 'solution', question: "How likely are you to use this? (1-10)", key: 'solution_2' },
                                          { section: 'pricing', question: "What would you expect to pay?", key: 'pricing_0' },
                                          { section: 'pricing', question: "Who makes the purchase decision?", key: 'pricing_1' }
                                        ];
                                        
                                        defaultQuestions.forEach((q) => {
                                          const insight = focusGroupInsightsState.find((insight: any) => insight.section === q.section && insight.question === q.key);
                                          allQuestions.push({section: q.section, question: q.question, insight: insight?.insight});
                                        });
                                      }
                                    }
                                    return allQuestions;
                                  })().map((q: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded border bg-muted/30">
                                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                        {q.section?.replace(/_/g, ' ') || 'General'}
                                      </div>
                                      <div className="text-sm font-medium mb-2">{q.question}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {q.insight || 'No insight saved yet.'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <div className="text-sm">No interview questions available yet.</div>
                                <div className="text-xs mt-1">Complete the qualitative validation to see your questions and insights here.</div>
                              </div>
                            )}
                          </div>
                          
                          
                          {/* Removed AI Survey Questions preview from qualitative */}
                        </CardContent>
                          </Card>
                        ) : null;
                      })()}


          
                        


                        {/* Quantitative Survey Section - appears only when assemble survey is clicked */}
                        {isSurveyAssembled() && (
                          <Card className="shadow-machinery">
                           <CardHeader>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                                    <PieChart className="h-6 w-6 text-primary-foreground" />
                               </div>
                                  <div>
                                    <CardTitle className="capitalize">Quantitative Testing</CardTitle>
                                    <CardDescription>Surveys & statistical analysis</CardDescription>
                             </div>
                               </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-success">
                                    {quantitativeScore ? `${Math.round(quantitativeScore.final_score_50 || 0)}/50` : '0/50'}
                               </div>
                                  <Badge variant="success">
                                    {quantitativeScore ? 'Scored' : 'Generated'}
                                  </Badge>
                             </div>
                             </div>
                              <Progress value={quantitativeScore ? (quantitativeScore.final_score_50 || 0) * 2 : 0} className="h-2 mt-3" />
                            </CardHeader>
                            <CardContent>
                              <div className="grid md:grid-cols-1 gap-6">
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    Survey Questions
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {aiSurveyQuestions.map((q, i) => (
                                      <div key={q.id} className="p-3 rounded border bg-muted/20">
                                        <div className="text-sm font-medium mb-2">{q.text}</div>
                                        <div className="text-xs text-muted-foreground mb-2">
                                          {q.type === 'multiple_choice' && 'Multiple Choice'}
                                          {q.type === 'multi_select' && 'Multi Select'}
                                          {q.type === 'scale_0_100' && 'Scale (0-100)'}
                                          {q.type === 'open' && 'Open Text'}
                                </div>
                                        <div className="space-y-1">
                                          <label className="text-xs font-medium text-muted-foreground">Insights:</label>
                                          <div className="text-xs text-foreground bg-background/50 p-2 rounded border">
                                            {quantitativeInsights[q.id || `q${i}`] || 'No insights saved yet'}
                              </div>
                                </div>
                                      </div>
                                    ))}
                                </div>
                              </div>


                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Detailed Results by Tier */}
                        <div className="grid gap-4">
                         {validationScores.filter(s => s.tier !== 'qualitative').map((score, index) => {
                          const tier = tiers.find(t => t.id === score.tier);
                          const Icon = tier?.icon || Target;
                          
                          return (
                            <Card key={score.tier} className="shadow-machinery">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                                      <Icon className="h-6 w-6 text-primary-foreground" />
                                    </div>
                                    <div>
                                      <CardTitle className="capitalize">{score.tier} Validation</CardTitle>
                                      <CardDescription>{tier?.description}</CardDescription>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {score.tier === 'secondary' ? (
                                      <>
                                        <div className={`text-2xl font-bold ${
                                          (secondaryScore20 ?? 0) >= 17 ? "text-success" :
                                          (secondaryScore20 ?? 0) >= 14 ? "text-info" :
                                          (secondaryScore20 ?? 0) >= 11 ? "text-warning" : "text-destructive"
                                        }`}>
                                          {secondaryScore20 !== null ? `${secondaryScoreAnim}/20` : '—/20'}
                                        </div>
                                        <Badge variant={
                                          (secondaryScore20 ?? 0) >= 17 ? 'success' :
                                          (secondaryScore20 ?? 0) >= 14 ? 'default' :
                                          (secondaryScore20 ?? 0) >= 11 ? 'warning' : 'destructive'
                                        }>
                                          {secondaryScore20 !== null ? ((secondaryScore20 >= 17 ? 'excellent' : secondaryScore20 >= 14 ? 'good' : secondaryScore20 >= 11 ? 'warning' : 'poor')) : 'pending'}
                                        </Badge>
                                      </>
                                    ) : (
                                      <>
                                        <div className={`text-2xl font-bold ${
                                          score.status === "excellent" ? "text-success" :
                                          score.status === "good" ? "text-info" :
                                          score.status === "warning" ? "text-warning" : "text-destructive"
                                        }`}>
                                          {score.score}%
                                        </div>
                                        <Badge variant={
                                          score.status === "excellent" ? "success" :
                                          score.status === "good" ? "default" : 
                                          score.status === "warning" ? "warning" : "destructive"
                                        }>
                                          {score.status}
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <Progress value={score.tier === 'secondary' ? (secondaryScore20 !== null ? (secondaryScoreAnim / 20) * 100 : 0) : score.score} className="h-2 mt-3" />
                              </CardHeader>
                              
                              <CardContent>
                                 {score.tier === "secondary" ? (
                                    // Full-width secondary research report
                                    <div className="col-span-full">
                                      {/* Secondary score now shown in header filler; keep only the generate button here if needed */}
                                      {secondaryScore20 === null && deepResearch?.report ? (
                                        <div className="mb-4 flex items-center justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={secondaryScoreLoading}
                                            onClick={async () => {
                                              try {
                                                setSecondaryScoreLoading(true);
                                                const teamIdStr = localStorage.getItem('xfactoryTeamId');
                                                const teamId = teamIdStr ? Number(teamIdStr) : null;
                                                if (!teamId) return;
                                                await apiClient.computeSecondaryScoreTeam(teamId);
                                                // Fetch and animate
                                                const sec = await apiClient.getSecondaryScoreTeam(teamId);
                                                const s: any = (sec as any)?.data?.score;
                                                if (s && typeof s.final_score_20 === 'number') {
                                                  setSecondaryScore20(Number(s.final_score_20) || 0);
                                                  let current = 0;
                                                  setSecondaryScoreAnim(0);
                                                  const target = Math.max(0, Math.min(20, Number(s.final_score_20) || 0));
                                                  const step = Math.max(1, Math.round(target / 20));
                                                  const timer = setInterval(() => {
                                                    current += step;
                                                    if (current >= target) { current = target; clearInterval(timer); }
                                                    setSecondaryScoreAnim(current);
                                                  }, 40);
                                                  const percent = Math.round(target * 5);
                                                  const mappedStatus = target >= 17 ? 'excellent' : target >= 14 ? 'good' : target >= 11 ? 'warning' : 'poor';
                                                  setValidationScores(prev => prev.map(sv => sv.tier === 'secondary' ? { ...sv, score: percent, status: mappedStatus as any } : sv));
                                                }
                                              } finally {
                                                setSecondaryScoreLoading(false);
                                              }
                                            }}
                                          >
                                            {secondaryScoreLoading ? 'Scoring...' : 'Generate Secondary Score'}
                                          </Button>
                                        </div>
                                      ) : null}
                                      <div className="mb-6">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                          <Lightbulb className="h-4 w-4" />
                                          Key Insights
                                        </h4>
                                       <ul className="space-y-2">
                                         {score.insights.map((insight, idx) => (
                                           <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                             <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                             {insight}
                                           </li>
                                         ))}
                                       </ul>
                                     </div>

                                     <div>
                                       <h4 className="font-semibold mb-3 flex items-center gap-2">
                                         <FileText className="h-4 w-4" />
                                         Full Research Report
                                       </h4>
                                       {/* Redo button to re-run Secondary Data Analysis if needed */}
                                       <div className="mb-3 flex justify-end">
                                         <Button 
                                           variant="outline" 
                                           size="sm" 
                                           onClick={async () => {
                                             setIsRedoingSecondary(true);
                                             try {
                                               await runSecondaryValidation();
                                               // Force refresh of validation scores to ensure UI updates
                                               const teamIdStr = localStorage.getItem('xfactoryTeamId');
                                               const teamId = teamIdStr ? Number(teamIdStr) : null;
                                               if (teamId) {
                                                 try {
                                                   const reportRes = await apiClient.getDeepResearchReportTeam(teamId);
                                                   const report = (reportRes.data as any)?.report;
                                                   if (report) {
                                                     markSecondaryFromReport(report, true); // Mark complete after regeneration
                                                   }
                                                 } catch (error) {
                                                   console.error('Failed to refresh report after regeneration:', error);
                                                 }
                                               }
                                             } finally {
                                               setIsRedoingSecondary(false);
                                             }
                                           }}
                                           disabled={isRedoingSecondary || isValidating}
                                         >
                                           {isRedoingSecondary ? (
                                             <>
                                               <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                               Re-running...
                                             </>
                                           ) : (
                                             <>
                                               ↻ Redo Secondary Analysis
                                             </>
                                           )}
                                         </Button>
                                       </div>
                                       <Collapsible open={isReportExpanded} onOpenChange={setIsReportExpanded}>
                                         <div className="border border-border rounded-lg bg-muted/30 overflow-hidden">
                                           <div className="p-3 bg-gradient-machinery/20 border-b border-border">
                                             <div className="flex items-center gap-2 text-sm font-medium">
                                               <FileText className="h-4 w-4" />
                                               Market Research Report
                                             </div>
                                           </div>
                                           <div className="relative">
                                             <div className={`transition-all duration-300 overflow-hidden ${isReportExpanded ? '' : 'max-h-32'}`}>
                                               <div className="prose prose-sm max-w-none p-4 text-sm leading-relaxed">
                                                 <ReactMarkdown 
                                                   components={{
                                                     h1: ({children}) => <h1 className="text-lg font-bold mb-3 text-primary border-b border-border pb-2">{children}</h1>,
                                                     h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-primary mt-4">{children}</h2>,
                                                     h3: ({children}) => <h3 className="text-sm font-medium mb-2 text-foreground mt-3">{children}</h3>,
                                                     ul: ({children}) => <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">{children}</ul>,
                                                     li: ({children}) => <li className="text-sm">{children}</li>,
                                                     p: ({children}) => <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>,
                                                     strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                                                     table: ({children}) => (
                                                       <div className="overflow-x-auto my-3">
                                                         <table className="w-full text-left border-collapse">
                                                           {children}
                                                         </table>
                                                       </div>
                                                     ),
                                                     thead: ({children}) => <thead className="bg-muted/50">{children}</thead>,
                                                     th: ({children}) => <th className="border border-border px-3 py-2 text-foreground font-medium">{children}</th>,
                                                     td: ({children}) => <td className="border border-border px-3 py-2 text-muted-foreground align-top">{children}</td>,
                                                     tr: ({children}) => <tr className="odd:bg-background even:bg-muted/10">{children}</tr>,
                                                   }}
                                                 >
                                                   {score.data.report || "No detailed report available."}
                                                 </ReactMarkdown>
                                               </div>
                                             </div>
                                             {!isReportExpanded && (
                                               <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
                                             )}
                                           </div>
                                           <CollapsibleTrigger asChild>
                                             <Button 
                                               variant="ghost" 
                                               size="sm" 
                                               className="w-full justify-center border-t border-border bg-background hover:bg-muted/50 transition-all duration-200 py-3"
                                             >
                                               <span className="flex items-center gap-2 text-sm font-medium">
                                                 <span>{isReportExpanded ? 'Click to collapse report' : 'Click to expand full report'}</span>
                                                 <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isReportExpanded ? 'rotate-180' : ''}`} />
                                               </span>
                                             </Button>
                                           </CollapsibleTrigger>
                                         </div>
                                       </Collapsible>
                                     </div>
                                   </div>
                                 ) : (
                                   // Regular two-column layout for other tiers
                                   <div className="grid md:grid-cols-2 gap-6">
                                     <div>
                                       <h4 className="font-semibold mb-3 flex items-center gap-2">
                                         <Lightbulb className="h-4 w-4" />
                                         Key Insights
                                       </h4>
                                       <ul className="space-y-2">
                                         {score.insights.map((insight, idx) => (
                                           <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                             <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                             {insight}
                                           </li>
                                         ))}
                                       </ul>
                                       {score.tier === 'qualitative' && (
                                         <div className="mt-4 p-3 rounded border bg-muted/30">
                                           <h5 className="font-medium mb-2">Quantitative Research Prompt</h5>
                                           <div className="text-sm whitespace-pre-wrap text-muted-foreground">{(score as any)?.data?.quant_prompt || pollfishPrompt || 'Not yet available.'}</div>
                                         </div>
                                       )}
                                     </div>
                                     
                                     <div>
                                       <h4 className="font-semibold mb-3 flex items-center gap-2">
                                         <BarChart3 className="h-4 w-4" />
                                         Data Points
                                       </h4>
                                       <div className="space-y-2">
                                         {(() => {
                                           // For qualitative, show per-question insights if available; fallback to takeaways otherwise
                                           if (score.tier === 'qualitative') {
                                             // Filter insights by selected interview first
                                             let qaItems: Array<{ question?: string; insight?: string }> = [];
                                             const allInsights = Array.isArray(qualInsightsState) ? qualInsightsState : [];
                                             
                                             if (selectedInterviewId) {
                                               // Filter insights that belong to the selected interview
                                               qaItems = allInsights.filter((insight: any) => 
                                                 insight.interview_id === selectedInterviewId || 
                                                 insight.interview === selectedInterviewId
                                               );
                                             } else {
                                               // If no interview selected, use all insights
                                               qaItems = allInsights;
                                             }
                                             
                                             // If no filtered insights, try to get from score data
                                             if (qaItems.length === 0) {
                                               const raw = (score as any)?.data?.insights;
                                             if (Array.isArray(raw)) {
                                               qaItems = raw.map((it: any) => (typeof it === 'string' ? { insight: it } : it));
                                             } else if (raw && typeof raw === 'object') {
                                               try {
                                                 const vals = Object.values(raw as Record<string, any>);
                                                 vals.forEach((v: any) => {
                                                   if (Array.isArray(v)) {
                                                     v.forEach((x: any) => qaItems.push(typeof x === 'string' ? { insight: x } : x));
                                                   } else if (v && typeof v === 'object') {
                                                     qaItems.push(v as any);
                                                   } else if (typeof v === 'string') {
                                                     qaItems.push({ insight: v });
                                                   }
                                                 });
                                               } catch {}
                                             }
                                             }
                                             if (qaItems.length > 0) {
                                               return (
                                                 <div className="space-y-2">
                                                   <div className="text-sm font-medium text-muted-foreground">Interview Q&A</div>
                                                   <div className="space-y-2">
                                                     {qaItems.slice(0, 10).map((it, i) => (
                                                       <div key={i} className="p-2 rounded border bg-muted/20">
                                                         {it.question && <div className="text-sm font-medium">{it.question}</div>}
                                                         {it.insight && <div className="text-xs text-muted-foreground">{it.insight}</div>}
                                                       </div>
                                                     ))}
                                                   </div>
                                                 </div>
                                               );
                                             }
                                             const takeaways = Array.isArray(score.insights) ? score.insights.slice(0, 3) : [];
                                             return (
                                               <div className="space-y-2">
                                                 <div className="text-sm font-medium text-muted-foreground">3 Main Takeaways</div>
                                                 <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                   {takeaways.map((t, i) => (<li key={i}>{t}</li>))}
                                                 </ul>
                                               </div>
                                             );
                                           }
                                           return (
                                             <>
                                               {Object.entries(score.data).filter(([key]) => key !== 'report').map(([key, value]) => (
                                                 <div key={key} className="text-sm">
                                                   <span className="font-medium text-muted-foreground">
                                                     {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                                   </span>
                                                   <div className="text-foreground">{String(value)}</div>
                                                 </div>
                                               ))}
                                             </>
                                           );
                                         })()}
                                       </div>
                                     </div>
                                   </div>
                                 )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Recommendation */}
                      <Card className={`border-2 ${
                        getOverallStatus() === "excellent" || getOverallStatus() === "good" 
                          ? "border-success bg-success/10" 
                          : getOverallStatus() === "average"
                          ? "border-warning bg-warning/10"
                          : "border-destructive bg-destructive/10"
                      }`}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Recommendation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            {getOverallStatus() === "excellent" || getOverallStatus() === "good"
                              ? "🚀 Strong validation results! Your idea shows excellent market potential. Proceed confidently to prototyping and development."
                              : getOverallStatus() === "average"
                              ? "⚠️ Mixed validation results. Consider refining your value proposition or target market before proceeding. Additional research may be beneficial."
                              : "❌ Weak validation results. Strongly consider pivoting your idea or significantly refining your approach before proceeding."
                            }
                          </p>
                        </CardContent>
                      </Card>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {/* Quantitative submission modal trigger rendered after assembly (when we have quantitativeData or a prompt) */}
              <Dialog open={showQuantSubmitModal} onOpenChange={setShowQuantSubmitModal}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Submit Quantitative Validation</DialogTitle>
                    <DialogDescription>Provide your Google Form survey link and a video evidencing your team analyzing results.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-1">Google Form Link</div>
                      <input
                        value={quantFormLink}
                        onChange={(e) => setQuantFormLink(e.target.value)}
                        placeholder="https://forms.google.com/..."
                        className="w-full px-3 py-2 border rounded bg-background text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Results Review Video</div>
                      <input
                        value={quantVideoLink}
                        onChange={(e) => setQuantVideoLink(e.target.value)}
                        placeholder="https://drive.google.com/... or https://youtu.be/..."
                        className="w-full px-3 py-2 border rounded bg-background text-foreground text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setShowQuantSubmitModal(false)}>Cancel</Button>
                      <Button variant="machinery" onClick={async () => {
                        try {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          if (!teamId) return;
                          if (quantFormLink) {
                            await apiClient.submitValidationEvidence(teamId, 'quant_form', quantFormLink);
                          }
                          if (quantVideoLink) {
                            await apiClient.submitValidationEvidence(teamId, 'quant_video', quantVideoLink);
                          }
                          // refresh evidence snapshot
                          try { const ev = await apiClient.getValidationEvidence(teamId); setValidationEvidence((ev as any).data || null); } catch {}
                          setShowQuantSubmitModal(false);
                        } catch {}
                      }}>Submit</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Factory
              </Button>
            </div>
          </div>
        </div>

        {/* Horizontal Research Type Buttons */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {tiers.map((tier, index) => {
            const Icon = tier.icon;
            const isCompleted = completedTiers.includes(tier.id);
            const canProceed = canProceedToNext(tier.id);
            const isSelected = currentTier === tier.id;
            
            return (
              <Button
                key={tier.id}
                variant={isSelected ? "default" : "outline"}
                onClick={() => setCurrentTier(tier.id)}
                className={`h-auto p-6 flex-col gap-3 transition-all ${
                  !canProceed ? "" : ""
                } ${isCompleted ? "border-success bg-success/5" : ""}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isCompleted ? "bg-gradient-success" : isSelected ? "bg-primary" : "bg-muted"
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-primary-foreground" />
                  ) : (
                    <Icon className={`h-6 w-6 ${
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    }`} />
                  )}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{tier.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{tier.description}</div>
                  <Badge 
                    variant={isCompleted ? "success" : "secondary"} 
                    className="mt-2"
                  >
                    Tier {index + 1}
                  </Badge>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Research Menu Content */}
        {currentTier && (
          <Card className="shadow-machinery">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const tier = tiers.find(t => t.id === currentTier);
                    const Icon = tier?.icon || Target;
                    return (
                      <>
                        <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                          <Icon className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle>{tier?.title}</CardTitle>
                          <CardDescription>{tier?.description}</CardDescription>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentTier(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Show results if completed */}
              {(() => {
                const score = validationScores.find(s => s.tier === currentTier);
                return score && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Validation Score</span>
                      <span className={`text-lg font-bold ${
                        score.status === "excellent" ? "text-success" :
                        score.status === "good" ? "text-info" :
                        score.status === "warning" ? "text-warning" : "text-destructive"
                      }`}>
                        {score.score}%
                      </span>
                    </div>
                    <Progress value={score.score} className="h-2 mb-3" />
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {score.insights.slice(0, 4).map((insight, i) => (
                          <div key={i} className="text-xs text-muted-foreground">• {insight}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardHeader>
            
            <CardContent>
              {/* Secondary Data Analysis Menu */}
              {currentTier === "secondary" && !completedTiers.includes("secondary") && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-medium text-sm">Google Trends</div>
                      <div className="text-xs text-muted-foreground mt-1">Market interest over time</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-medium text-sm">Reddit Insights</div>
                      <div className="text-xs text-muted-foreground mt-1">Community discussions</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-medium text-sm">Competitors</div>
                      <div className="text-xs text-muted-foreground mt-1">Market landscape analysis</div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <PieChart className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-medium text-sm">Market Size</div>
                      <div className="text-xs text-muted-foreground mt-1">TAM/SAM calculations</div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Button 
                      variant="machinery"
                      size="lg"
                      onClick={runSecondaryValidation}
                      disabled={isValidating}
                      className="w-full max-w-md"
                    >
                      {isValidating ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Analyzing...
                        </>
                      ) : (
                        "🔍 Run Secondary Analysis"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Qualitative Testing Menu */}
              {currentTier === "qualitative" && !completedTiers.includes("qualitative") && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Button
                      variant={selectedQualOption === "diy" ? "default" : "outline"}
                      onClick={async () => {
                        // Save focus group insights before switching
                        if (selectedQualOption === "focus-group") {
                          try {
                            const teamIdStr = localStorage.getItem('xfactoryTeamId');
                            const teamId = teamIdStr ? Number(teamIdStr) : null;
                            if (teamId) {
                              // Get current focus group insights and save them
                              const fgi = await apiClient.getFocusGroupInsightsTeam(teamId);
                              const fgiData: any = (fgi as any)?.data || {};
                              const fgiInsightsArr = Array.isArray(fgiData?.data) ? fgiData.data : [];
                              if (fgiInsightsArr.length > 0) {
                                await apiClient.saveFocusGroupInsightsOnlyTeam(teamId, fgiInsightsArr);
                              }
                            }
                          } catch (e) {
                            console.error('Failed to save focus group insights before switching:', e);
                          }
                        }
                        
                        setSelectedQualOption("diy");
                        setIsValidating(true);
                        try {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          if (!teamId) throw new Error('Missing team id');
                          // GET first (existing personas/interview kit)
                          try {
                            const res = await apiClient.get(`/validation/teams/${teamId}/user-personas/`);
                            const data = (res as any)?.data?.data;
                            if (data) {
                              setPersonaKit(mapInterviewKit({ data }));
                              // Load sessions and draft for the interview actually displayed
                              await loadInterviews();
                              try {
                                const res2 = await apiClient.getTeamInterviews(teamId);
                                const rows2: Array<any> = (res2 as any)?.data?.data || [];
                                const fallbackId = rows2[0]?.id ?? null;
                                const displayId = selectedInterviewId || fallbackId || null;
                                if (!selectedInterviewId && displayId) setSelectedInterviewId(displayId);
                                await loadSavedInsights(displayId);
                              } catch { await loadSavedInsights(selectedInterviewId || null); }
                              return;
                            }
                          } catch {}
                          // If missing, POST to generate
                          const gen = await apiClient.generateUserPersonasTeam(teamId);
                          setPersonaKit(mapInterviewKit(gen.data));
                          // Load sessions and draft for the interview actually displayed after generating kit
                          await loadInterviews();
                          try {
                            const res3 = await apiClient.getTeamInterviews(teamId);
                            const rows3: Array<any> = (res3 as any)?.data?.data || [];
                            const fallbackId = rows3[0]?.id ?? null;
                            const displayId = selectedInterviewId || fallbackId || null;
                            if (!selectedInterviewId && displayId) setSelectedInterviewId(displayId);
                            await loadSavedInsights(displayId);
                          } catch { await loadSavedInsights(selectedInterviewId || null); }
                        } catch (e) {
                          console.error('Interview kit auto-generation failed', e);
                        } finally {
                          setIsValidating(false);
                        }
                      }}
                      className="h-auto p-6 flex-col gap-3"
                    >
                      <Users className="h-8 w-8" />
                      <div className="text-center">
                        <div className="font-semibold">Interview Kit</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Generate target profiles and interview guides
                        </div>
                        <Badge variant="secondary" className="mt-2">Self-Service</Badge>
                      </div>
                    </Button>
                    
                    <Button
                      variant={selectedQualOption === "focus-group" ? "default" : "outline"}
                      onClick={async () => {
                        // Save interview insights before switching
                        if (selectedQualOption === "diy") {
                          try {
                            await saveInsightsOnly();
                          } catch (e) {
                            console.error('Failed to save interview insights before switching:', e);
                          }
                        }
                        
                        // Open Focus Group kit and trigger data loading
                        setSelectedQualOption("focus-group");
                        setIsValidating(true);
                        try {
                          // Load saved focus group insights first
                          try {
                            const fgi = await apiClient.getFocusGroupInsightsTeam(teamId);
                            const fgiData: any = (fgi as any)?.data || {};
                            const fgiInsightsArr = Array.isArray(fgiData?.data) ? fgiData.data : [];
                            if (fgiInsightsArr.length > 0) {
                              setFocusGroupInsightsState(fgiInsightsArr);
                            }
                          } catch (e) {
                            console.log('No saved focus group insights found');
                          }
                          
                          // GET first (existing focus group data)
                          try {
                            const res = await apiClient.get(`/validation/teams/${teamId}/focus-group/`);
                            if (res?.data?.success && res.data.data) {
                              // Data exists, no need to generate
                              return;
                            }
                          } catch {}
                          // If missing, POST to generate
                          const contextData = {
                            idea_info: {
                              problem: ideaCard?.problem || '',
                              solution: ideaCard?.solution || '',
                              target_audience: ideaCard?.targetAudience || '',
                              pain_point: ideaCard?.painPoint || ''
                            },
                            secondary_research: deepResearch ? {
                              market_insights: deepResearch.market_insights || '',
                              competitor_analysis: deepResearch.competitor_analysis || '',
                              trends: deepResearch.trends || ''
                            } : null
                          };
                          await apiClient.post(`/validation/teams/${teamId}/focus-group/generate/`, contextData);
                        } catch (e) {
                          console.error('Focus group auto-generation failed', e);
                        } finally {
                          setIsValidating(false);
                        }
                      }}
                      className="h-auto p-6 flex-col gap-3"
                    >
                      <Users className="h-8 w-8" />
                      <div className="text-center">
                        <div className="font-semibold">Focus Group Kit</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Generate personas and focus group guides
                        </div>
                        <Badge variant="secondary" className="mt-2">Self-Service</Badge>
                      </div>
                    </Button>
                  </div>
                  
                  {selectedQualOption === "diy" && (
                    <div className="space-y-4">
                      {/* DIY Interview Kit content will be rendered below */}
                    </div>
                  )}
                  
                  {selectedQualOption === "focus-group" && (
                    <div className="space-y-4">
                      <FocusGroupKit
                        ideaCard={ideaCard}
                        teamId={teamId}
                        ideaId={ideaId}
                        deepResearch={deepResearch}
                        isValidating={isValidating}
                        personaKit={personaKit}
                        onSaveFocusGroup={() => {
                          // Mark focus group as completed
                          setCompletedTiers(prev => {
                            const newTiers = [...prev];
                            if (!newTiers.includes('focus-groups')) {
                              newTiers.push('focus-groups');
                            }
                            return newTiers;
                          });
                        }}
                      />
                    </div>
                  )}

                </div>
              )}

              {/* Submit Qualitative Research Button - below main section */}

              {/* Quantitative Testing Menu */}
              {currentTier === "quantitative" && !completedTiers.includes("quantitative") && (
                <div className="space-y-6">
                  {/* Check if both interviews and focus groups are completed */}
                  {!completedTiers.includes("qualitative") && (
                    <Card className="border-warning/20 bg-warning/5">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <AlertCircle className="h-6 w-6 text-warning" />
                          <h3 className="font-semibold text-warning">Complete Qualitative Research First</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          You must complete both interview and focus group research before proceeding to quantitative testing.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className={`h-4 w-4 ${completedTiers.includes("interviews") ? "text-success" : "text-muted-foreground"}`} />
                            <span className="text-sm">Complete Interview Kit</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className={`h-4 w-4 ${completedTiers.includes("focus-groups") ? "text-success" : "text-muted-foreground"}`} />
                            <span className="text-sm">Complete Focus Group Kit</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-lg border border-border text-center">
                      <BarChart3 className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold text-lg mb-2">AI Survey Assembly</h3>
                      <p className="text-sm text-muted-foreground mb-4">Assemble a quantitative survey using AI-generated questions</p>
                      <Badge variant="default">AI Generated</Badge>
                    </div>
                    <div className="p-6 rounded-lg border border-border text-center">
                      <PieChart className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold text-lg mb-2">AI Survey Generator</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Validated questions tailored to your business type and market validation needs
                      </p>
                      <Badge variant="default">AI Generated</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-w-xl mx-auto">
                    <div className="text-sm text-muted-foreground">Before assembling your survey, submit links to your qualitative evidence.</div>
                    <div className="grid gap-3">
                      <div className="flex gap-2 items-center">
                        <label className="w-36 text-sm text-muted-foreground">Interview Link</label>
                        <input
                          value={qualInterviewLink}
                          onChange={(e) => setQualInterviewLink(e.target.value)}
                          placeholder="Google Drive folder or playlist for interviews"
                          className="flex-1 px-3 py-2 border rounded bg-background text-foreground text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={async () => {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          const link = (qualInterviewLink || '').trim();
                          console.log('DEBUG: Saving interview link:', link);
                          if (teamId && link) {
                            try {
                              const result = await apiClient.submitValidationEvidence(teamId, 'qual_interview', link);
                              console.log('DEBUG: Interview link save result:', result);
                              // Refresh validation evidence after saving
                              const ev = await apiClient.getValidationEvidence(teamId); 
                              console.log('DEBUG: Refreshed validation evidence:', ev);
                              setValidationEvidence((ev as any).data || null); 
                              const d: any = (ev as any).data || {};
                              setQualInterviewLink(d.qual_interview_link || "");
                              setQualFocusGroupLink(d.qual_focus_group_link || "");
                            } catch (error) {
                              console.error('DEBUG: Error saving interview link:', error);
                            }
                          }
                        }}>Save</Button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <label className="w-36 text-sm text-muted-foreground">Focus Group Link</label>
                        <input
                          value={qualFocusGroupLink}
                          onChange={(e) => setQualFocusGroupLink(e.target.value)}
                          placeholder="Google Drive folder or playlist for focus groups"
                          className="flex-1 px-3 py-2 border rounded bg-background text-foreground text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={async () => {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          const link = (qualFocusGroupLink || '').trim();
                          console.log('DEBUG: Saving focus group link:', link);
                          if (teamId && link) {
                            try {
                              const result = await apiClient.submitValidationEvidence(teamId, 'qual_focus_group', link);
                              console.log('DEBUG: Focus group link save result:', result);
                              // Refresh validation evidence after saving
                              const ev = await apiClient.getValidationEvidence(teamId); 
                              console.log('DEBUG: Refreshed validation evidence:', ev);
                              setValidationEvidence((ev as any).data || null); 
                              const d: any = (ev as any).data || {};
                              setQualInterviewLink(d.qual_interview_link || "");
                              setQualFocusGroupLink(d.qual_focus_group_link || "");
                            } catch (error) {
                              console.error('DEBUG: Error saving focus group link:', error);
                            }
                          }
                        }}>Save</Button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <label className="w-36 text-sm text-muted-foreground">Transcript Folders</label>
                        <input
                          value={qualTranscriptLink}
                          onChange={(e) => setQualTranscriptLink(e.target.value)}
                          placeholder="Google Drive folder with interview/focus group transcripts"
                          className="flex-1 px-3 py-2 border rounded bg-background text-foreground text-sm"
                        />
                        <Button size="sm" variant="outline" onClick={async () => {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          const link = (qualTranscriptLink || '').trim();
                          console.log('DEBUG: Saving transcript link:', link);
                          if (teamId && link) {
                            try {
                              const result = await apiClient.submitValidationEvidence(teamId, 'qual_transcript', link);
                              console.log('DEBUG: Transcript link save result:', result);
                              // Refresh validation evidence after saving
                              const ev = await apiClient.getValidationEvidence(teamId); 
                              console.log('DEBUG: Refreshed validation evidence:', ev);
                              setValidationEvidence((ev as any).data || null); 
                              const d: any = (ev as any).data || {};
                              setQualInterviewLink(d.qual_interview_link || "");
                              setQualFocusGroupLink(d.qual_focus_group_link || "");
                              setQualTranscriptLink(d.qual_transcript_link || "");
                            } catch (error) {
                              console.error('DEBUG: Error saving transcript link:', error);
                            }
                          }
                        }}>Save</Button>
                      </div>
                    </div>
                    <Button 
                      variant="machinery"
                      size="lg"
                      onClick={async () => {
                        setIsValidating(true);
                        try {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          if (teamId) {
                            // First, check if we already have existing survey questions (GET before POST)
                            try {
                              const existingSurvey = await apiClient.getAISurveyTeam(teamId);
                              const existingQuestions = (existingSurvey?.data as any)?.questions || [];
                              if (existingQuestions.length > 0) {
                                setAISurveyQuestions(Array.isArray(existingQuestions) ? existingQuestions : []);
                                setSurveyAssembled(true);
                                setShowSurvey(true);
                                return; // Don't generate new survey if we already have one
                              }
                            } catch {}
                            
                            // Ensure links are persisted if present (use local controlled inputs)
                            if ((qualInterviewLink || '').trim()) await apiClient.submitValidationEvidence(teamId, 'qual_interview', (qualInterviewLink || '').trim());
                            if ((qualFocusGroupLink || '').trim()) await apiClient.submitValidationEvidence(teamId, 'qual_focus_group', (qualFocusGroupLink || '').trim());
                            if ((qualTranscriptLink || '').trim()) await apiClient.submitValidationEvidence(teamId, 'qual_transcript', (qualTranscriptLink || '').trim());
                            // Assemble/generate the survey
                            try { await runQuantitativeValidation(); } catch {}
                            // After assembling, show the survey
                            setShowSurvey(true);
                          }
                        } catch {}
                        finally {
                          setIsValidating(false);
                        }
                      }}
                      disabled={isValidating || !(qualMarkedComplete || completedTiers.includes("qualitative"))}
                      className="w-full"
                    >
                      {isValidating ? "Submitting & Generating..." : "📎 Submit Evidence & Assemble Survey"}
                    </Button>
                    {!(qualMarkedComplete || completedTiers.includes("qualitative")) && (
                      <p className="text-xs text-muted-foreground">
                        Complete qualitative testing first
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Show completed results */}
              {completedTiers.includes(currentTier!) && (
                <div className="text-center space-y-4">
                  <div className="p-6 rounded-lg bg-success/10 border border-success">
                    <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                    <h3 className="font-semibold text-lg text-success mb-2">Research Completed</h3>
                    <p className="text-sm text-muted-foreground">
                      This validation tier has been successfully completed. View detailed results below.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No tier selected message */}
        {!currentTier && (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a Research Type</h3>
              <p className="text-muted-foreground">
                Choose one of the validation tiers above to begin your market research
              </p>
            </CardContent>
          </Card>
        )}


        {/* DIY Kit Generator */}
        {currentTier === "qualitative" && selectedQualOption === "diy" && !completedTiers.includes("qualitative") && (
          <Card className="shadow-machinery">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">DIY Interview Kit</CardTitle>
                    <CardDescription>AI-generated target user profiles and interview guides</CardDescription>
                  </div>
                </div>
                {/* Removed Back to Options */}
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-8">
              {isValidating ? (
                <div className="w-full py-16 flex flex-col items-center justify-center">
                  <div className="relative w-16 h-16 mb-3">
                    <div className="absolute inset-0 rounded-full border-4 border-muted" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <div className="text-sm text-muted-foreground">Generating DIY Interview Kit…</div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Target Profiles */}
                  <Card className="border-2 border-dashed border-success/20 bg-success/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-success">
                        <Users className="h-5 w-5" />
                        Target User Profiles
                      </CardTitle>
                      <CardDescription>Interview participants matching your target market</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(personaKit?.user_personas || []).slice(0,3).map((p: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-lg bg-gradient-machinery/10 border border-success/10">
                          <h4 className="font-semibold mb-3 text-primary">{p.name || `Profile ${idx+1}`}</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="font-medium text-muted-foreground">Age:</span><p>{p.age_range || '-'}</p></div>
                            <div><span className="font-medium text-muted-foreground">Occupation:</span><p>{p.occupation || '-'}</p></div>
                            <div className="col-span-2"><span className="font-medium text-muted-foreground">Primary Pain Points:</span><p>{(p.primary_pain_points||[]).join(', ') || '-'}</p></div>
                            <div className="col-span-2"><span className="font-medium text-muted-foreground">Primary Goals:</span><p>{(p.primary_goals||[]).join(', ') || '-'}</p></div>
                          </div>
                        </div>
                    ))}
                  </CardContent>
                </Card>
  
                  {/* Interview Guide */}
                  <Card className="border-2 border-dashed border-info/20 bg-info/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-info">
                        <FileText className="h-5 w-5" />
                        Interview Guide
                        <div className="ml-auto">
                          <Button aria-label="Interview menu" variant="ghost" size="icon" onClick={() => setShowInterviewMenu(true)}>
                            {/* Hamburger icon */}
                            <div className="flex flex-col gap-0.5">
                              <span className="block w-4 h-0.5 bg-current"></span>
                              <span className="block w-4 h-0.5 bg-current"></span>
                              <span className="block w-4 h-0.5 bg-current"></span>
                            </div>
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>Structured conversation flow for optimal insights</CardDescription>
                      {/* Current interviewee display */}
                      <div className="text-sm text-muted-foreground mt-2">
                        Name of interviewee: {(() => {
                          const currentInterview = interviews.find(i => i.id === selectedInterviewId);
                          return currentInterview?.interviewee?.name || 'Not selected';
                        })()}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 relative">
                      {/* Localized modal: dims only this CardContent */}
                      {showInterviewMenu && (
                        <div className="absolute inset-0 z-20 flex items-start justify-center pt-4">
                          <div className="absolute inset-0 bg-black/50"></div>
                          <div className="relative z-30 w-full max-w-md mx-4 p-4 rounded-lg border bg-background shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold">Interview Menu</div>
                              <Button variant="ghost" size="icon" onClick={() => setShowInterviewMenu(false)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-sm font-medium mb-1">Select interview session</div>
                                <div className="flex items-center gap-2">
                                  <select
                                    className="flex-1 px-2 py-1 border rounded bg-background text-foreground text-sm"
                                    value={selectedInterviewId || ""}
                                    onChange={async (e) => {
                                      const id = e.target.value ? Number(e.target.value) : null;
                                      setSelectedInterviewId(id);
                                      await loadInsightsForInterview(id);
                                    }}
                                  >
                                    {interviews.length === 0 && <option value="">No sessions</option>}
                                    {interviews.map((it) => (
                                      <option key={it.id} value={it.id}>{it.title}</option>
                                    ))}
                                  </select>
                                  <Button size="sm" variant="outline" onClick={async () => { await loadInterviews(); }}>Refresh</Button>
                                </div>
                              </div>
                              <div className="pt-2 border-t">
                                <div className="text-sm font-medium mb-2">Create new interview</div>
                                <div className="space-y-2">
                                  <input
                                    className="w-full px-2 py-1 border rounded bg-background text-foreground text-sm"
                                    placeholder="Interviewee name"
                                    value={newIntervieweeName}
                                    onChange={(e) => setNewIntervieweeName(e.target.value)}
                                  />
                                  <select
                                    className="w-full px-2 py-1 border rounded bg-background text-foreground text-sm"
                                    value={newInterviewPersona}
                                    onChange={(e) => setNewInterviewPersona(e.target.value)}
                                  >
                                    <option value="">Select persona (optional)</option>
                                    {(personaKit?.user_personas || []).map((p: any, idx: number) => (
                                      <option key={idx} value={p?.name || `Persona ${idx+1}`}>{p?.name || `Persona ${idx+1}`}</option>
                                    ))}
                                  </select>
                                  <Button
                                    className="w-full"
                                    onClick={async () => {
                                      const teamIdStr = localStorage.getItem('xfactoryTeamId');
                                      const teamId = teamIdStr ? Number(teamIdStr) : null;
                                      if (!teamId) return;
                                      try {
                                        setIsValidating(true);
                                        const title = newIntervieweeName ? `Interview with ${newIntervieweeName}` : `Interview Session ${interviews.length + 1}`;
                                        await apiClient.createTeamInterview(teamId, title, {
                                          name: (newIntervieweeName || '').trim() || undefined,
                                          persona_target: (newInterviewPersona || '').trim() || undefined,
                                        });
                                        setNewIntervieweeName("");
                                        setNewInterviewPersona("");
                                        await loadInterviews();
                                        // Select newest created
                                        const res = await apiClient.getTeamInterviews(teamId);
                                        const rows: Array<any> = (res as any)?.data?.data || [];
                                        const latest = rows[0]?.id;
                                        setSelectedInterviewId(latest || null);
                                        setShowInterviewMenu(false);
                                      } finally {
                                        setIsValidating(false);
                                      }
                                    }}
                                  >
                                    Create Interview
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {personaKit && (
                        <>
                          <div className="p-4 rounded-lg bg-gradient-machinery/10 border border-info/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-primary">Demographic Questions</h4>
                              <Badge variant="outline" className="text-xs">Intro</Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {(personaKit.demographic_questions||[]).slice(0,10).map((q: string, i: number) => (
                                <li key={i} className="flex flex-col gap-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-info rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">{q}</div>
                                  </div>
                                  <Textarea
                                    placeholder="Your insight for this question…"
                                    value={insightsDraft[`demographic:${i}`] || ''}
                                    onChange={(e) => updateInsight('demographic', i, q, e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={saveInsightsOnly}
                                className="text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Demographic Insights
                              </Button>
                            </div>
                          </div>
  
                          <div className="p-4 rounded-lg bg-gradient-machinery/10 border border-info/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-primary">Behavioral Questions</h4>
                              <Badge variant="outline" className="text-xs">Context</Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {(personaKit.behavioral_questions||[]).slice(0,10).map((q: string, i: number) => (
                                <li key={i} className="flex flex-col gap-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-info rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">{q}</div>
                                  </div>
                                  <Textarea
                                    placeholder="Your insight for this question…"
                                    value={insightsDraft[`behavioral:${i}`] || ''}
                                    onChange={(e) => updateInsight('behavioral', i, q, e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={saveInsightsOnly}
                                className="text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Behavioral Insights
                              </Button>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-lg bg-gradient-machinery/10 border border-info/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-primary">Pain Point Questions</h4>
                              <Badge variant="outline" className="text-xs">Problem</Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {(personaKit.pain_point_questions||[]).slice(0,10).map((q: string, i: number) => (
                                <li key={i} className="flex flex-col gap-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-info rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">{q}</div>
                                  </div>
                                  <Textarea
                                    placeholder="Your insight for this question…"
                                    value={insightsDraft[`pain_point:${i}`] || ''}
                                    onChange={(e) => updateInsight('pain_point', i, q, e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={saveInsightsOnly}
                                className="text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Pain Point Insights
                              </Button>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-lg bg-gradient-machinery/10 border border-info/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-primary">Solution Questions</h4>
                              <Badge variant="outline" className="text-xs">Solution</Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {(personaKit.solution_questions||[]).slice(0,10).map((q: string, i: number) => (
                                <li key={i} className="flex flex-col gap-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-info rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">{q}</div>
                                  </div>
                                  <Textarea
                                    placeholder="Your insight for this question…"
                                    value={insightsDraft[`solution:${i}`] || ''}
                                    onChange={(e) => updateInsight('solution', i, q, e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={saveInsightsOnly}
                                className="text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Solution Insights
                              </Button>
                            </div>
                          </div>
  
                          <div className="p-4 rounded-lg bg-gradient-machinery/10 border border-info/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-primary">Market Questions</h4>
                              <Badge variant="outline" className="text-xs">Market</Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {(personaKit.market_questions||[]).slice(0,10).map((q: string, i: number) => (
                                <li key={i} className="flex flex-col gap-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-info rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">{q}</div>
                                  </div>
                                  <Textarea
                                    placeholder="Your insight for this question…"
                                    value={insightsDraft[`market:${i}`] || ''}
                                    onChange={(e) => updateInsight('market', i, q, e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={saveInsightsOnly}
                                className="text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Market Insights
                              </Button>
                            </div>
                          </div>
  
                          <div className="p-4 rounded-lg bg-gradient-machinery/10 border border-info/10">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-primary">Persona Validation Questions</h4>
                              <Badge variant="outline" className="text-xs">Validate</Badge>
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {(personaKit.persona_validation_questions||[]).slice(0,10).map((q: string, i: number) => (
                                <li key={i} className="flex flex-col gap-2">
                                  <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-info rounded-full mt-2 flex-shrink-0"></div>
                                    <div className="flex-1">{q}</div>
                                  </div>
                                  <Textarea
                                    placeholder="Your insight for this question…"
                                    value={insightsDraft[`persona_validation:${i}`] || ''}
                                    onChange={(e) => updateInsight('persona_validation', i, q, e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={saveInsightsOnly}
                                className="text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                Save Persona Validation Insights
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                {/* Individual buttons removed - using main submit button below */}
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Survey Display Interface */}
        {currentTier === "quantitative" && showSurvey && !completedTiers.includes("quantitative") && (
          <Card className="shadow-machinery">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Survey Deployed</CardTitle>
                    <CardDescription>Your quantitative survey is now live and collecting responses</CardDescription>
                  </div>
                </div>
                {/* Removed Back to Options */}
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* AI Survey Questions (for building your Google Form) */}
              <Card>
                <CardHeader>
                  <CardTitle>AI‑Generated Survey Blueprint</CardTitle>
                  <CardDescription>Use these questions to create a Google Form. Then paste your public link below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(aiSurveyQuestions) && aiSurveyQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {aiSurveyQuestions.map((q, i) => (
                        <div key={q.id || i} className="p-3 rounded border bg-background/50">
                          <div className="text-sm font-medium mb-1">{q.text}</div>
                          {q.type === 'multiple_choice' && (
                            <ul className="list-disc ml-5 text-xs text-muted-foreground">
                              {(q.options || []).map((o, idx) => (<li key={idx}>{o}</li>))}
                            </ul>
                          )}
                          {q.type === 'multi_select' && (
                            <ul className="list-disc ml-5 text-xs text-muted-foreground">
                              {(q.options || []).map((o, idx) => (<li key={idx}>{o}</li>))}
                            </ul>
                          )}
                          {q.type === 'scale_0_100' && (
                            <div className="text-xs text-muted-foreground">Scale: 0 to 100</div>
                          )}
                          {q.type === 'open' && (
                            <div className="text-xs text-muted-foreground">Open response</div>
                          )}
                          
                          {/* Insights textarea */}
                          <div className="mt-3">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                              Question Results
                            </label>
                            <textarea
                              value={quantitativeInsights[q.id || `q${i}`] || ''}
                              onChange={(e) => {
                                handleQuantitativeInsightChange(q.id || `q${i}`, e.target.value);
                                // Auto-resize the textarea
                                autoResizeTextarea(e.target);
                              }}
                              onInput={(e) => {
                                // Auto-resize on input as well
                                autoResizeTextarea(e.target as HTMLTextAreaElement);
                              }}
                              placeholder="Add the results of this specific question..."
                              className="w-full px-3 py-2 text-xs border rounded bg-background text-foreground resize-none overflow-hidden"
                              rows={2}
                              data-auto-resize
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No questions generated yet. Try running quantitative validation again.</div>
                  )}
                  
                  {/* Save Survey Info Button */}
                  {aiSurveyQuestions.length > 0 && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={saveQuantitativeInsights}
                        className="w-full"
                      >
                        Save Survey Info
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Survey Link Section */}
              <Card className="border-2 border-dashed border-success/20 bg-success/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-success">
                    <PieChart className="h-5 w-5" />
                    Survey Link{surveyName ? ` • ${surveyName}` : ''}
                  </CardTitle>
                  <CardDescription>Share this link to collect responses from your target audience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <input
                      value={surveyLink}
                      onChange={(e) => setSurveyLink(e.target.value)}
                      placeholder="Paste your public Google Forms link here"
                      className="w-full px-3 py-2 rounded border bg-background text-foreground text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(surveyLink);
                          alert("Survey link copied to clipboard!");
                        }}
                        className="flex-shrink-0"
                        disabled={!surveyLink}
                      >
                        Copy Link
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={async () => {
                          try {
                          // Just save the survey link, don't mark validation as completed
                            const teamIdStr = localStorage.getItem('xfactoryTeamId');
                            const teamId = teamIdStr ? Number(teamIdStr) : null;
                          if (teamId && surveyLink) {
                            await apiClient.submitValidationEvidence(teamId, 'quant_form', surveyLink);
                          }
                          } catch {}
                        }}
                        disabled={!surveyLink}
                      >
                        Save Survey Link
                      </Button>
                    </div>
                  </div>
                  
                  {/* Response Volume Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Response Volume</label>
                    <div className="flex gap-2">
                      <input
                        value={responseVolume}
                        onChange={(e) => setResponseVolume(e.target.value)}
                        placeholder="Number of survey responses received"
                        type="number"
                        min="0"
                        className="flex-1 px-3 py-2 rounded border bg-background text-foreground text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const teamIdStr = localStorage.getItem('xfactoryTeamId');
                          const teamId = teamIdStr ? Number(teamIdStr) : null;
                          const volume = responseVolume.trim();
                          console.log('DEBUG: Saving response volume:', volume);
                          if (teamId && volume) {
                            try {
                              // Save response volume to validation evidence
                              const result = await apiClient.submitValidationEvidence(teamId, 'response_volume', volume);
                              console.log('DEBUG: Response volume save result:', result);
                            } catch (error) {
                              console.error('DEBUG: Error saving response volume:', error);
                              alert("Error saving response volume. Please try again.");
                            }
                          } else {
                            alert("Please enter a valid response volume.");
                          }
                        }}
                        disabled={!responseVolume.trim()}
                      >
                        Save Volume
                      </Button>
                    </div>
                    {responseVolume && (
                      <div className="text-sm text-muted-foreground">
                        Current response volume: {responseVolume} responses
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 justify-center">

                
                <Button 
                  variant="machinery"
                  onClick={async () => {
                    try {
                      setIsValidating(true);
                      const teamIdStr = localStorage.getItem('xfactoryTeamId');
                      const teamId = teamIdStr ? Number(teamIdStr) : null;
                      if (teamId) {
                        // Compute quantitative score based on survey insights and response volume
                        try {
                          const scoreResult = await apiClient.computeQuantitativeScoreTeam(
                            teamId, 
                            quantitativeInsights, 
                            parseInt(responseVolume) || 0
                          );
                          console.log('Quantitative score computed:', scoreResult);
                          
                          // Update the quantitative score state with the computed result
                          if (scoreResult && (scoreResult as any).score) {
                            setQuantitativeScore((scoreResult as any).score);
                          }
                        } catch (error) {
                          console.error('Error computing quantitative score:', error);
                        }
                        
                        await apiClient.markValidationCompleted(teamId, { quantitative: true });
                        setCompletedTiers(prev => prev.includes('quantitative') ? prev : [...prev, 'quantitative']);
                        
                        // Refresh the quantitative score to ensure it's displayed in the dashboard
                        try {
                          const refreshedScore = await apiClient.getQuantitativeScoreTeam(teamId);
                          const score = (refreshedScore as any)?.data?.score || (refreshedScore as any)?.score || null;
                          if (score) {
                            setQuantitativeScore(score);
                          }
                        } catch (error) {
                          console.error('Error refreshing quantitative score:', error);
                        }
                        
                        // Hide survey interface and show completed state
                    setShowSurvey(false);
                      }
                    } catch (error) {
                      console.error('Failed to submit quantitative validation:', error);
                    } finally {
                      setIsValidating(false);
                    }
                  }}
                  className="flex-1 max-w-s"
                  disabled={isValidating}
                >
                  {isValidating ? "Computing Score..." : "Submit Quantitative Validation"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Share your survey link and collect responses before generating the final report
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Quantitative Validation */}
        {(() => {
          const hasSecondary = typeof secondaryScore20 === 'number';
          const hasQual = Number.isFinite((qualScore as any)?.final_score_10) || Number.isFinite((validationScores.find(s=>s.tier==='qualitative')?.data as any)?.final_score_10);
          const hasQuant = Number.isFinite((quantitativeScore as any)?.final_score_50);
          const hasThreeScores = Boolean(hasSecondary && hasQual && hasQuant);
          return currentTier === "quantitative" && (completedTiers.includes("quantitative") || hasThreeScores);
        })() && (
          <Card className="shadow-machinery">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-success">Validation Complete</CardTitle>
                    <CardDescription>Your quantitative validation has been successfully completed</CardDescription>
                  </div>
                </div>
                <Badge variant="success" className="text-sm">
                  ✓ Completed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Overall Score Display */}
              <div className="p-6 rounded-lg bg-gradient-machinery text-primary-foreground">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    {calculateOverallScore()}/100
                  </div>
                  <div className="text-lg text-primary-foreground/80 mb-3">
                    Overall Validation Score
                  </div>
                  <Progress value={calculateOverallScore()} className="h-3 mb-3" />
                  <Badge 
                    variant={getOverallStatus() === "excellent" ? "success" : 
                            getOverallStatus() === "good" ? "default" : 
                            getOverallStatus() === "average" ? "warning" : "destructive"}
                    className="text-sm"
                  >
                    {getOverallStatus().toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Secondary Score */}
                <Card className="shadow-machinery">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Secondary Research</CardTitle>
                    <div className={`text-2xl font-bold ${
                      (secondaryScore20 ?? 0) >= 17 ? "text-success" :
                      (secondaryScore20 ?? 0) >= 14 ? "text-info" :
                      (secondaryScore20 ?? 0) >= 11 ? "text-warning" : "text-destructive"
                    }`}>
                      {secondaryScore20 !== null ? `${secondaryScore20}/20` : '0/20'}
                    </div>
                    <Progress value={secondaryScore20 !== null ? (secondaryScore20 / 20) * 100 : 0} className="h-2 mt-2" />
                    <Badge variant={
                      (secondaryScore20 ?? 0) >= 17 ? "success" :
                      (secondaryScore20 ?? 0) >= 14 ? "default" :
                      (secondaryScore20 ?? 0) >= 11 ? "warning" : "destructive"
                    } className="mt-2">
                      {secondaryScore20 !== null ? 
                        (secondaryScore20 >= 17 ? "Excellent" :
                         secondaryScore20 >= 14 ? "Good" :
                         secondaryScore20 >= 11 ? "Fair" : "Poor") : "Pending"
                      }
                    </Badge>
                  </CardHeader>
                </Card>

                {/* Qualitative Score */}
                <Card className="shadow-machinery">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Qualitative Testing</CardTitle>
                    <div className={`text-2xl font-bold ${
                      (validationScores.find(s=>s.tier==='qualitative')?.status) === "excellent" ? "text-success" :
                      (validationScores.find(s=>s.tier==='qualitative')?.status) === "good" ? "text-info" :
                      (validationScores.find(s=>s.tier==='qualitative')?.status) === "warning" ? "text-warning" : "text-destructive"
                    }`}>
                      {(() => {
                        const qdata = (validationScores.find(s=>s.tier==='qualitative')?.data as any) || (qualScore as any) || {};
                        const f10 = Number(qdata?.final_score_10 || 0);
                        const score30 = Math.round((f10 / 10) * 30);
                        return `${score30}/30`;
                      })()}
                    </div>
                    <Progress value={(() => {
                      const qdata = (validationScores.find(s=>s.tier==='qualitative')?.data as any) || (qualScore as any) || {};
                      const f10 = Number(qdata?.final_score_10 || 0);
                      return (f10 / 10) * 100;
                    })()} className="h-2 mt-2" />
                    <Badge variant={
                      (validationScores.find(s=>s.tier==='qualitative')?.status) === "excellent" ? "success" :
                      (validationScores.find(s=>s.tier==='qualitative')?.status) === "good" ? "default" : 
                      (validationScores.find(s=>s.tier==='qualitative')?.status) === "warning" ? "warning" : "destructive"
                    } className="mt-2">
                      {(validationScores.find(s=>s.tier==='qualitative')?.status) || "Pending"}
                    </Badge>
                  </CardHeader>
                </Card>

                {/* Quantitative Score */}
                <Card className="shadow-machinery">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Quantitative Testing</CardTitle>
                    <div className={`text-2xl font-bold ${
                      quantitativeScore ? "text-success" : "text-muted-foreground"
                    }`}>
                      {quantitativeScore ? `${Math.round(quantitativeScore.final_score_50 || 0)}/50` : '0/50'}
                    </div>
                    <Progress value={quantitativeScore ? (quantitativeScore.final_score_50 || 0) * 2 : 0} className="h-2 mt-2" />
                    <Badge variant={quantitativeScore ? "success" : "secondary"} className="mt-2">
                      {quantitativeScore ? "Scored" : "Pending"}
                    </Badge>
                  </CardHeader>
                </Card>
              </div>

              {/* Back to Menu Button */}
              <div className="text-center pt-4">
                <Button
                  variant="machinery"
                  size="lg"
                  onClick={onBack}
                  className="w-full max-w-md"
                >
                  Back to Menu
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Validation complete! Return to the main menu
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        




            {/* Complete Button - Requires all 3 tiers */}
            {completedTiers.length === 3 && (
              <div className="text-center pt-6">
                <Button 
                  variant="machinery"
                  size="xl"
                  onClick={completeValidation}
                  className="w-full max-w-md"
                >
                  Complete Validation Engine ✓
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
            
            {/* Progress indicator */}
            {completedTiers.length > 0 && completedTiers.length < 3 && (
              <div className="text-center pt-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Validation Progress: {completedTiers.length}/3 tiers completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Complete all validation tiers to proceed to prototyping
                  </p>
                </div>
              </div>
            )}

            {/* Submit Qualitative Research Button - at the very bottom */}
            {currentTier === "qualitative" && selectedQualOption && !completedTiers.includes("qualitative") && (
              <div className="text-center pt-6 border-t">
                <Button
                  variant="success"
                  size="lg"
                  onClick={async () => {
                    setIsValidating(true);
                    try {
                      // Save interview insights if we're in interview mode
                      if (selectedQualOption === "diy") {
                        await saveInsights();
                      }
                      
                      // Generate quant prompt based on both interview and focus group data
                      if (teamId) {
                        const quantResponse = await apiClient.post(`/validation/teams/${teamId}/quant-prompt/`, {});
                        const quantData = quantResponse?.data as any;
                        const prompt = quantData?.pollfish_prompt || quantData?.prompt;
                        if (prompt) {
                          setPollfishPrompt(prompt);
                        }
                        // Prefer using returned qualitative score if available
                        const qs = quantData?.qual_score;
                        if (qs && typeof qs.final_score_10 === 'number') {
                          setQualScore(qs);
                          const score30 = Math.round(((qs.final_score_10 || 0) / 10) * 30);
                          const status = qs.final_score_10 >= 8 ? 'excellent'
                                       : qs.final_score_10 >= 6 ? 'good'
                                       : qs.final_score_10 >= 4 ? 'warning' : 'poor';
                          setValidationScores(prev => {
                            const existing = prev.find(s => s.tier === 'qualitative');
                            const entry = { tier: 'qualitative' as const, score: score30, status, insights: ['Focus groups completed', 'Interviews completed', 'Quant prompt generated', 'Insights saved'], data: qs };
                            if (existing) return prev.map(s => s.tier === 'qualitative' ? entry as any : s);
                            return [...prev, entry as any];
                          });
                        }
                      }
                      
                      setCompletedTiers(prev => {
                        const newTiers = [...prev];
                        if (selectedQualOption === "diy" && !newTiers.includes('interviews')) {
                          newTiers.push('interviews');
                        }
                        if (selectedQualOption === "focus-group" && !newTiers.includes('focus-groups')) {
                          newTiers.push('focus-groups');
                        }
                        if (!newTiers.includes('qualitative')) {
                          newTiers.push('qualitative');
                        }
                        return newTiers;
                      });

                      // Mark backend team completion for qualitative
                      try {
                        if (teamId) { 
                          await apiClient.markValidationCompleted(teamId, { qualitative: true }); 
                        }
                      } catch (error) {
                        console.error('Failed to mark qualitative as completed:', error);
                      }

                      // Fallback: if score not returned inline, fetch it
                      try {
                        const teamIdStr2 = localStorage.getItem('xfactoryTeamId');
                        const teamId2 = teamIdStr2 ? Number(teamIdStr2) : null;
                        // Note: Qualitative score is loaded separately when needed, not on every data load
                      } catch {}
                      
                      // Jump to quantitative section
                      setCurrentTier('quantitative');
                      setSelectedQualOption(null);
                    } catch (error) {
                      console.error('Failed to complete qualitative research:', error);
                    } finally {
                      setIsValidating(false);
                    }
                  }}
                  disabled={isValidating}
                  className="w-full max-w-md shadow-machinery"
                >
                  {isValidating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving & Generating Quant Prompt...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Submit Qualitative Research
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Generate quantitative survey based on interview and focus group insights
                </p>
              </div>
            )}
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={3}
        userData={{ ideaCard, mockups }}
        context="validation-testing"
      />

      {/* Quantitative Submission Modal */}
      <Dialog open={showQuantSubmitModal} onOpenChange={setShowQuantSubmitModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Quantitative Validation</DialogTitle>
            <DialogDescription>
              Submit your quantitative validation evidence to complete this research tier. It's just a 2-minute video of you explaning the validation results!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">

            <div className="space-y-2">
              <label className="text-sm font-medium">Results Review Video Link</label>
              <input
                value={quantVideoLink}
                onChange={(e) => setQuantVideoLink(e.target.value)}
                placeholder="https://youtube.com/... or Google Drive link"
                className="w-full px-3 py-2 border rounded bg-background text-foreground text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuantSubmitModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const teamIdStr = localStorage.getItem('xfactoryTeamId');
                  const teamId = teamIdStr ? Number(teamIdStr) : null;
                  if (teamId) {
                    if (quantFormLink) {
                      await apiClient.submitValidationEvidence(teamId, 'quant_form', quantFormLink);
                    }
                    if (quantVideoLink) {
                      await apiClient.submitValidationEvidence(teamId, 'quant_video', quantVideoLink);
                    }
                    
                    // Compute quantitative score based on survey insights and response volume
                    try {
                      const scoreResult = await apiClient.computeQuantitativeScoreTeam(
                        teamId, 
                        quantitativeInsights, 
                        parseInt(responseVolume) || 0
                      );
                      console.log('Quantitative score computed:', scoreResult);
                      
                      // Update the quantitative score state with the computed result
                      if (scoreResult && (scoreResult as any).score) {
                        setQuantitativeScore((scoreResult as any).score);
                      }
                    } catch (error) {
                      console.error('Error computing quantitative score:', error);
                    }
                    
                    // Mark quantitative as complete locally and server-side without unlocking next stage
                    try { await apiClient.markValidationCompleted(teamId, { quantitative: true }); } catch {}
                    setCompletedTiers(prev => prev.includes('quantitative') ? prev : [...prev, 'quantitative']);
                    
                    // Refresh the quantitative score to ensure it's displayed in the dashboard
                    try {
                      const refreshedScore = await apiClient.getQuantitativeScoreTeam(teamId);
                      // Handle both response formats: data.score or score
                      const score = (refreshedScore as any)?.data?.score || (refreshedScore as any)?.score || null;
                      if (score) {
                        setQuantitativeScore(score);
                      }
                    } catch (error) {
                      console.error('Error refreshing quantitative score:', error);
                    }
                    
                    setShowQuantSubmitModal(false);
                    setShowSurvey(false);
                    // Ensure we show the completed state instead of survey interface
                    setShowSurvey(false);
                  }
                } catch (error) {
                  console.error('Failed to submit quantitative validation:', error);
                }
              }}
              disabled={!quantVideoLink}
            >
              Submit Validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};