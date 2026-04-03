import { Card } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { staff } from '../data/mockData';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export default function Analytics() {
  // Prepare data for hours distribution chart
  const hoursData = staff.map((s) => ({
    name: s.name.split(' ')[0],
    assigned: s.hoursAssigned,
    desired: s.hoursDesired,
    difference: s.hoursAssigned - s.hoursDesired,
  })).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  // Calculate stats
  const avgHours = staff.reduce((acc, s) => acc + s.hoursAssigned, 0) / staff.length;
  const overScheduled = staff.filter((s) => s.hoursAssigned > s.hoursDesired);
  const underScheduled = staff.filter((s) => s.hoursAssigned < s.hoursDesired);
  const balanced = staff.filter((s) => s.hoursAssigned === s.hoursDesired);

  // Premium shift distribution (mock data)
  const premiumData = [
    { name: 'Sarah', premiumShifts: 2, regularShifts: 4 },
    { name: 'Michael', premiumShifts: 3, regularShifts: 3 },
    { name: 'Emily', premiumShifts: 1, regularShifts: 4 },
    { name: 'David', premiumShifts: 2, regularShifts: 5 },
    { name: 'Lisa', premiumShifts: 1, regularShifts: 3 },
    { name: 'James', premiumShifts: 2, regularShifts: 4 },
  ];

  const getBarColor = (difference: number) => {
    if (difference > 0) return '#f59e0b'; // Over-scheduled
    if (difference < 0) return '#3b82f6'; // Under-scheduled
    return '#10b981'; // Balanced
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl">Fairness Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Monitor equitable distribution of hours and premium shifts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Average Hours</p>
            <p className="text-3xl">{avgHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Per person this week</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-amber-600" />
              <p className="text-sm text-muted-foreground">Over-Scheduled</p>
            </div>
            <p className="text-3xl">{overScheduled.length}</p>
            <p className="text-xs text-muted-foreground">Staff members</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Under-Scheduled</p>
            </div>
            <p className="text-3xl">{underScheduled.length}</p>
            <p className="text-xs text-muted-foreground">Staff members</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Balanced</p>
            </div>
            <p className="text-3xl">{balanced.length}</p>
            <p className="text-xs text-muted-foreground">Staff members</p>
          </div>
        </Card>
      </div>

      {/* Hours Distribution Chart */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3>Hours Distribution</h3>
            <p className="text-sm text-muted-foreground">
              Comparing assigned vs desired hours for each staff member
            </p>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                          <p className="text-sm mb-2">{data.name}</p>
                          <div className="space-y-1 text-xs">
                            <p>Assigned: {data.assigned}h</p>
                            <p>Desired: {data.desired}h</p>
                            <p className={data.difference > 0 ? 'text-amber-600' : data.difference < 0 ? 'text-blue-600' : 'text-green-600'}>
                              {data.difference > 0 ? '+' : ''}{data.difference}h
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="assigned" name="Assigned Hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="desired" name="Desired Hours" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="size-3 bg-amber-500 rounded" />
              <span className="text-sm text-muted-foreground">Over-scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-blue-500 rounded" />
              <span className="text-sm text-muted-foreground">Under-scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-green-500 rounded" />
              <span className="text-sm text-muted-foreground">Balanced</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Premium Shifts Distribution */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3>Premium Shift Distribution</h3>
            <p className="text-sm text-muted-foreground">
              Evening, weekend, and holiday shifts by staff member
            </p>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={premiumData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                          <p className="text-sm mb-2">{data.name}</p>
                          <div className="space-y-1 text-xs">
                            <p>Premium: {data.premiumShifts}</p>
                            <p>Regular: {data.regularShifts}</p>
                            <p>Total: {data.premiumShifts + data.regularShifts}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="premiumShifts" name="Premium Shifts" fill="#f59e0b" stackId="a" radius={[4, 4, 4, 4]} />
                <Bar dataKey="regularShifts" name="Regular Shifts" fill="#6366f1" stackId="a" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Detailed Staff List */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3>Staff Details</h3>
          
          <div className="space-y-3">
            {staff.map((s) => {
              const difference = s.hoursAssigned - s.hoursDesired;
              const status = difference > 0 ? 'over' : difference < 0 ? 'under' : 'balanced';
              
              return (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm text-white">
                        {s.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm">{s.hoursAssigned}h / {s.hoursDesired}h</p>
                      <p className="text-xs text-muted-foreground">
                        {((s.hoursAssigned / s.hoursDesired) * 100).toFixed(0)}% utilization
                      </p>
                    </div>

                    {status === 'over' && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        +{difference}h
                      </Badge>
                    )}
                    {status === 'under' && (
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {difference}h
                      </Badge>
                    )}
                    {status === 'balanced' && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Balanced
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
