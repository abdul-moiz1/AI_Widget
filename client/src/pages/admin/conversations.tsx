import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Conversations() {
  const conversations = [
    { id: 1, user: "John Doe", business: "Tech Corp", messages: 8, duration: "5m 24s", status: "Completed" },
    { id: 2, user: "Jane Smith", business: "E-Shop Pro", messages: 12, duration: "8m 15s", status: "Completed" },
    { id: 3, user: "Mike Johnson", business: "Support Hub", messages: 15, duration: "12m 30s", status: "Completed" },
    { id: 4, user: "Sarah Wilson", business: "Tech Corp", messages: 3, duration: "2m 10s", status: "In Progress" },
    { id: 5, user: "David Brown", business: "E-Shop Pro", messages: 20, duration: "18m 45s", status: "Completed" },
  ];

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-2">Manage and monitor all conversations across your businesses.</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-10"
          />
        </div>
        <Button>Export</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Business</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Messages</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Duration</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-right py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr key={conv.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">{conv.user}</td>
                    <td className="py-3 px-4 text-muted-foreground">{conv.business}</td>
                    <td className="py-3 px-4 text-muted-foreground">{conv.messages}</td>
                    <td className="py-3 px-4 text-muted-foreground">{conv.duration}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        conv.status === "Completed" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {conv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
