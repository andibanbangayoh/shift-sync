import { Card } from '../components/ui/card';
import { notifications } from '../data/mockData';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Clock, AlertCircle, Calendar, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Link } from 'react-router';

export default function Notifications() {
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'shift_assigned':
        return <Calendar className="size-5 text-blue-600" />;
      case 'swap_request':
      case 'approval_needed':
        return <Users className="size-5 text-purple-600" />;
      case 'conflict':
        return <AlertCircle className="size-5 text-destructive" />;
      case 'overtime_alert':
        return <Clock className="size-5 text-amber-600" />;
      default:
        return <Bell className="size-5 text-muted-foreground" />;
    }
  };

  const renderNotification = (notification: typeof notifications[0]) => {
    return (
      <Card
        key={notification.id}
        className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
          !notification.read ? 'border-l-4 border-l-blue-500' : ''
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-accent flex-shrink-0">
            {getIcon(notification.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm">{notification.title}</p>
              {!notification.read && (
                <div className="size-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </p>
          </div>

          {notification.actionUrl && (
            <Link to={notification.actionUrl}>
              <Button size="sm" variant="outline">
                View
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Button variant="outline">
          <CheckCheck className="size-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="unread" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unread">
            Unread
            {unreadNotifications.length > 0 && (
              <Badge className="ml-2 bg-blue-500 text-white">{unreadNotifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-3">
          {unreadNotifications.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCheck className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No unread notifications</p>
            </Card>
          ) : (
            unreadNotifications.map(renderNotification)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {notifications.map(renderNotification)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
