import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShiftCard } from '../components/ShiftCard';
import { shifts, getStaffById } from '../data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { locations, skills, staff } from '../data/mockData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function Scheduler() {
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  
  // Get current week start
  const now = new Date();
  const getWeekStart = () => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [weekStart, setWeekStart] = useState(getWeekStart());

  const getDayDate = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };

  const getShiftsForDay = (dayIndex: number) => {
    const dayDate = getDayDate(dayIndex);
    return shifts.filter((shift) => {
      const shiftDate = shift.startTime;
      return (
        shiftDate.getDate() === dayDate.getDate() &&
        shiftDate.getMonth() === dayDate.getMonth() &&
        shiftDate.getFullYear() === dayDate.getFullYear()
      );
    });
  };

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const handleCellClick = (dayIndex: number, hour: number) => {
    setSelectedDay(dayIndex);
    setSelectedTime(hour);
    setShowShiftModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Scheduler</h1>
          <p className="text-sm text-muted-foreground">Drag and drop to assign shifts</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="text-sm">
              {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {getDayDate(6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
          <Button onClick={() => setShowShiftModal(true)}>
            <Plus className="size-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b border-border bg-muted/30">
              <div className="p-4 text-sm text-muted-foreground">Time</div>
              {DAYS.map((day, index) => {
                const date = getDayDate(index);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div key={day} className="p-4 text-center">
                    <p className={`text-sm ${isToday ? '' : 'text-muted-foreground'}`}>
                      {day}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {isToday && (
                      <Badge variant="default" className="mt-1 text-xs">Today</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time slots - showing key hours */}
            <div className="divide-y divide-border">
              {[6, 9, 12, 15, 18, 21].map((hour) => (
                <div key={hour} className="grid grid-cols-8">
                  <div className="p-4 bg-muted/20 text-sm text-muted-foreground">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const dayShifts = getShiftsForDay(dayIndex);
                    const shiftsInHour = dayShifts.filter((shift) => {
                      const startHour = shift.startTime.getHours();
                      return startHour === hour || (startHour < hour && shift.endTime.getHours() > hour);
                    });

                    return (
                      <div
                        key={dayIndex}
                        className="p-2 min-h-[120px] hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleCellClick(dayIndex, hour)}
                      >
                        <div className="space-y-2">
                          {shiftsInHour.map((shift) => (
                            <ShiftCard
                              key={shift.id}
                              shift={shift}
                              className="text-xs"
                              draggable
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center gap-6">
          <p className="text-sm text-muted-foreground">Legend:</p>
          <div className="flex items-center gap-2">
            <div className="size-4 bg-green-500 rounded" />
            <span className="text-sm">Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 bg-muted rounded" />
            <span className="text-sm">Unassigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 bg-destructive/20 border-2 border-destructive rounded" />
            <span className="text-sm">Conflict</span>
          </div>
        </div>
      </Card>

      {/* Shift Creation Modal */}
      <ShiftCreationModal
        open={showShiftModal}
        onOpenChange={setShowShiftModal}
        selectedDay={selectedDay !== null ? getDayDate(selectedDay) : undefined}
        selectedTime={selectedTime ?? undefined}
      />
    </div>
  );
}

type ShiftCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay?: Date;
  selectedTime?: number;
};

function ShiftCreationModal({ open, onOpenChange, selectedDay, selectedTime }: ShiftCreationModalProps) {
  const [formData, setFormData] = useState({
    location: '',
    skill: '',
    staff: '',
    date: selectedDay ? selectedDay.toISOString().split('T')[0] : '',
    startTime: selectedTime ? `${selectedTime.toString().padStart(2, '0')}:00` : '',
    endTime: '',
    headcount: '1',
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateShift = () => {
    const errors: string[] = [];
    
    if (!formData.location) errors.push('Location is required');
    if (!formData.skill) errors.push('Skill is required');
    if (!formData.startTime || !formData.endTime) errors.push('Time range is required');
    
    if (formData.startTime && formData.endTime) {
      const start = parseInt(formData.startTime.split(':')[0]);
      const end = parseInt(formData.endTime.split(':')[0]);
      if (end <= start) errors.push('End time must be after start time');
    }

    if (formData.staff) {
      const selectedStaff = staff.find((s) => s.id === formData.staff);
      if (selectedStaff && !selectedStaff.skills.includes(formData.skill)) {
        errors.push(`${selectedStaff.name} does not have the required skill`);
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = () => {
    if (validateShift()) {
      // In a real app, this would create the shift
      console.log('Creating shift:', formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>
            Set up a new shift with location, time, and skill requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData({ ...formData, location: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.timezone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Skill Required</Label>
              <Select
                value={formData.skill}
                onValueChange={(value) => {
                  setFormData({ ...formData, skill: value });
                  validateShift();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign to Staff (Optional)</Label>
            <Select
              value={formData.staff}
              onValueChange={(value) => {
                setFormData({ ...formData, staff: value });
                validateShift();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value });
                  validateShift();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => {
                  setFormData({ ...formData, endTime: e.target.value });
                  validateShift();
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Headcount</Label>
            <Input
              type="number"
              min="1"
              value={formData.headcount}
              onChange={(e) => setFormData({ ...formData, headcount: e.target.value })}
            />
          </div>

          {/* Live Validation Feedback */}
          {validationErrors.length > 0 && (
            <Card className="p-4 bg-destructive/10 border-destructive">
              <p className="text-sm text-destructive mb-2">Please fix the following:</p>
              <ul className="space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i} className="text-sm text-destructive">• {error}</li>
                ))}
              </ul>
            </Card>
          )}

          {formData.staff && formData.skill && !validationErrors.some((e) => e.includes('does not have')) && (
            <Card className="p-4 bg-green-50 border-green-200">
              <p className="text-sm text-green-700">✓ Staff member qualified for this shift</p>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Shift</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
