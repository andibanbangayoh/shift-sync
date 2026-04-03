import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Search, Mail, Clock } from 'lucide-react';
import { staff, getSkillById } from '../data/mockData';
import { SkillBadge } from '../components/SkillBadge';
import { Progress } from '../components/ui/progress';
import { useState } from 'react';

export default function StaffManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaff = staff.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUtilization = (assigned: number, desired: number) => {
    return (assigned / desired) * 100;
  };

  const getUtilizationColor = (assigned: number, desired: number) => {
    const utilization = getUtilization(assigned, desired);
    if (utilization > 100) return 'text-amber-600';
    if (utilization < 70) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Staff Management</h1>
          <p className="text-sm text-muted-foreground">{staff.length} team members</p>
        </div>
        
        <Button>Add Staff Member</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Staff List */}
      <div className="grid gap-4">
        {filteredStaff.map((staffMember) => {
          const utilization = getUtilization(staffMember.hoursAssigned, staffMember.hoursDesired);
          
          return (
            <Card key={staffMember.id} className="p-6">
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="size-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl text-white">
                    {staffMember.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3>{staffMember.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="size-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{staffMember.email}</span>
                        </div>
                      </div>
                      
                      {staffMember.hoursAssigned > staffMember.hoursDesired && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                          Overtime
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {staffMember.skills.map((skillId) => (
                        <SkillBadge key={skillId} skillId={skillId} />
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Available Days</p>
                    <div className="flex gap-2">
                      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                        <Badge
                          key={day}
                          variant={staffMember.availability.includes(day) ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {day.toUpperCase().slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Hours This Week</p>
                        <span className={`text-sm ${getUtilizationColor(staffMember.hoursAssigned, staffMember.hoursDesired)}`}>
                          {staffMember.hoursAssigned}h / {staffMember.hoursDesired}h
                        </span>
                      </div>
                      <Progress value={utilization} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {utilization.toFixed(0)}% utilization
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining capacity</p>
                        <p className="text-sm">
                          {Math.max(0, staffMember.hoursDesired - staffMember.hoursAssigned)}h available
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
