import { BarChart3, MessageSquare, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const stats = [
    {
      title: "Total Conversations",
      value: "1,284",
      icon: MessageSquare,
      trend: "+12.5%",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Active Users",
      value: "342",
      icon: Users,
      trend: "+8.2%",
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Avg Response Time",
      value: "1.2s",
      icon: TrendingUp,
      trend: "-2.1%",
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Success Rate",
      value: "98.7%",
      icon: BarChart3,
      trend: "+0.5%",
      color: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your performance overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-green-600 mt-1">{stat.trend} from last month</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b last:pb-0 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">User {i + 1}</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b last:pb-0 last:border-0">
                  <div>
                    <p className="text-sm font-medium">Business {i + 1}</p>
                    <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 500) + 100} conversations</p>
                  </div>
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.random() * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
