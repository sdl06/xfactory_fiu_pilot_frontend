import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Factory, LogIn, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

interface UserLoginFlowProps {
  onLogin: (userData: any) => void | Promise<void>;
  onBack: () => void;
}

export const UserLoginFlow = ({ onLogin, onBack }: UserLoginFlowProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    console.log('UserLoginFlow - Starting login for:', email);
    setIsLoading(true);

    try {
      const success = await login(email, password);
      console.log('UserLoginFlow - Login result:', success);
      
      if (success) {
        console.log('UserLoginFlow - Getting user profile...');
        // Get complete user data including progress from profile endpoint
        const profileResponse = await apiClient.getProfile();
        console.log('UserLoginFlow - Profile response:', profileResponse.status);
        
        if (profileResponse.data) {
          console.log('UserLoginFlow - Calling onLogin with profile data');
          await onLogin(profileResponse.data);
        } else {
          console.error('UserLoginFlow - Failed to get user profile after login');
        }
      }
    } catch (error) {
      console.error('UserLoginFlow - Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Factory Station Header */}
      <header className="border-b border-border bg-gradient-conveyor backdrop-blur-sm sticky top-0 z-50 w-full">
        <div className="w-full px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left: Section logo and name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
                <Factory className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Ivy Factory</h1>
                <p className="text-sm text-white/80">User Portal</p>
              </div>
            </div>
            
            {/* Middle: Section/step name */}
            <div className="flex-1 text-center">
              <Badge variant="warning">Login</Badge>
            </div>
            
            {/* Right: Ivy factory logo */}
            <div className="flex items-center">
              <img 
                src="/logos/prov_logo_white.png" 
                alt="Ivy Factory Logo" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  // Fallback to SVG icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Factory className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 py-12">
        <Card className="shadow-industrial">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-machinery rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">User Login</CardTitle>
            <CardDescription>
              Access your Ivy Factory dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                variant="machinery"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Logging in...
                  </div>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Landing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 