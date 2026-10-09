"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, CheckCheck, IndianRupee, AlertCircle, FileText, CheckSquare,
  MessageSquare, Sparkles, ExternalLink, Clock
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !n.is_read;
    if (activeFilter === "payment") return n.type === "payment" || n.title.toLowerCase().includes("payment");
    if (activeFilter === "snag") return n.type === "snag" || n.title.toLowerCase().includes("snag");
    if (activeFilter === "boq") return n.type === "boq" || n.title.toLowerCase().includes("boq");
    if (activeFilter === "task") return n.type === "task" || n.title.toLowerCase().includes("task");
    return true;
  });

  const getNotifIcon = (type: string, title: string) => {
    const t = (type + " " + title).toLowerCase();
    if (t.includes("payment") || t.includes("invoice")) {
      return <IndianRupee className="w-4 h-4 text-emerald-600" />;
    }
    if (t.includes("snag") || t.includes("defect")) {
      return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
    if (t.includes("boq") || t.includes("approved")) {
      return <FileText className="w-4 h-4 text-indigo-600" />;
    }
    if (t.includes("task")) {
      return <CheckSquare className="w-4 h-4 text-blue-600" />;
    }
    if (t.includes("message")) {
      return <MessageSquare className="w-4 h-4 text-violet-600" />;
    }
    return <Bell className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div>
      <TopBar title="Notifications" subtitle={`${unreadCount} unread alerts requiring attention`} />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 bg-card border border-border p-1 rounded-lg">
            {(
              [
                { key: "all", label: `All (${notifications.length})` },
                { key: "unread", label: `Unread (${unreadCount})` },
                { key: "payment", label: "Payments" },
                { key: "snag", label: "Snags" },
                { key: "boq", label: "BOQ" },
                { key: "task", label: "Tasks" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeFilter === tab.key
                    ? "bg-slate-900 text-white"
                    : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllNotificationsRead}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification Feed */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0 divide-y divide-border">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={cn(
                  "p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50/80",
                  notif.is_read ? "bg-white" : "bg-indigo-50/25"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                    notif.is_read ? "bg-slate-100" : "bg-indigo-100"
                  )}
                >
                  {getNotifIcon(notif.type, notif.title)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={cn(
                        "text-sm",
                        notif.is_read
                          ? "text-slate-800 font-medium"
                          : "text-foreground font-bold"
                      )}
                    >
                      {notif.title}
                    </h4>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                </div>

                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 self-center flex-shrink-0" />
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <Bell className="w-10 h-10 opacity-30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No notifications in this filter</p>
                <p className="text-xs mt-0.5">You&apos;re all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
