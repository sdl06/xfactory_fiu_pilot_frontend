import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  BarChart3, 
  Users, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { FactorAI } from "../FactorAI";

interface MonitoringStationProps {
  launchData: any;
  onComplete: (monitoringData: any) => void;
  onBack: () => void;
}

export const MonitoringStation = ({ launchData, onComplete, onBack }: MonitoringStationProps) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  const startMonitoring = async () => {
    setIsMonitoring(true);
    
    // Simulate real-time metrics
    const interval = setInterval(() => {
      setMetrics({
        activeUsers: Math.floor(Math.random() * 100) + 50,
        revenue: Math.floor(Math.random() * 5000) + 2000,
        conversionRate: Math.floor(Math.random() * 10) + 15,
        serverLoad: Math.floor(Math.random() * 30) + 20,
        uptime: 99.9,
        satisfaction: Math.floor(Math.random() * 10) + 85
      });
    }, 2000);

    // Generate some alerts
    setTimeout(() => {
      setAlerts([
        { type: "warning", message: "Server load increasing", time: "2 min ago" },
        { type: "success", message: "Conversion rate improved", time: "5 min ago" },
        { type: "info", message: "New user milestone reached", time: "10 min ago" }
      ]);
    }, 3000);

    // Complete after monitoring period
    setTimeout(() => {
      clearInterval(interval);
      setIsMonitoring(false);
      
      const monitoringData = {
        period: "24 hours",
        totalUsers: Math.floor(Math.random() * 2000) + 1000,
        revenue: Math.floor(Math.random() * 10000) + 5000,
        issues: Math.floor(Math.random() * 5),
        uptime: 99.9,
        recommendations: [
          "Scale server capacity",
          "Optimize database queries",
          "Implement caching",
          "Add monitoring alerts"
        ]
      };
      
      onComplete(monitoringData);
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Station Header */}
      <div className="border-b border-border bg-gradient-success">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="h-8 w-8 text-success-foreground" />
              <div>
                <h1 className="text-xl font-bold text-success-foreground">Monitoring Station</h1>
                <p className="text-sm text-success-foreground/80">Track Performance & Analytics</p>
              </div>
            </div>
            <Badge variant="success">Station 9</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {!isMonitoring && !metrics ? (
            <Card>
              <CardHeader>
                <CardTitle>Start Monitoring</CardTitle>
                <CardDescription>
                  Monitor your product's performance, user engagement, and system health in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Monitor</h3>
                  <p className="text-muted-foreground mb-6">
                    We'll track key metrics and provide insights on your product's performance.
                  </p>
                  <Button onClick={startMonitoring} size="lg">
                    Start Real-time Monitoring
                    <Activity className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Status Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">Live Monitoring Active</span>
                    </div>
                    <Badge variant="success">All Systems Operational</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Grid */}
              {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Active Users</p>
                          <p className="text-2xl font-bold">{metrics.activeUsers}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Revenue (24h)</p>
                          <p className="text-2xl font-bold">${metrics.revenue}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Conversion Rate</p>
                          <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Server Load</p>
                        <Progress value={metrics.serverLoad} className="mb-2" />
                        <p className="text-sm">{metrics.serverLoad}% of capacity</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Uptime</p>
                          <p className="text-2xl font-bold">{metrics.uptime}%</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">User Satisfaction</p>
                          <p className="text-2xl font-bold">{metrics.satisfaction}%</p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Alerts */}
              {alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.map((alert, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          {alert.type === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                          {alert.type === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {alert.type === "info" && <Activity className="h-5 w-5 text-blue-500" />}
                          <div className="flex-1">
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-muted-foreground">{alert.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {isMonitoring && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="animate-pulse mb-4">
                      <Activity className="h-12 w-12 text-primary mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Collecting Data...</h3>
                    <p className="text-muted-foreground">
                      Monitoring system performance and user behavior patterns
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FactorAI Assistant */}
      <FactorAI 
        currentStation={9}
        userData={{ launchData }}
        context="monitoring-analytics"
      />
    </div>
  );
};