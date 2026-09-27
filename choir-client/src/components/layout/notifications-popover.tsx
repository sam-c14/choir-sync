import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationsPopover() {
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full" />
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center text-[10px] rounded-full"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-primary hover:text-primary hover:bg-transparent"
              onClick={() => markAllAsRead.mutate()}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: any) => (
                <div 
                  key={notification.id}
                  className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                    !notification.isRead ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h5 className={`text-sm ${!notification.isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {notification.title}
                    </h5>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 mt-0.5">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {notification.message}
                  </p>
                  {notification.linkUrl && (
                    <div className="flex items-center text-xs text-primary mt-2 font-medium">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Details
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
