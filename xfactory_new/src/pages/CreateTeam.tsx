import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface TeamStatusResponse {
  current_team?: { id: number; name: string };
}

export const CreateTeam = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teamName, setTeamName] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [existingTeam, setExistingTeam] = useState<TeamStatusResponse["current_team"] | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/auth/login");
      return;
    }

    let isMounted = true;
    apiClient.request<TeamStatusResponse>('/team-formation/status/').then((response) => {
      if (!isMounted) return;
      if (response.data?.current_team) {
        setExistingTeam(response.data.current_team);
      }
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [navigate, token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamName.trim()) {
      toast({ title: "Team name required", description: "Please provide a name for your startup team.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const response = await apiClient.createOwnerTeam({
        name: teamName.trim(),
        tagline: tagline.trim() || undefined,
      });
      if (response.data) {
        toast({ title: "Team created", description: "Invite teammates from your dashboard when ready." });
        navigate("/", { replace: true });
      } else {
        toast({ title: "Unable to create team", description: response.error || "Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Unable to create team", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader>
          <CardTitle>Create your startup team</CardTitle>
          <CardDescription>You&apos;ll invite teammates on the next step.</CardDescription>
        </CardHeader>

        {loading ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">Loading your onboarding state…</p>
          </CardContent>
        ) : existingTeam ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You&apos;re already part of <strong>{existingTeam.name}</strong>. Head over to your dashboard to continue onboarding.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g., Panther Labs"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Short tagline (optional)</Label>
                <Textarea
                  id="tagline"
                  placeholder="A one-liner to describe your startup vision."
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {user?.program ? `Program: ${user.program}` : "Program context will be attached automatically."}
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create Team & Continue"}
              </Button>
            </CardFooter>
          </form>
        )}

        {!loading && existingTeam && (
          <CardFooter>
            <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
              Go to dashboard
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default CreateTeam;
