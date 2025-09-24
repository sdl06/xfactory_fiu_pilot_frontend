import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, Minimize2, Maximize2, Settings, Lightbulb, Target, Code, TestTube, TrendingUp, Rocket, Zap, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('factorai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with contextual welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = getContextualWelcome();
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, currentStation]);

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

    return `👋 Hi! I'm **FactorAI**, your AI startup advisor. 

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

  const saveApiKey = (key: string) => {
    localStorage.setItem('factorai_api_key', key);
    setApiKey(key);
    setShowSettings(false);
    toast({
      title: "API Key Saved",
      description: "Your OpenAI API key has been saved locally.",
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in settings to use FactorAI.",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

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

      const systemPrompt = `You are FactorAI, an expert startup advisor helping entrepreneurs build successful companies. 

CONTEXT:
- Current Station: ${currentStation} (${stationNames[currentStation] || 'Unknown'})
- User Business Type: ${userData?.businessType || 'Not specified'}
- User Idea: ${userData?.ideaSummary || 'Not specified'}
- Completed Stations: ${stationData?.completedStations?.join(', ') || 'None'}

PERSONALITY:
- Be encouraging and practical
- Give actionable advice
- Ask follow-up questions to understand better
- Use startup terminology appropriately
- Be concise but thorough
- Include relevant examples when helpful

FOCUS:
Provide advice specifically relevant to their current station and overall startup journey. Help them overcome challenges and make progress.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: inputMessage }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('FactorAI Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from FactorAI. Please check your API key and try again.",
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
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
        <Badge className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 text-xs whitespace-nowrap">
          FactorAI
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
                <CardTitle className="text-lg">FactorAI Settings</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                <strong>For production use:</strong> Connect to Supabase and add your OpenAI API key to Edge Function Secrets.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                For now, enter your API key below (stored locally):
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">OpenAI API Key</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={() => saveApiKey(apiKey)} disabled={!apiKey} className="w-full">
              Save API Key
            </Button>
            <p className="text-xs text-muted-foreground">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>
            </p>
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
                <CardTitle className="text-sm font-bold">FactorAI</CardTitle>
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
                onClick={() => setIsOpen(false)}
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
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
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