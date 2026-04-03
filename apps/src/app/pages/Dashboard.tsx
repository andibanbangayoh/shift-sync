import { Card } from '../components/ui/card';
import { Users, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { ShiftCard } from '../components/ShiftCard';
import { shifts, staff, getStaffById, notifications, swapRequests } from '../data/mockData';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const now = new Date();
  
  // Calculate on-duty staff
  const onDutyShifts = shifts.filter((shift) => {
    if (!shift.staffId) return false;
    const shiftStart = shift.startTime.getTime();
    const shiftEnd = shift.endTime.getTime();
    const currentTime = now.getTime();
    return currentTime >= shiftStart && currentTime <= shiftEnd;
  });

  // Calculate overtime alerts
  const overtimeStaff = staff.filter((s) => s.hoursAssigned > s.hoursDesired);

  // Upcoming shifts (next 24 hours)
  const upcomingShifts = shifts
    .filter((s) => s.startTime.getTime() > now.getTime() && s.startTime.getTime() < now.getTime() + 24 * 60 * 60 * 1000)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 5);

  // Unread notifications
  const unreadNotifications = notifications.filter((n) => !n.read).slice(0, 5);

  // Pending swaps
  const pendingSwaps = swapRequests.filter((r) => r.status === 'pending');

  const stats = [
    {
      label: 'On Duty Now',
      value: onDutyShifts.length,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Overtime Alerts',
      value: overtimeStaff.length,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Pending Swaps',
      value: pendingSwaps.length,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Unassigned Shifts',
      value: shifts.filter((s) => !s.staffId).length,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`size-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* On Duty Now Widget */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>On Duty Now</h3>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Badge className="bg-green-500 text-white">
                <span className="relative flex size-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-white"></span>
                </span>
                Live
              </Badge>
            </motion.div>
          </div>
          
          <div className="space-y-3">
            {onDutyShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No staff on duty right now</p>
            ) : (
              onDutyShifts.map((shift) => {
                const staffMember = getStaffById(shift.staffId!);
                return (
                  <div key={shift.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-sm text-white">
                          {staffMember?.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm">{staffMember?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Until {shift.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Overtime Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Overtime Alerts</h3>
            {overtimeStaff.length > 0 && (
              <Badge variant="destructive">{overtimeStaff.length}</Badge>
            )}
          </div>
          
          <div className="space-y-3">
            {overtimeStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All staff within desired hours</p>
            ) : (
              overtimeStaff.map((staffMember) => (
                <div key={staffMember.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm">{staffMember.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {staffMember.hoursAssigned}h assigned / {staffMember.hoursDesired}h desired
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-700 border-amber-300">
                      +{staffMember.hoursAssigned - staffMember.hoursDesired}h
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <Card className="p-6">
          <h3 className="mb-4">Upcoming Shifts (Next 24h)</h3>
          <div className="space-y-3">
            {upcomingShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        </Card>

        {/* Recent Notifications */}
        <Card className="p-6">
          <h3 className="mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {unreadNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="size-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
