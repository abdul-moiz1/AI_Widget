import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WidgetVoiceSelector, type WidgetVoiceSettings } from "@/components/widget-voice-selector";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/dashboard";
import Conversations from "@/pages/admin/conversations";
import AdminSettings from "@/pages/admin/settings";
import { AppSidebar } from "@/components/app-sidebar";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        {() => (
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/conversations">
        {() => (
          <AdminLayout>
            <Conversations />
          </AdminLayout>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <AdminLayout>
            <AdminSettings />
          </AdminLayout>
        )}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<WidgetVoiceSettings>({
    language: "en",
    gender: "female",
    style: "calm"
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        {/* Voice Selector Widget */}
        <div className="fixed bottom-24 right-4 z-40">
          <WidgetVoiceSelector 
            value={voiceSettings}
            onChange={setVoiceSettings}
            isOpen={voiceOpen}
            onToggle={() => setVoiceOpen(!voiceOpen)}
          />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
