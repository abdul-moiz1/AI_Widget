import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, LogOut, Mic } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import WidgetEditor from "@/components/widget-editor";
import LiveWidgetPreview from "@/components/live-widget-preview";

interface WidgetConfig {
  assistantName: string;
  systemPrompt: string;
  welcomeMessage: string;
  voice: {
    language: string;
    gender: "female" | "male";
    style: "calm" | "friendly" | "professional";
  };
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  autoStart: boolean;
}

interface BusinessData {
  id: string;
  status: string;
  widgetConfig: WidgetConfig;
}

export default function ClientPage() {
  const [, setLocation] = useLocation();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");

  // Get current user's business ID from auth token
  useEffect(() => {
    const getBusinessId = async () => {
      try {
        const response = await fetch("/api/auth/business", {
          credentials: "include",
        });
        
        if (response.status === 401) {
          setAuthError("Not authenticated. Please log in.");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch business ID");
        }

        const data = await response.json();
        setBusinessId(data.businessId);
        setBusinessName(data.businessName || "Your Business");
      } catch (error) {
        setAuthError("Failed to load your business information.");
        console.error(error);
      }
    };

    getBusinessId();
  }, []);

  // Fetch widget configuration
  const { data: business, isLoading, error: fetchError } = useQuery<BusinessData | null>({
    queryKey: ["/api/widget-config", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const response = await fetch(`/api/widget-config/${businessId}`, {
        credentials: "include",
      });
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!response.ok) {
        throw new Error("Failed to fetch widget config");
      }
      return response.json();
    },
    enabled: !!businessId,
  });

  // Save widget configuration
  const saveMutation = useMutation({
    mutationFn: async (configData: WidgetConfig) => {
      if (!businessId) throw new Error("No business ID");
      const response = await apiRequest(
        "PATCH",
        `/api/widget-config/${businessId}`,
        configData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/widget-config", businessId] });
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setLocation("/client-login");
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{authError}</p>
            <Button className="mt-4 w-full" onClick={() => setLocation("/client-login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (business?.status !== "active") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Account Disabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your business account is currently disabled. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logout */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-background">
              <Mic className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg">VocalAI</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-client-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Widget Manager</h1>
          <p className="text-muted-foreground mt-2">
            Customize and manage your AI voice widget for {businessName}
          </p>
        </div>

        {/* Success Message */}
        {saveMutation.isSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Widget configuration updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {fetchError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load widget configuration. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : business?.widgetConfig ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div>
              <WidgetEditor
                config={business.widgetConfig}
                onSave={(config) => saveMutation.mutate(config)}
                isSaving={saveMutation.isPending}
              />
            </div>

            {/* Preview */}
            <div>
              <LiveWidgetPreview config={business.widgetConfig} />
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Configuration Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your widget configuration could not be loaded. Please contact support.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
