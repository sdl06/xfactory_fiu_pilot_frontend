import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  ArrowRight, 
  Lightbulb, 
  Target, 
  Users, 
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  Brain,
  CheckCircle,
  ChevronRight,
  Banknote,
  Lock
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
}

interface Section {
  title: string;
  description: string;
  what_to_think_about: string;
  questions: Question[];
}

interface QuestionnaireData {
  sections: {
    section_1: Section;
    section_2: Section;
    section_3: Section;
    section_4: Section;
    section_5: Section;
    section_6: Section;
    section_7: Section;
    section_8: Section;
  };
}

interface StructuredQuestionnaireProps {
  onComplete: (data: any) => void;
  onBack: () => void;
  teamId: number | null;
}

export const StructuredQuestionnaire = ({ onComplete, onBack, teamId }: StructuredQuestionnaireProps) => {
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [currentSection, setCurrentSection] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Local persistence key (scoped)
  const localKey = (() => {
    try {
      const uid = localStorage.getItem('authUserEmail') || 'anon';
      const team = teamId ? `team_${teamId}` : 'no_team';
      return `xfactory_questionnaire_${uid}_${team}`;
    } catch {
      return 'xfactory_questionnaire_local';
    }
  })();

  // Load questionnaire structure and saved answers
  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        const response = await apiClient.get('/ideation/questionnaire-structure/');
        if (response.status === 200) {
          setQuestionnaireData(response.data);
        }
      } catch (error) {
        console.error('Failed to load questionnaire:', error);
        toast({
          title: "Error",
          description: "Failed to load questionnaire structure. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    const loadSavedAnswers = async () => {
      if (teamId) {
        // For team-based flow, load from team's idea
        try {
          const response = await apiClient.get(`/ideation/structured-idea-input/${teamId}/`);
          if (response.status === 200 && response.data) {
            // Convert the saved data back to the answers format
            const savedAnswers: Record<string, string> = {};
            Object.entries(response.data).forEach(([sectionKey, sectionData]: [string, any]) => {
              if (sectionData && typeof sectionData === 'object') {
                Object.entries(sectionData).forEach(([questionId, answer]: [string, any]) => {
                  if (typeof answer === 'string') {
                    savedAnswers[questionId] = answer;
                  }
                });
              }
            });
            setAnswers(savedAnswers);
          }
        } catch (error) {
          console.error('Failed to load saved answers:', error);
          // Don't show error toast for this, as it's not critical
        }
      } else {
        // For help path (no teamId), load from user's saved progress
        try {
          const response = await apiClient.get('/ideation/user-questionnaire-progress/get/');
          if (response.data?.status === 'success') {
            const progressData = response.data.data;
            setAnswers(progressData.answers || {});
            setCurrentSection(progressData.current_section || 1);
            setCurrentQuestion(progressData.current_question || 0);
          }
        } catch (error) {
          console.log('No saved progress found for user');
        }
      }
    };
    
    loadQuestionnaire();
    loadSavedAnswers();

    // Restore local progress for help path (no teamId)
    if (!teamId) {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.answers && typeof parsed.answers === 'object') setAnswers(parsed.answers);
          if (typeof parsed?.currentSection === 'number') setCurrentSection(parsed.currentSection);
          if (typeof parsed?.currentQuestion === 'number') setCurrentQuestion(parsed.currentQuestion);
        }
      } catch {}
    }
  }, [toast, teamId]);

  if (!questionnaireData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  const sections = [
    { key: 'section_1', title: 'Problem', icon: AlertTriangle, color: 'text-red-600' },
    { key: 'section_2', title: 'Target Segment', icon: Target, color: 'text-blue-600' },
    { key: 'section_3', title: 'Dig Into Problem', icon: Brain, color: 'text-purple-600' },
    { key: 'section_4', title: 'User Persona', icon: Users, color: 'text-green-600' },
    { key: 'section_5', title: 'Current Solutions', icon: Zap, color: 'text-orange-600' },
    { key: 'section_6', title: 'Solution', icon: Lightbulb, color: 'text-yellow-600' },
    { key: 'section_7', title: 'Top 3 Assumptions', icon: TrendingUp, color: 'text-indigo-600' },
    { key: 'section_8', title: 'Biz Model & Growth', icon: Banknote, color: 'text-indigo-600' }
  ];

  const currentSectionKey = sections[currentSection - 1].key as keyof typeof questionnaireData.sections;
  const currentSectionData = questionnaireData.sections[currentSectionKey];
  const currentQuestionData = currentSectionData.questions[currentQuestion];
  const totalQuestions = sections.reduce((acc, section) => {
    const sectionData = questionnaireData.sections[section.key as keyof typeof questionnaireData.sections];
    return acc + sectionData.questions.length;
  }, 0);
  
  const currentQuestionNumber = sections.slice(0, currentSection - 1).reduce((acc, section) => {
    const sectionData = questionnaireData.sections[section.key as keyof typeof questionnaireData.sections];
    return acc + sectionData.questions.length;
  }, 0) + currentQuestion + 1;

  const progressPercentage = (currentQuestionNumber / totalQuestions) * 100;

  // Check if a section is completed (all required questions answered)
  const isSectionCompleted = (sectionNumber: number) => {
    const sectionKey = `section_${sectionNumber}` as keyof typeof questionnaireData.sections;
    const sectionData = questionnaireData.sections[sectionKey];
    
    if (!sectionData) return false;
    
    // Check if all required questions in this section are answered
    return sectionData.questions.every(question => {
      if (!question.required) return true;
      return answers[question.id] && answers[question.id].trim().length > 0;
    });
  };

  // Check if a section is accessible (completed or current section)
  const isSectionAccessible = (sectionNumber: number) => {
    // Always allow access to current section
    if (sectionNumber === currentSection) return true;
    
    // Allow access to completed sections
    if (isSectionCompleted(sectionNumber)) return true;
    
    // Allow access to previous sections (for navigation)
    if (sectionNumber < currentSection) return true;
    
    return false;
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionData.id]: value
    }));

    // Save progress
    if (!teamId) {
      // For help path, save to backend
      const saveProgress = async () => {
        try {
          await apiClient.post('/ideation/user-questionnaire-progress/', {
            answers: { [currentQuestionData.id]: value },
            current_section: currentSection,
            current_question
          });
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
      };
      saveProgress();
      
      // Also save locally as fallback
      try {
        const snapshot = {
          answers: { ...answers, [currentQuestionData.id]: value },
          currentSection,
          currentQuestion,
          updatedAt: Date.now()
        };
        localStorage.setItem(localKey, JSON.stringify(snapshot));
      } catch {}
    }
  };

  const canContinue = () => {
    if (!currentQuestionData.required) return true;
    const answer = answers[currentQuestionData.id];
    return answer && answer.trim().length > 0;
  };

  const autoSaveAnswer = async () => {
    if (!teamId || !currentQuestionData) return;
    
    try {
      // Create a minimal structure for auto-saving
    const sectionKey = sections[currentSection - 1].key as string;
      const autoSaveData = {
        team_id: teamId,
        [sectionKey]: {
          [currentQuestionData.id]: answers[currentQuestionData.id]
        }
      };
      
      await apiClient.post('/ideation/structured-idea-input/', autoSaveData);
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    }
  };

  const handleNext = async () => {
    // Auto-save current answer before moving
    if (teamId && currentQuestionData && answers[currentQuestionData.id]) {
      try {
        await autoSaveAnswer();
      } catch (error) {
        console.error('Failed to auto-save answer:', error);
        // Continue anyway, don't block user progress
      }
    }
    
    if (currentQuestion < currentSectionData.questions.length - 1) {
      // Next question in same section
      setCurrentQuestion(prev => {
        const next = prev + 1;
        if (!teamId) {
          // Save progress to backend for help path
          const saveProgress = async () => {
            try {
              await apiClient.post('/ideation/user-questionnaire-progress/', {
                answers,
                current_section: currentSection,
                current_question: next
              });
            } catch (error) {
              console.error('Failed to save progress:', error);
            }
          };
          saveProgress();
          
          // Also save locally as fallback
          try { localStorage.setItem(localKey, JSON.stringify({ answers, currentSection, currentQuestion: next, updatedAt: Date.now() })); } catch {}
        }
        return next;
      });
    } else if (currentSection < 8) {
      // Next section
      setCurrentSection(prev => {
        const nextSection = prev + 1;
        if (!teamId) {
          // Save progress to backend for help path
          const saveProgress = async () => {
            try {
              await apiClient.post('/ideation/user-questionnaire-progress/', {
                answers,
                current_section: nextSection,
                current_question: 0
              });
            } catch (error) {
              console.error('Failed to save progress:', error);
            }
          };
          saveProgress();
          
          // Also save locally as fallback
          try { localStorage.setItem(localKey, JSON.stringify({ answers, currentSection: nextSection, currentQuestion: 0, updatedAt: Date.now() })); } catch {}
        }
        return nextSection;
      });
      setCurrentQuestion(0);
    } else {
      // All done, submit
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      // Previous question in same section
      setCurrentQuestion(prev => {
        const next = prev - 1;
        if (!teamId) {
          // Save progress to backend for help path
          const saveProgress = async () => {
            try {
              await apiClient.post('/ideation/user-questionnaire-progress/', {
                answers,
                current_section: currentSection,
                current_question: next
              });
            } catch (error) {
              console.error('Failed to save progress:', error);
            }
          };
          saveProgress();
          
          // Also save locally as fallback
          try { localStorage.setItem(localKey, JSON.stringify({ answers, currentSection, currentQuestion: next, updatedAt: Date.now() })); } catch {}
        }
        return next;
      });
    } else if (currentSection > 1) {
      // Previous section
      setCurrentSection(prev => {
        const nextSection = prev - 1;
        if (!teamId) {
          // Save progress to backend for help path
          const saveProgress = async () => {
            try {
              await apiClient.post('/ideation/user-questionnaire-progress/', {
                answers,
                current_section: nextSection,
                current_question
              });
            } catch (error) {
              console.error('Failed to save progress:', error);
            }
          };
          saveProgress();
          
          // Also save locally as fallback
          try { localStorage.setItem(localKey, JSON.stringify({ answers, currentSection: nextSection, currentQuestion, updatedAt: Date.now() })); } catch {}
        }
        return nextSection;
      });
      const prevSectionData = questionnaireData.sections[`section_${currentSection - 1}` as keyof typeof questionnaireData.sections];
      setCurrentQuestion(prevSectionData.questions.length - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Organize answers by section
      const sectionAnswers: Record<string, Record<string, string>> = {};
      
      Object.entries(questionnaireData.sections).forEach(([sectionKey, section]) => {
        sectionAnswers[sectionKey] = {};
        section.questions.forEach(question => {
          if (answers[question.id]) {
            sectionAnswers[sectionKey][question.id] = answers[question.id];
          }
        });
      });

      // If no teamId, just pass the answers to onComplete
      if (!teamId) {
        // Mark questionnaire as completed in backend
        try {
          await apiClient.post('/ideation/user-questionnaire-progress/', {
            answers,
            current_section: currentSection,
            current_question,
            completed: true
          });
        } catch (error) {
          console.error('Failed to mark questionnaire as completed:', error);
        }
        
        // Save completion snapshot locally as fallback
        try { localStorage.setItem(localKey, JSON.stringify({ answers, currentSection, currentQuestion, completedAt: Date.now() })); } catch {}
        onComplete(sectionAnswers);
        return;
      }

      const response = await apiClient.post('/ideation/structured-idea-input/', {
        team_id: teamId,
        ...sectionAnswers
      });

      if (response.status >= 200 && response.status < 300) {
        toast({
          title: "Success!",
          description: "Your idea questionnaire has been saved successfully.",
        });
        onComplete(response.data);
      } else {
        throw new Error(response.data?.error || 'Failed to save questionnaire');
      }
    } catch (error: any) {
      console.error('Failed to submit questionnaire:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save questionnaire. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionIcon = (sectionNumber: number) => {
    const section = sections[sectionNumber - 1];
    if (!section) return Lightbulb;
    return section.icon;
  };

  const getSectionColor = (sectionNumber: number) => {
    const section = sections[sectionNumber - 1];
    if (!section) return 'text-primary';
    return section.color;
  };

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Header */}
      <div className="border-b border-border bg-primary w-full">
        <div className="w-full px-1 sm:px-2 lg:px-4 xl:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-foreground">Idea Questionnaire</h1>
                <p className="text-sm text-primary-foreground/80">Structured idea development</p>
              </div>
            </div>
            <Badge variant="warning">Question {currentQuestionNumber} of {totalQuestions}</Badge>
          </div>
        </div>
      </div>

      <div className="w-full py-4 sm:py-6 lg:py-8">
        {/* Progress Bar */}
        <div className="mb-8 px-2 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Progress: {currentQuestionNumber} of {totalQuestions}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Section Progress Indicator (icons clickable to jump to first question) */}
        <div className="mb-6 sm:mb-8 px-2 sm:px-4 lg:px-6 xl:px-8">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-4">
            {sections.map((section, index) => {
              const isActive = currentSection === index + 1;
              const isCompleted = currentSection > index + 1;
              const Icon = section.icon;
              
              return (
                <button
                  type="button"
                  onClick={() => { 
                    // Only allow navigation to accessible sections
                    if (!isSectionAccessible(index + 1)) {
                      toast({
                        title: "Section Locked",
                        description: "Complete the current section before accessing this one.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setCurrentSection(index + 1); 
                    setCurrentQuestion(0);
                    
                    // Save progress when jumping to different section
                    if (!teamId) {
                      const saveProgress = async () => {
                        try {
                          await apiClient.post('/ideation/user-questionnaire-progress/', {
                            answers,
                            current_section: index + 1,
                            current_question: 0
                          });
                        } catch (error) {
                          console.error('Failed to save progress:', error);
                        }
                      };
                      saveProgress();
                      
                      // Also save locally as fallback
                      try { localStorage.setItem(localKey, JSON.stringify({ answers, currentSection: index + 1, currentQuestion: 0, updatedAt: Date.now() })); } catch {}
                    }
                  }}
                  key={section.key}
                  className={`flex flex-col items-center gap-2 flex-1 focus:outline-none ${
                    !isSectionAccessible(index + 1) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'border-green-500 bg-green-500 text-white'
                        : isSectionCompleted(index + 1)
                          ? 'border-green-500 bg-green-500 text-white'
                          : !isSectionAccessible(index + 1)
                            ? 'border-gray-300 bg-gray-100 text-gray-400'
                            : 'border-muted bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted || isSectionCompleted(index + 1) ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : !isSectionAccessible(index + 1) ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : section.color}`} />
                    )}
                  </div>
                  <span
                    title={section.title}
                    className={`text-xs font-medium text-center px-1 leading-tight whitespace-normal overflow-hidden h-10 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {section.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Card */}
        <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                getSectionColor(currentSection).replace('text-', 'bg-') + '/10'
              }`}>
                {(() => {
                  const Icon = getSectionIcon(currentSection);
                  return <Icon className={`h-6 w-6 ${getSectionColor(currentSection)}`} />;
                })()}
              </div>
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl sm:text-2xl">
                  Section {currentSection}: {currentSectionData.title}
                </CardTitle>
                <CardDescription className="text-base sm:text-lg mt-2">
                  {currentSectionData.description}
                </CardDescription>
              </div>
            </div>
            
            {/* What to think about */}
            <div className="bg-muted/50 rounded-lg p-4 border border-muted">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-muted-foreground mb-1">What to think about:</p>
                  <p className="text-sm text-muted-foreground">{currentSectionData.what_to_think_about}</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8">
            {/* Question */}
            <div className="text-center">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-4 sm:mb-6">
                Question {currentQuestion + 1}:
              </h3>
              <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed w-full">
                {currentQuestionData.text}
              </p>
            </div>

            {/* Answer Input */}
            <div className="w-full">
              <Textarea
                placeholder="Type your answer here..."
                value={answers[currentQuestionData.id] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="min-h-[150px] sm:min-h-[200px] lg:min-h-[250px] text-base sm:text-lg lg:text-xl resize-none w-full"
                disabled={isSubmitting}
              />
              {currentQuestionData.required && (
                <p className="text-sm sm:text-base text-muted-foreground mt-3 text-center">
                  * This question is required
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentSection === 1 && currentQuestion === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {currentQuestionNumber} of {totalQuestions}
                </span>
              </div>

              <Button
                onClick={handleNext}
                disabled={!canContinue() || isSubmitting}
                className="flex items-center gap-2 px-6"
              >
                {currentSection === 8 && currentQuestion === currentSectionData.questions.length - 1 ? (
                  <>
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {isSubmitting ? 'Saving...' : 'Complete'}
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Factory Button */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Factory
          </Button>
        </div>
      </div>
    </div>
  );
};
