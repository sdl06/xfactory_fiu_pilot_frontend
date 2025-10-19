import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Factory, LogIn, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface AdminLoginFlowProps {
  onLogin: () => void;
  onBack: () => void;
}

export const AdminLoginFlow = ({ onLogin, onBack }: AdminLoginFlowProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.login(email, password);

      if (response.data && response.data.is_admin) {
        // Store admin token
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        localStorage.setItem('isAdmin', 'true');
        
        toast({
          title: "Success",
          description: "Admin login successful!",
        });
        
        onLogin();
      } else {
        toast({
          title: "Access Denied",
          description: "This account is not authorized for admin access.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: "Login Failed",
        description: "Invalid credentials or network error.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Factory Header */}
      <div className="border-b border-border bg-gradient-conveyor">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-machinery rounded-lg flex items-center justify-center animate-machinery-hum">
              <Factory className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Ivy Factory Admin</h1>
              <p className="text-sm text-muted-foreground">Administrator Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-12">
        <Card className="shadow-industrial">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-machinery rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Access the Ivy Factory administration panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login as Admin
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