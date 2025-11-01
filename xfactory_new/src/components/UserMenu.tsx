import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, LogOut, Settings, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserMenuProps {
  className?: string;
}

export const UserMenu = ({ className = "" }: UserMenuProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [userFormData, setUserFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const { user, logout } = useAuth();
  const { toast } = useToast();

  // Load user info when settings dialog opens
  useEffect(() => {
    if (showSettings) {
      loadUserInfo();
    }
  }, [showSettings]);

  const loadUserInfo = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getProfile();
      if (response.status >= 200 && response.status < 300 && response.data) {
        const userData = response.data.user || response.data;
        setUserInfo(userData);
        setUserFormData({
          firstName: userData.first_name || "",
          lastName: userData.last_name || "",
          email: userData.email || "",
        });
      }
    } catch (error) {
      console.error("Failed to load user info:", error);
      toast({
        title: "Error",
        description: "Failed to load user information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      const response = await apiClient.updateUserProfile({
        first_name: userFormData.firstName,
        last_name: userFormData.lastName,
      });

      if (response.status >= 200 && response.status < 300) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        // Reload user info
        await loadUserInfo();
      } else {
        throw new Error(response.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiClient.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      if (response.status >= 200 && response.status < 300) {
        toast({
          title: "Success",
          description: "Password changed successfully",
        });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error(response.error || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Still logout locally even if API call fails
      logout();
    }
  };

  const userEmail = user?.email || userInfo?.email || "";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 text-white hover:bg-white/10 rounded-full ${className}`}
          >
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Account</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription>
              Manage your account information and preferences
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Profile Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={userFormData.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={userFormData.firstName}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, firstName: e.target.value })
                      }
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={userFormData.lastName}
                      onChange={(e) =>
                        setUserFormData({ ...userFormData, lastName: e.target.value })
                      }
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? "Saving..." : "Update Profile"}
                </Button>
              </div>

              <div className="border-t pt-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Change Password</h3>

                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Enter new password (min 8 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isSaving}
                    variant="outline"
                    className="w-full"
                  >
                    {isSaving ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

