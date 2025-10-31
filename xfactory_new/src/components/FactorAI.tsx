import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, Minimize2, Maximize2, Settings, Lightbulb, Target, Code, TestTube, TrendingUp, Rocket, Zap, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FactorAIProps {
  currentStation?: number;
  stationData?: any;
  userData?: any;
  context?: string;
  onGenerate?: () => void;
  onRegenerate?: () => void;
  canGenerate?: boolean;
  canRegenerate?: boolean;
  isGenerating?: boolean;
}

export const FactorAI = ({ 
  currentStation = 1, 
  stationData, 
  userData, 
  context, 
  onGenerate, 
  onRegenerate, 
  canGenerate = false, 
  canRegenerate = false, 
  isGenerating = false 
}: FactorAIProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [supportTimerOn, setSupportTimerOn] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState<string | null>(null);
  const [messageBank, setMessageBank] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Show floating messages when Ivie is closed (every 5 minutes)
  useEffect(() => {
    if (isOpen) {
      setFloatingMessage(null); // Clear when opened
      return;
    }
    
    const floatingBank = [
      "Need help understanding something? Click on me!",
      "I'm here whenever you need guidance. Just ask.",
      "Stuck or confused? I can help clarify anything.",
      "Building a startup? I'm here to support you.",
      "No question is too basic. Click me if you're unsure.",
      "You've got this! I'm here if you need me."
    ];
    
    const pick = () => floatingBank[Math.floor(Math.random() * floatingBank.length)];
    
    // Show first message after a delay
    const firstTimeout = setTimeout(() => {
      setFloatingMessage(pick());
    }, 30000); // 30 seconds after closing
    
    // Then every 5 minutes
    const interval = setInterval(() => {
      setFloatingMessage(pick());
    }, 5 * 60 * 1000);
    
    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [isOpen]);

  // Periodic supportive nudges every 5 minutes while open
  useEffect(() => {
    if (!isOpen || !supportTimerOn) return;
    const bank = [
      "You're doing great—small steps lead to real momentum.",
      "Need help unblocking something? I can suggest next actions.",
      "Remember to validate with users early—evidence beats assumptions.",
      "Focus on one concrete outcome this session. I can help you define it.",
      "If you're stuck, describe the bottleneck—I'll propose options."
    ];
    const pick = () => bank[Math.floor(Math.random() * bank.length)];
    const id = setInterval(() => {
      setMessages(prev => ([
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: pick(), timestamp: new Date() }
      ]));
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [isOpen, supportTimerOn]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show onboarding messages when opening Ivie
  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      const welcomeBank = [
        "I'm here for whatever you need. Click on me if you don't understand something—I'll help you through it.",
        "No question is too small. I'm here to support you on your startup journey. Reach out anytime.",
        "You've got this. If anything feels unclear, I'm just a click away to help you make progress.",
        "Building a startup can feel overwhelming, but you're not alone. I'm here to guide and support you.",
        "Whether you're stuck, confused, or just need someone to chat with about your idea—I've got your back.",
        "Your journey starts with a single step. I'm here to help you take that next step confidently."
      ];
      const message = welcomeBank[Math.floor(Math.random() * welcomeBank.length)];
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: message,
        timestamp: new Date()
      }]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome]);

  // Show a supportive message when window regains focus (user returns to app)
  useEffect(() => {
    const handleFocus = () => {
      if (!document.hasFocus() || !isOpen || !hasShownWelcome) return;
      const supportBank = [
        "Welcome back! I'm still here whenever you need help.",
        "I'm ready when you are. If you're feeling stuck or confused, just ask me.",
        "You're doing great. Remember: progress over perfection. Need anything clarified?",
        "Building something new is hard, but you're making moves. Want to talk about what's on your mind?",
        "I'm here to help you succeed. What part would you like to understand better?",
        "Take your time, and ask me anything. No question is too basic—we all start somewhere."
      ];
      const welcomeMsg = supportBank[Math.floor(Math.random() * supportBank.length)];
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeMsg,
        timestamp: new Date()
      }]);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, hasShownWelcome]);

  const getContextualWelcome = () => {
    const stationNames: Record<number, string> = {
      1: "Idea Creation Station",
      2: "Visual Mockup Station", 
      3: "Validation Engine",
      4: "Prototyping Station",
      5: "Testing Station",
      6: "Iteration Station",
      7: "Scaling Station",
      8: "Launch Station",
      9: "Monitoring Station"
    };

    const stationName = stationNames[currentStation] || "Factory";
    
    const contextualHelp: Record<number, string> = {
      1: "I can help you refine your startup idea, identify problems to solve, and explore market opportunities. What aspect of idea creation would you like to explore?",
      2: "I'm here to help you create compelling visual mockups and wireframes. I can suggest design patterns, user flows, and visual elements that will make your product stand out.",
      3: "Let's validate your idea together! I can help you design surveys, identify target customers, analyze market competition, and interpret validation results.",
      4: "Ready to build a prototype? I can guide you through technical architecture, feature prioritization, development approaches, and MVP planning.",
      5: "Time to test your product! I can help you design user testing protocols, create feedback collection systems, and analyze testing results.",
      6: "Let's iterate and improve! I can help you prioritize feedback, plan product improvements, and optimize user experience based on testing data.",
      7: "Ready to scale? I can assist with growth strategies, team building, infrastructure planning, and operational optimization.",
      8: "Launch time! I'll help you with go-to-market strategies, marketing campaigns, distribution channels, and launch execution.",
      9: "Let's monitor and optimize! I can help you track key metrics, analyze performance data, and identify areas for continuous improvement."
    };

    return `👋 Hi! I'm **Ivie**, your AI startup advisor. 

I see you're at the **${stationName}**. ${contextualHelp[currentStation] || "I'm here to help you build an amazing startup!"}

💡 **Quick tips for this station:**
${getQuickTips(currentStation)}

What would you like to work on today?`;
  };

  const getQuickTips = (station: number) => {
    const tips: Record<number, string> = {
      1: "• Focus on real problems people face daily\n• Research your target market thoroughly\n• Keep your solution simple and focused",
      2: "• Start with low-fidelity wireframes\n• Focus on user flow before visual design\n• Test concepts with potential users",
      3: "• Talk to at least 50 potential customers\n• Test your assumptions, not just your solution\n• Look for strong emotional responses",
      4: "• Build the smallest viable version first\n• Focus on core functionality only\n• Plan your technical architecture early",
      5: "• Test with real users, not friends/family\n• Observe behavior, don't just ask questions\n• Document everything for analysis",
      6: "• Prioritize changes based on user impact\n• A/B test major changes\n• Don't change everything at once",
      7: "• Focus on sustainable growth metrics\n• Build systems that can handle scale\n• Hire based on future needs",
      8: "• Create buzz before launch day\n• Have customer support ready\n• Monitor everything closely",
      9: "• Track leading and lagging indicators\n• Set up automated alerts\n• Regular review cycles are crucial"
    };
    return tips[station] || "• Stay focused on your goals\n• Ask for help when needed\n• Celebrate small wins";
  };

  const getTeamId = async (): Promise<number | null> => {
    try {
      const cached = localStorage.getItem('xfactoryTeamId');
      const teamId = cached ? Number(cached) : null;
      if (teamId) return teamId;
      const status = await apiClient.get('/team-formation/status/');
      return (status as any)?.data?.current_team?.id || null;
    } catch { return null; }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const teamId = await getTeamId();
      const payloadHistory = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const res = teamId ? await apiClient.assistantChatTeam(teamId, {
        message: inputMessage,
        history: payloadHistory,
        station: currentStation,
        user_data: userData
      }) : { status: 400, data: { error: 'No team found' } } as any;

      if ((res as any)?.error || (res as any)?.status >= 400) {
        throw new Error((res as any)?.error || 'Chat failed');
      }

      const aiResponse = (res as any)?.data?.reply || "I'm here to help—could you share a bit more detail?";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Ivie Error:', error);
      toast({
        title: "Error",
        description: "Ivie couldn't respond just now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStationIcon = (station: number) => {
    const icons: Record<number, any> = {
      1: Lightbulb,
      2: Code,
      3: Target,
      4: Code,
      5: TestTube,
      6: TrendingUp,
      7: TrendingUp,
      8: Rocket,
      9: TrendingUp
    };
    return icons[station] || Bot;
  };

  // Floating Button
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        {floatingMessage && (
          <div className="absolute bottom-20 left-0 w-64 bg-purple-600 text-white p-3 rounded-lg shadow-lg animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm">{floatingMessage}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFloatingMessage(null)}
                className="h-5 w-5 p-0 hover:bg-purple-700 text-white flex-shrink-0"
              >
                ×
              </Button>
            </div>
            {/* Speech bubble tail */}
            <div className="absolute bottom-0 left-4 transform translate-y-full">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-purple-600"></div>
            </div>
          </div>
        )}
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
        <Badge className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 text-xs whitespace-nowrap">
          Ivie
        </Badge>
      </div>
    );
  }

  // Settings Panel
  if (showSettings) {
    return (
      <div className="fixed bottom-6 left-6 z-50 w-80">
        <Card className="shadow-2xl border-2 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Ivie</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Ivie is connected. Your current station and idea context will guide responses.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className={`fixed bottom-6 left-6 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-80 h-96'
    }`}>
      <Card className="h-full shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        {/* Header */}
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <CardTitle className="text-sm font-bold">Ivie</CardTitle>
                {(() => {
                  const StationIcon = getStationIcon(currentStation);
                  return (
                    <div className="flex items-center gap-1 text-xs opacity-90">
                      <StationIcon className="h-3 w-3" />
                      <span>Station {currentStation}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSettings(true)}
                className="h-6 w-6 p-0 hover:bg-white/20"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsOpen(false);
                  setHasShownWelcome(false); // Reset so next open shows welcome
                }}
                className="h-6 w-6 p-0 hover:bg-white/20"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Chat Messages */}
        {!isMinimized && (
          <>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-64 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <div className="text-sm">
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>

            {/* Action Buttons */}
            {(canGenerate || canRegenerate) && (
              <>
                <Separator />
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
                  <div className="flex gap-2">
                    {canGenerate && (
                      <Button
                        onClick={onGenerate}
                        disabled={isGenerating}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      >
                        {isGenerating ? (
                          <Zap className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate'}
                      </Button>
                    )}
                    {canRegenerate && (
                      <Button
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        {isGenerating ? (
                          <Zap className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        {isGenerating ? 'Generating...' : 'Regenerate'}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Input */}
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask FactorAI anything..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !inputMessage.trim()}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};