import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Download, 
  ArrowRight, 
  Lightbulb,
  Target,
  Users,
  Rocket,
  BarChart3,
  Shield,
  Cog,
  TrendingUp
} from "lucide-react";

interface OutputCardProps {
  type: "idea" | "mockup" | "prototype" | "validation" | "testing" | "iteration" | "launch" | "monitoring" | "scaling";
  data: any;
  onNext?: () => void;
  onDownload?: () => void;
  isVisible: boolean;
}

const cardConfigs = {
  idea: {
    title: "XFactor Idea Card",
    icon: Lightbulb,
    color: "bg-gradient-primary",
    description: "Your startup concept blueprint"
  },
  mockup: {
    title: "Design Blueprint Card", 
    icon: Target,
    color: "bg-gradient-accent",
    description: "Visual design foundation"
  },
  prototype: {
    title: "Build Architecture Card",
    icon: Cog,
    color: "bg-gradient-info", 
    description: "Technical implementation guide"
  },
  validation: {
    title: "Market Validation Card",
    icon: Users,
    color: "bg-gradient-success",
    description: "Customer validation insights"
  },
  testing: {
    title: "Quality Assurance Card",
    icon: Shield,
    color: "bg-gradient-warning",
    description: "Testing strategy & results"
  },
  iteration: {
    title: "Evolution Strategy Card",
    icon: TrendingUp,
    color: "bg-gradient-primary",
    description: "Improvement roadmap"
  },
  launch: {
    title: "Launch Execution Card",
    icon: Rocket,
    color: "bg-gradient-accent",
    description: "Go-to-market strategy"
  },
  monitoring: {
    title: "Performance Analytics Card",
    icon: BarChart3,
    color: "bg-gradient-info",
    description: "Key metrics & insights"
  },
  scaling: {
    title: "Growth Strategy Card",
    icon: TrendingUp,
    color: "bg-gradient-success",
    description: "Scaling blueprint"
  }
};

export function OutputCard({ type, data, onNext, onDownload, isVisible }: OutputCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = cardConfigs[type];
  const IconComponent = config.icon;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <Card className={`w-full max-w-2xl mx-4 shadow-lg border-2 ${config.color} text-white`}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-white/20 rounded-full">
              <IconComponent className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-300" />
            {config.title} Generated!
          </CardTitle>
          <CardDescription className="text-white/80 text-lg">
            {config.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Card Preview */}
          <div className="bg-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-white/20 text-white">
                Station Output
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20"
              >
                {isExpanded ? "Collapse" : "View Details"}
              </Button>
            </div>

            {/* Quick Preview */}
            <div className="space-y-2">
              {type === "idea" && (
                <>
                  <h4 className="font-semibold">{data.title || data.ideaName || "Your Business"}</h4>
                  <p className="text-sm text-white/80">{data.summary || "Your startup concept"}</p>
                  {data.problem && (
                    <div className="text-sm">
                      <span className="font-medium text-white/90">Problem: </span>
                      <span className="text-white/80">{data.problem}</span>
                    </div>
                  )}
                  {data.current_solutions && (
                    <div className="text-sm">
                      <span className="font-medium text-white/90">Current Solutions: </span>
                      <span className="text-white/80">{data.current_solutions}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Add other type previews as needed */}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 p-3 bg-white/10 rounded space-y-4 text-sm">
                {/* Problem Statement */}
                {data.problem && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-white">Problem Statement</h5>
                    <div className="bg-white/10 rounded p-2">
                      <p className="text-white/90">{data.problem}</p>
                    </div>
                  </div>
                )}

                {/* Current Solutions */}
                {data.current_solutions && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-white">Current Solutions</h5>
                    <div className="bg-white/10 rounded p-2">
                      <p className="text-white/90">{data.current_solutions}</p>
                    </div>
                  </div>
                )}

                {/* Primary Persona */}
                {data.primary_persona && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-white">Primary Persona</h5>
                    <div className="bg-white/10 rounded p-2 space-y-1">
                      {data.primary_persona.name && (
                        <p><span className="font-medium">Name:</span> {data.primary_persona.name}</p>
                      )}
                      {data.primary_persona.age && (
                        <p><span className="font-medium">Age:</span> {data.primary_persona.age}</p>
                      )}
                      {data.primary_persona.occupation && (
                        <p><span className="font-medium">Occupation:</span> {data.primary_persona.occupation}</p>
                      )}
                      {data.primary_persona.brief_description && (
                        <p><span className="font-medium">Description:</span> {data.primary_persona.brief_description}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Key Assumptions */}
                {(data.assumptions && Array.isArray(data.assumptions) && data.assumptions.length > 0) || (data.assumption_1 || data.assumption_2 || data.assumption_3) ? (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-white">Key Assumptions</h5>
                    <div className="space-y-2">
                      {/* Handle assumptions array from backend */}
                      {data.assumptions && Array.isArray(data.assumptions) && data.assumptions.length > 0 ? (
                        data.assumptions.slice(0, 3).map((assumption: any, index: number) => (
                          <div key={index} className="bg-white/10 rounded p-2">
                            <p className="font-medium">{index + 1}. {assumption.text || assumption}</p>
                            {assumption.confidence && (
                              <p className="text-xs text-white/70">Confidence: {assumption.confidence}%</p>
                            )}
                            {assumption.testing_plan && (
                              <p className="text-xs text-white/70">Test: {assumption.testing_plan}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        /* Fallback to individual assumption fields */
                        <>
                          {data.assumption_1 && (
                            <div className="bg-white/10 rounded p-2">
                              <p className="font-medium">1. {data.assumption_1}</p>
                              {data.assumption_1_confidence && (
                                <p className="text-xs text-white/70">Confidence: {data.assumption_1_confidence}%</p>
                              )}
                              {data.assumption_1_testing_plan && (
                                <p className="text-xs text-white/70">Test: {data.assumption_1_testing_plan}</p>
                              )}
                            </div>
                          )}
                          {data.assumption_2 && (
                            <div className="bg-white/10 rounded p-2">
                              <p className="font-medium">2. {data.assumption_2}</p>
                              {data.assumption_2_confidence && (
                                <p className="text-xs text-white/70">Confidence: {data.assumption_2_confidence}%</p>
                              )}
                              {data.assumption_2_testing_plan && (
                                <p className="text-xs text-white/70">Test: {data.assumption_2_testing_plan}</p>
                              )}
                            </div>
                          )}
                          {data.assumption_3 && (
                            <div className="bg-white/10 rounded p-2">
                              <p className="font-medium">3. {data.assumption_3}</p>
                              {data.assumption_3_confidence && (
                                <p className="text-xs text-white/70">Confidence: {data.assumption_3_confidence}%</p>
                              )}
                              {data.assumption_3_testing_plan && (
                                <p className="text-xs text-white/70">Test: {data.assumption_3_testing_plan}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Tagline */}
                {data.tagline && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-white">Tagline</h5>
                    <p className="italic text-white/90">"{data.tagline}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {onDownload && (
              <Button
                variant="outline"
                onClick={onDownload}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Download className="h-4 w-4 mr-2" />
                Save Card
              </Button>
            )}
            
            {onNext && (
              <Button
                onClick={onNext}
                className="bg-white text-gray-900 hover:bg-white/90"
              >
                Next Station
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-white/70">
            This card will be available as input for the next station
          </p>
        </CardContent>
      </Card>
    </div>
  );
}