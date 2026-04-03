import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { swapRequests, getStaffById, shifts } from '../data/mockData';
import { Clock, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function SwapsAndCoverage() {
  const pendingSwaps = swapRequests.filter((r) => r.status === 'pending');
  const approvedSwaps = swapRequests.filter((r) => r.status === 'approved');
  const expiredSwaps = swapRequests.filter((r) => r.status === 'expired' || r.status === 'rejected');

  const getShiftDetails = (shiftId: string) => {
    return shifts.find((s) => s.id === shiftId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500 text-white">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      default:
        return null;
    }
  };

  const renderSwapRequest = (request: typeof swapRequests[0]) => {
    const fromStaff = getStaffById(request.fromStaffId);
    const toStaff = request.toStaffId ? getStaffById(request.toStaffId) : null;
    const shift = getShiftDetails(request.shiftId);

    if (!fromStaff || !shift) return null;

    return (
      <Card key={request.id} className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3>{request.type === 'swap' ? 'Shift Swap Request' : 'Drop Request'}</h3>
                {getStatusBadge(request.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Requested {formatDistanceToNow(request.requestedAt, { addSuffix: true })}
              </p>
            </div>
            
            {request.status === 'pending' && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <XCircle className="size-4 mr-2" />
                  Reject
                </Button>
                <Button size="sm">
                  <CheckCircle className="size-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-4">
            {/* From */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">From</p>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <div className="size-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-white">
                    {fromStaff.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm truncate">{fromStaff.name}</p>
                  <p className="text-xs text-muted-foreground">Requesting {request.type}</p>
                </div>
              </div>
            </div>

            {/* Shift */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Shift</p>
              <div className="p-3 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-sm">
                    {shift.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm">
                    {shift.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -{' '}
                    {shift.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* To */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">To</p>
              {toStaff ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-white">
                      {toStaff.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{toStaff.name}</p>
                    <p className="text-xs text-muted-foreground">Covering shift</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/30 border-2 border-dashed border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="size-4" />
                    <span className="text-sm">No replacement</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="text-sm">{request.reason}</p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl">Swaps & Coverage</h1>
        <p className="text-sm text-muted-foreground">
          Manage shift swap requests and coverage needs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl mt-1">{pendingSwaps.length}</p>
            </div>
            <Clock className="size-8 text-amber-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-3xl mt-1">{approvedSwaps.length}</p>
            </div>
            <CheckCircle className="size-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expired/Rejected</p>
              <p className="text-3xl mt-1">{expiredSwaps.length}</p>
            </div>
            <XCircle className="size-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingSwaps.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{pendingSwaps.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingSwaps.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
            </Card>
          ) : (
            pendingSwaps.map(renderSwapRequest)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedSwaps.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No approved requests</p>
            </Card>
          ) : (
            approvedSwaps.map(renderSwapRequest)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {expiredSwaps.length === 0 ? (
            <Card className="p-12 text-center">
              <XCircle className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No historical requests</p>
            </Card>
          ) : (
            expiredSwaps.map(renderSwapRequest)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
