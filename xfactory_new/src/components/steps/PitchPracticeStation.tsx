import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube, ArrowLeft, ChevronUp, ChevronDown, Brain, AlertTriangle, Lightbulb, FlaskConical, UserCheck, Building, Milestone, HelpCircle, Heart, DollarSign, FileText, Loader2, Download, X, User, Settings, LogOut, ExternalLink } from "lucide-react";
import { StationFlowManager } from "@/lib/stationFlow";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient, getGammaPdfUrlTeam } from "@/lib/api";
import { FactorAI } from "../FactorAI";
import InfoButton from "@/components/info-button";

interface PitchPracticeStationProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  mvpData?: any;
  validationData?: any;
  marketingData?: any;
  reviewMode?: boolean;
  stationId?: number;
}

export const PitchPracticeStation = ({ 
  onComplete, 
  onBack, 
  mvpData,
  validationData,
  marketingData,
  reviewMode = false,
  stationId,
}: PitchPracticeStationProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'advice' | 'generate' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPDF, setGeneratedPDF] = useState(false);
  const [guidelines, setGuidelines] = useState<any | null>(null);
  const [coaching, setCoaching] = useState<any | null>(null);
  const [isGeneratingCoaching, setIsGeneratingCoaching] = useState(false);
  const [quantitativeData, setQuantitativeData] = useState<any>(null);
  const [showSubmissionPopup, setShowSubmissionPopup] = useState(false);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfLink, setPdfLink] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [pdfNonce, setPdfNonce] = useState<number>(0);

  const waitForPptxAccessible = async (url: string, timeoutMs = 120000) => {
    const start = Date.now();
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    let backoff = 1500;
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`${url}?cb=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && (ct.includes('vnd.openxmlformats') || ct.includes('pptx') || ct.includes('application/vnd.openxmlformats'))) return true;
      } catch {}
      await delay(backoff);
      backoff = Math.min(backoff * 1.5, 8000);
    }
    return false;
  };

  // COMMENTED OUT: Load quantitative survey data for context (contains GET requests)
  const loadQuantitativeData = async (teamId: number) => {
    try {
      // COMMENTED OUT: Load quantitative score
      // const quantScore = await apiClient.getQuantitativeScoreTeam(teamId);
      // const score = (quantScore as any)?.data?.score || (quantScore as any)?.score || null;
      
      // COMMENTED OUT: Load survey insights
      // const surveyInsights = await apiClient.get(`/validation/teams/${teamId}/quantitative-insights/`);
      // const insights = (surveyInsights as any)?.data || null;
      
      // COMMENTED OUT: Load survey questions
      // const surveyQuestions = await apiClient.getAISurveyTeam(teamId);
      // const questions = (surveyQuestions as any)?.data?.questions || [];
      
      // COMMENTED OUT: Set quantitative data
      // setQuantitativeData({
      //   score,
      //   insights,
      //   questions,
      //   responseVolume: score?.response_volume || 0
      // });
    } catch (e) {
      console.log('DEBUG: Error loading quantitative data for pitch coaching:', e);
    }
  };

  // Load existing submission data
  const loadSubmissionData = async (teamId: number) => {
    try {
      const resp = await apiClient.getPitchDeckSubmissionTeam(teamId);
      if (resp?.status >= 200 && resp.status < 300) {
        setSubmissionData(resp.data?.submission || resp.data);
        setPdfLink(resp.data?.submission?.pdf_link || '');
        setVideoLink(resp.data?.submission?.video_link || '');
      }
    } catch (e) {
      console.log('No existing submission found');
    }
  };

  // Check if station is complete
  const isStationComplete = () => {
    return submissionData?.is_complete === true;
  };

  // Handle submission
  const handleSubmitSubmission = async () => {
    if (!pdfLink.trim() || !videoLink.trim()) {
      alert('Please provide both PDF and video links');
      return;
    }

    if (!pdfLink.includes('drive.google.com') || !videoLink.includes('drive.google.com')) {
      alert('Both links must be Google Drive links');
      return;
    }

    setIsSubmitting(true);
    try {
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id as number | undefined;
      if (!teamId) return;

      const resp = await apiClient.submitPitchDeckTeam(teamId, {
        pdf_link: pdfLink.trim(),
        video_link: videoLink.trim()
      });

      if (resp?.status >= 200 && resp.status < 300) {
        setSubmissionData(resp.data?.submission || resp.data);
        setShowSubmissionPopup(false);
        
        // Mark pitch deck section as complete in the roadmap
        try {
          const status = await apiClient.get('/team-formation/status/');
          const teamId = (status as any)?.data?.current_team?.id;
          if (teamId) {
            await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, { 
              pitch_deck: { 
                slides_generated: true,
                submission_completed: true
              } 
            });
          }
        } catch (e) {
          console.error('Error updating roadmap completion:', e);
        }
        
        alert('Pitch deck submission saved successfully!');
        // Redirect back to production line flow
        onBack();
      } else {
        alert('Failed to save submission. Please try again.');
      }
    } catch (e) {
      console.error('Error submitting pitch deck:', e);
      alert('Error submitting pitch deck. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate coaching with quantitative survey context
  const generateCoachingWithContext = async () => {
    try {
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id as number | undefined;
      if (!teamId) return;

      setIsGeneratingCoaching(true);
      
      // COMMENTED OUT: Load quantitative data first (contains GET requests)
      // await loadQuantitativeData(teamId);
      
      // Generate coaching with context
      await apiClient.generatePitchCoachingTeam(teamId);
      
      // Fetch the generated coaching after generation
      const resp = await apiClient.getPitchCoachingTeam(teamId);
      if (resp?.status >= 200 && resp.status < 300) {
        setCoaching(resp.data?.coaching || resp.data);
        setSelectedOption('advice');
      }
    } catch (e) {
      console.error('Error generating coaching with context:', e);
    } finally {
      setIsGeneratingCoaching(false);
    }
  };

  // Default practice slides (used until hydrated from backend)
  const defaultSlides = [
    {
      id: 1,
      title: "Title",
      icon: Brain,
      content: {
        startup: "InnovateTech",
        tagline: "Revolutionizing productivity through AI-powered automation",
        founder: "Jane Smith, CEO & Founder",
        stage: "Pre-seed / Idea Stage"
      }
    },
    {
      id: 2,
      title: "Problem",
      icon: AlertTriangle,
      content: {
        problem: "Small businesses waste 40% of their time on repetitive manual tasks",
        target: "SMBs with 10-50 employees struggling with operational efficiency",
        urgency: "Rising labor costs and competition demand immediate productivity gains"
      }
    },
    {
      id: 3,
      title: "Unique Insight",
      icon: Lightbulb,
      content: {
        insight: "Most automation tools are too complex for SMBs - they need plug-and-play solutions",
        opportunity: "The market focuses on enterprise, leaving SMBs underserved with simple, affordable automation"
      }
    },
    {
      id: 4,
      title: "Solution Concept",
      icon: FlaskConical,
      content: {
        solution: "AI-powered workflow automation platform designed specifically for SMBs",
        approach: "Drag-and-drop interface with pre-built templates for common business processes",
        differentiator: "No-code setup that takes minutes, not months"
      }
    },
    {
      id: 5,
      title: "Customer + Validation",
      icon: UserCheck,
      content: {
        customer: "SMB owners/managers in service industries (consulting, agencies, retail)",
        validation: "50 customer interviews planned, 5 pilot customers already committed",
        signals: "3 prospects pre-ordered based on mockups alone"
      }
    },
    {
      id: 6,
      title: "Business Hypothesis",
      icon: DollarSign,
      content: {
        model: "SaaS subscription: $49/month per business",
        payer: "Business owners pay for increased productivity",
        assumptions: "20% productivity gain = 10x ROI for customers"
      }
    },
    {
      id: 7,
      title: "Roadmap",
      icon: Milestone,
      content: {
        next1: "Month 1-2: Complete customer validation & finalize MVP specs",
        next2: "Month 3-4: Build and test MVP with pilot customers",
        next3: "Month 5-6: Launch beta and acquire first 50 paying customers",
        progress: "Success = 50 active users with 90%+ satisfaction"
      }
    },
    {
      id: 8,
      title: "Team",
      icon: Brain,
      content: {
        team: "Jane (CEO): 8 years in SMB operations; Tom (CTO): Ex-Google AI engineer",
        skills: "Domain expertise + technical execution",
        gaps: "Looking for VP of Sales and UX designer"
      }
    },
    {
      id: 9,
      title: "Questions for Mentors",
      icon: HelpCircle,
      content: {
        question1: "How do we price for maximum adoption vs. revenue?",
        question2: "What's the best go-to-market strategy for SMBs?",
        question3: "How do we compete with established players like Zapier?"
      }
    },
    {
      id: 10,
      title: "Thank You / Contact",
      icon: Heart,
      content: {
        contact: "jane@innovatetech.com",
        followup: "Looking for mentorship in go-to-market strategy",
        next: "Happy to share detailed product demo"
      }
    }
  ];
  const [slides, setSlides] = useState<any[]>(defaultSlides);

  useEffect(() => {
    (async () => {
      try {
        // Resolve current team id
        const status = await apiClient.get('/team-formation/status/');
        const tId = (status as any)?.data?.current_team?.id as number | undefined;
        if (!tId) return;
        try { localStorage.setItem('xfactoryTeamId', String(tId)); } catch {}
        setTeamId(tId);

        // COMMENTED OUT: Guidelines GET request
        // const genGuidelines = (async () => {
        //   try {
        //     const resp = await apiClient.getPitchGuidelinesTeam(teamId);
        //     if (resp?.status >= 200 && resp.status < 300) return resp.data;
        //     return null;
        //   } catch {
        //     return null;
        //   }
        // })();

        // Load existing coaching (no auto-generation)
        const genCoaching = (async () => {
          try {
            const resp = await apiClient.getPitchCoachingTeam(teamId);
            if (resp?.status >= 200 && resp.status < 300) return resp.data;
            // No auto-generation - just return null if not found
            return null;
          } catch (e) {
            return null;
          } finally {
            setIsGeneratingCoaching(false);
          }
        })();

        // COMMENTED OUT: Slides GET request
        // const fetchSlides = (async () => {
        //   try {
        //     const resp = await apiClient.get(`/pitch-deck/teams/${teamId}/practice-slides/`);
        //     const s = (resp as any)?.data?.slides;
        //     return Array.isArray(s) ? s : [];
        //   } catch { return []; }
        // })();

        // Load existing coaching only
        const cRes = await genCoaching;
        if (cRes) setCoaching(cRes?.coaching || cRes);
        
        // Load submission data
        await loadSubmissionData(tId);
        
        // Check for existing PPTX presentation
        try {
          const pdfCheck = await apiClient.getLatestGammaTeam(tId);
          const pdfUrlData = (pdfCheck as any)?.data;
          if (pdfUrlData?.pdf_url) {
            const ok = await waitForPptxAccessible(pdfUrlData.pdf_url);
            if (ok) {
              setPdfUrl(pdfUrlData.pdf_url);
              setPdfNonce(Date.now());
              setGeneratedPDF(true);
            }
          }
        } catch (e) {
          // No existing PDF, that's fine
        }
        
        // COMMENTED OUT: Load quantitative data for context (contains GET requests)
        // await loadQuantitativeData(teamId);
        
        // COMMENTED OUT: Auto-open advice when content ready
        // if (!selectedOption && (cRes)) {
        //   setSelectedOption('advice');
        // }
      } catch {}
    })();
  }, []);

  // Normalize advice slides to a consistent shape with fallback icon/content
  const normalizedAdviceSlides = ((): any[] => {
    const c = coaching?.coaching || coaching;
    if (!c || typeof c !== 'object') return [];
    const iconMap = [Brain, AlertTriangle, Lightbulb, FlaskConical, UserCheck, DollarSign, Milestone, Brain, HelpCircle, Heart];
    const items = [
      { id: 1, title: 'Title', text: c.title_line, icon: iconMap[0] },
      { id: 2, title: 'Problem', text: c.problem_advice, icon: iconMap[1] },
      { id: 3, title: 'Unique Insight', text: c.insight_advice, icon: iconMap[2] },
      { id: 4, title: 'Solution Concept', text: c.solution_advice, icon: iconMap[3] },
      { id: 5, title: 'Customer + Validation', text: c.customer_validation_advice, icon: iconMap[4] },
      { id: 6, title: 'Business Hypothesis', text: c.business_hypothesis_advice, icon: iconMap[5] },
      { id: 7, title: 'Roadmap', text: c.roadmap_advice, icon: iconMap[6] },
      { id: 8, title: 'Team', text: c.team_advice, icon: iconMap[7] },
      { id: 9, title: 'Questions for Mentors', text: c.mentor_questions_advice, icon: iconMap[8] },
      { id: 10, title: 'Thank You / Contact', text: c.closing_advice, icon: iconMap[9] },
    ];
    return items
      .filter(item => (item.text && String(item.text).trim().length > 0))
      .map(item => ({ id: item.id, title: item.title, icon: item.icon || Brain, content: { text: item.text } }));
  })();

  const displayedSlides = selectedOption === 'advice' ? normalizedAdviceSlides : slides;

  // Ensure currentSlide index is in bounds
  useEffect(() => {
    if (currentSlide >= displayedSlides.length) {
      setCurrentSlide(0);
    }
  }, [displayedSlides.length]);

  // Check if pitch deck submission exists and mark as complete
  useEffect(() => {
    (async () => {
      if (submissionData?.submission) {
        try {
          const status = await apiClient.get('/team-formation/status/');
          const teamId = (status as any)?.data?.current_team?.id;
          if (teamId) {
            await apiClient.put(`/ideation/teams/${teamId}/roadmap-completion/`, { 
              pitch_deck: { 
                slides_generated: true,
                submission_completed: true
              } 
            });
          }
        } catch (e) {
          console.error('Error updating roadmap completion on load:', e);
        }
      }
    })();
  }, [submissionData]);

  if (isGeneratingCoaching) {
    return (
      <div className="min-h-screen bg-background">
        {/* Purple Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white">
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={onBack} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-3">
                    <TestTube className="h-8 w-8" />
                    Pitch Practice Station
                  </h1>
                  <p className="text-purple-100 mt-1">
                    Perfect your investor pitch with marketing-aware guidelines and AI coaching
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-semibold text-foreground">Loading Presentation Coaching</div>
              <div className="text-muted-foreground">Generating personalized pitch insights based on your validation data...</div>
              <div className="text-sm text-muted-foreground">This may take up to a minute</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    const pitchData = {
      slides: displayedSlides,
      currentSlide,
      completedAt: new Date().toISOString(),
      selectedOption,
      generatedPDF
    };

    if (!reviewMode) {
      StationFlowManager.saveStationOutput('pitch-practice', pitchData, 90);
    }
    
    onComplete(pitchData);
  };

  const handleGeneratePresentation = async () => {
    try {
      setIsGenerating(true);
      const status = await apiClient.get('/team-formation/status/');
      const teamId = (status as any)?.data?.current_team?.id as number | undefined;
      if (!teamId) { setIsGenerating(false); return; }
      // Always force a fresh generation to avoid serving a prior deck after pivots/resets
      const enqueue = await apiClient.enqueueGammaTeam(teamId, true);
      if ((enqueue as any)?.status === 202 || (enqueue as any)?.status === 200) {
        // If it's mode: "existing", use the PDF URL immediately
        if ((enqueue as any)?.data?.mode === 'existing' && (enqueue as any)?.data?.pdf_url) {
          setGeneratedPDF(true);
          setPdfUrl((enqueue as any).data.pdf_url);
          setIsGenerating(false);
          return;
        }
        // Start polling for latest PDF URL if it's a new generation
        const start = Date.now();
        const timeoutMs = 6 * 60 * 1000; // 6 minutes
        const pollDelay = async (ms: number) => new Promise(r => setTimeout(r, ms));
        let delay = 4000;
        while (Date.now() - start < timeoutMs) {
          const latest = await apiClient.getLatestGammaTeam(teamId);
          const url = (latest as any)?.data?.pdf_url || (latest as any)?.pdf_url;
          if (url) {
            const ok = await waitForPptxAccessible(url);
            if (ok) {
              setPdfUrl(url);
              setPdfNonce(Date.now());
              setGeneratedPDF(true);
              break;
            }
          }
          await pollDelay(delay);
          delay = Math.min(Math.floor(delay * 1.5), 15000);
        }
      }
    } catch (e) {
      console.error('Gamma enqueue/poll failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < displayedSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const renderSlideContent = (slide: any) => {
    const IconComponent = slide?.icon || Brain;
    const content = slide?.content || {};
    
    return (
      <div className="h-full flex flex-col">
        {/* Slide number in top right */}
        <div className="flex justify-end mb-4 flex-shrink-0">
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
            {slide?.id ?? ''}
          </div>
        </div>
        
        {/* Scrollable slide content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col items-center justify-start text-center space-y-4 min-h-full">
            <IconComponent className="h-12 w-12 text-primary flex-shrink-0" />
            <h2 className="text-2xl font-bold text-foreground flex-shrink-0">{slide?.title ?? 'Slide'}</h2>
            
            <div className="space-y-3 text-sm text-muted-foreground max-w-xs">
              {Object.entries(content)
                .map(([key, value]) => (typeof value === 'string' ? value : JSON.stringify(value)))
                .filter((text) => !!text && String(text).trim().length > 0)
                .map((text, index) => (
                  <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                    {text as string}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white relative">
        {/* Left Section - Logos (Absolute) */}
        <div className="absolute left-0 top-0 h-full flex items-center gap-4 pl-6">
          <img src="/logos/prov_logo_white.png" alt="xFactory" className="h-8" />
          <img src="/logos/fiualonetransreverse.png" alt="FIU" className="h-8" />
        </div>

        {/* Right Section - User Controls (Absolute) */}
        <div className="absolute right-0 top-0 h-full flex items-center gap-2 pr-6">
          <Badge variant="outline" className="text-sm bg-white/10 border-white/20 text-white">
            {(() => {
              const sid = stationId ?? Number(localStorage.getItem('xfactoryCurrentStation') || '0');
              return sid === 4 ? 'Station 4/15' : sid === 11 ? 'Station 11/15' : `Station ${sid || '?'} / 15`;
            })()}
          </Badge>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/10">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/10">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/10" onClick={onBack}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Middle Section - Station Info */}
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <TestTube className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {(stationId ?? Number(localStorage.getItem('xfactoryCurrentStation') || '0')) === 4 ? 'Mentor Pitch Deck' : 'Pitch Practice Station'}
                </h1>
                <p className="text-sm text-purple-100">
                  {(stationId ?? Number(localStorage.getItem('xfactoryCurrentStation') || '0')) === 4
                    ? 'Prepare a concise mentor-facing deck with targeted feedback prompts'
                    : 'Perfect your investor pitch with marketing-aware guidelines and AI coaching'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">

        {/* Marketing-Aware Guidelines */}
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Pitch Guidelines Based on Your Brand Strategy
              <InfoButton
                title="Guideline Decoder"
                content={`**Why this matters**
                Translates your brand persona into talking points that actually match your slides.
                Use it so you do not sound like five different companies in one pitch.`}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Brand Positioning Guidelines</h4>
                <div className="space-y-2 text-sm">
                    <>
                      <div className="p-3 bg-background rounded-lg border">
                      <strong>Professional Tone:</strong> {guidelines?.professional_tone || "Maintain confidence without arrogance"}
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                      <strong>Clear Value:</strong> {guidelines?.clear_value || "Lead with your strongest competitive advantage"}
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                      <strong>Customer Focus:</strong> {guidelines?.customer_focus || "Start with the problem, not the solution"}
                      </div>
                    </>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Presentation Strategy</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-background rounded-lg border">
                    <strong>Opening Hook:</strong> {guidelines?.opening_hook || "Start with a compelling statistic or story"}
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <strong>Problem Statement:</strong> {guidelines?.problem_statement || "Make it personal and urgent for investors"}
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <strong>Solution Clarity:</strong> {guidelines?.solution_clarity || "Explain in simple terms, avoid jargon"}
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <strong>Market Opportunity:</strong> {guidelines?.market_opportunity || "Use data to show addressable market size"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Option Selection */}
        {!selectedOption && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
              if (coaching) {
                setSelectedOption('advice');
              } else {
                generateCoachingWithContext();
              }
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  Pitch Deck Coaching
                  <InfoButton
                    title="Coach-in-a-Box"
                    content={`**Pitch coaching feedback**
                    Provides slide-by-slide feedback to improve your presentation.
                    Review the notes, update your deck, and practice with the insights.`}
                  />
                </CardTitle>
                <CardDescription>
                  {coaching ? 'View personalized insights as a 10-slide mentor deck' : 'Generate AI coaching with quantitative survey context'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    {coaching 
                      ? 'Click to open the coaching slideshow.' 
                      : 'Click to generate personalized pitch insights based on your validation data and survey results.'
                    }
                  </div>
                  {quantitativeData && (
                    <div className="text-xs text-primary">
                      ✓ Quantitative survey data loaded ({quantitativeData.responseVolume} responses)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedOption('generate')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  Generate Presentation
                  <InfoButton
                    title="Instant Deck Mode"
                    content={`**Automated deck generation**
                    Lets the AI draft slides so you can focus on storytelling.
                    Always review the content before presenting to ensure accuracy.`}
                  />
                </CardTitle>
                <CardDescription>
                  Create a complete pitch deck aligned with your marketing strategy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI-powered presentation generation using your brand voice and market positioning.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Advice Mode - Slideshow */}
        {selectedOption === 'advice' && (
          <div className="space-y-6">
            {/* Navigation Controls */}
            <div className="relative flex items-center">
              <div className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronUp className="h-4 w-4" />
                  {currentSlide > 0 ? `Previous: ${displayedSlides[currentSlide - 1].title}` : 'Previous'}
                </Button>
              </div>
              
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Badge variant="outline" className="text-sm">
                  Slide {currentSlide + 1} of {displayedSlides.length}
                </Badge>
              </div>
              
              <div className="flex-1 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextSlide}
                  disabled={currentSlide === displayedSlides.length - 1}
                  className="flex items-center gap-2"
                >
                  {currentSlide < displayedSlides.length - 1 ? `Next: ${displayedSlides[currentSlide + 1].title}` : 'Next'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Slide Display */}
            <div className="flex justify-center">
              <div className="w-96 h-96 bg-card border-2 border-primary/20 rounded-lg shadow-lg overflow-hidden">
                <div className="h-full p-6 bg-gradient-to-br from-background to-muted/20">
                  {renderSlideContent(displayedSlides[currentSlide])}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Presentation Generation Mode */}
        {selectedOption === 'generate' && !generatedPDF && (
          <div className="text-center space-y-6">
            {!isGenerating ? (
              <div className="space-y-4">
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold mb-2">Ready to Generate Your Presentation?</h3>
                  <p className="text-muted-foreground text-sm">
                    We'll create a professional pitch deck based on your business data and the validation insights you've gathered.
                  </p>
                </div>
                <Button 
                  onClick={handleGeneratePresentation} 
                  className="bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Generate Presentation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Generating Your Presentation...</h3>
                <p className="text-muted-foreground">
                  Please wait while we create your professional pitch deck. This may take a few moments.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generated PDF Placeholder */}
        {selectedOption === 'generate' && generatedPDF && (
          <div className="text-center space-y-6">
            <div className="max-w-md mx-auto">
              <div className="bg-card border-2 border-dashed border-primary/20 rounded-lg p-8 space-y-4">
                <FileText className="h-16 w-16 text-primary mx-auto" />
                <h3 className="text-xl font-semibold">Presentation Generated!</h3>
                <p className="text-muted-foreground text-sm">
                  Your professional pitch deck has been created and is ready for download.
                </p>
                <div className="space-y-2">
                <p className="text-xs text-muted-foreground">pitch-deck-presentation.pptx</p>
                <p className="text-xs text-muted-foreground">12 slides • 2.3 MB</p>
                </div>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        {selectedOption && (
          <div className="flex items-center justify-center gap-4 pt-8">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedOption(null);
                setGeneratedPDF(false);
                setIsGenerating(false);
                setCurrentSlide(0);
              }}
            >
              Back to Options
            </Button>
            <Button 
              onClick={() => {
                if (isStationComplete()) {
                  onBack(); // Go back to dashboard if already complete
                } else {
                  setShowSubmissionPopup(true); // Show submission popup
                }
              }} 
              className="bg-primary hover:bg-primary/90"
            >
              {isStationComplete() ? 'Back to Dashboard' : 'Complete Station'}
            </Button>
          </div>
        )}
      </div>

      {/* Submission Popup */}
      {showSubmissionPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Submit Pitch Deck</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSubmissionPopup(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  PDF Presentation Link (Google Drive)
                </label>
                <input
                  type="url"
                  value={pdfLink}
                  onChange={(e) => setPdfLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  5-Minute Video Link (Google Drive)
                </label>
                <input
                  type="url"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Please ensure both files are:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Shared with "Anyone with the link can view"</li>
                  <li>Uploaded to Google Drive</li>
                  <li>PDF: Your presentation slides</li>
                  <li>Video: 5-minute presentation recording</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowSubmissionPopup(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitSubmission}
                disabled={isSubmitting || !pdfLink.trim() || !videoLink.trim()}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Ivie Assistant */}
      <FactorAI currentStation={8} userData={{}} context="pitch-practice" />
    </div>
  );
};