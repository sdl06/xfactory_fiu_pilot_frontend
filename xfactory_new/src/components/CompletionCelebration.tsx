import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Star, ArrowRight, MessageSquare, Sparkles, Rocket, Heart } from "lucide-react";

interface CompletionCelebrationProps {
  onClose: () => void;
}

export const CompletionCelebration = ({ onClose }: CompletionCelebrationProps) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // Create confetti effect
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

    const createConfetti = () => {
      const confetti = document.createElement('div');
      confetti.style.position = 'absolute';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
      confetti.style.animationName = 'confetti-fall';
      confetti.style.animationIterationCount = '1';
      confetti.style.animationTimingFunction = 'linear';
      confettiContainer.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
      }, 5000);
    };

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(-100vh) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Create confetti
    const interval = setInterval(createConfetti, 100);

    // Clean up after 5 seconds
    const cleanup = setTimeout(() => {
      clearInterval(interval);
      setShowConfetti(false);
      confettiContainer.remove();
      style.remove();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(cleanup);
      confettiContainer.remove();
      style.remove();
    };
  }, []);

  const handleSubmitFeedback = () => {
    // Here you would submit feedback to your backend
    console.log("User feedback:", feedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Trophy className="h-16 w-16 text-yellow-500" />
              <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎉 Congratulations! 🎉
          </CardTitle>
          <p className="text-xl text-muted-foreground mt-2">
            You've completed your entire startup journey!
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-lg">
              <Rocket className="h-5 w-5 text-primary" />
              <span className="font-semibold">All 15 stations completed!</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Star className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-sm font-medium">Idea to MVP</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Rocket className="h-6 w-6 text-accent mx-auto mb-1" />
                <p className="text-sm font-medium">Launch Ready</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <Trophy className="h-6 w-6 text-success mx-auto mb-1" />
                <p className="text-sm font-medium">Investor Ready</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Help us improve xFactory
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your feedback helps us make the platform better for future entrepreneurs. 
              What was your experience like?
            </p>
            
            <Textarea
              placeholder="Share your thoughts about the xFactory journey, what worked well, and what could be improved..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="mb-4"
            />

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose}>
                Skip Feedback
              </Button>
              <Button onClick={handleSubmitFeedback} disabled={!feedback.trim()}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Ready to take your startup to the next level? 
              <br />
              Connect with our community and explore advanced resources.
            </p>
            <Button className="mt-3" onClick={onClose}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Explore Community
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};