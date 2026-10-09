"use client";

import { useState, useRef } from "react";
import { use, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Phone, MessageSquare, Sparkles, Building2, User, Paperclip } from "lucide-react";
import { Message } from "@/types";

export default function PortalMessagesPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading messages...</div>}>
      <PortalMessagesContent params={params} />
    </Suspense>
  );
}

function PortalMessagesContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, messages, clients, studioSettings, addMessage, me } = useAppStore();

  const project = projects.find((p) => p.portal_slug === slug);
  const client = clients.find((c) => c.id === project?.client_id);
  const projectMessages = messages.filter((m) => m.project_id === project?.id);

  const [inputContent, setInputContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    addMessage({
      project_id: project.id,
      content: inputContent.trim(),
    });
    setInputContent("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    
    addMessage({
      project_id: project.id,
      content: "",
      file_url: fileUrl,
      file_name: file.name,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const QUICK_QUESTIONS = [
    "When is the next site visit scheduled?",
    "Could you share the laminate catalog link?",
    "Please check the electrical points in master bedroom.",
    "Approved the paint shade swatch!",
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Chat</h1>
          <p className="text-sm text-muted-foreground">
            Direct communication with your lead designer and site supervisor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/${studioSettings.phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Studio
          </a>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="shadow-sm border border-border flex flex-col h-[600px] overflow-hidden bg-white">
        {/* Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          <div className="text-center my-2">
            <span className="text-[11px] bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full font-medium">
              Project Communication Channel
            </span>
          </div>

          {projectMessages.map((msg) => {
            const isClient = msg.sender_id === me.id;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%] md:max-w-[70%]",
                  isClient ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-bold",
                      isClient
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {isClient ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div
                    className={cn(
                      "flex items-center gap-2 mb-1 text-xs",
                      isClient ? "justify-end" : "justify-start"
                    )}
                  >
                    <span className="font-semibold text-foreground">{msg.sender_name}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "p-3 rounded-2xl text-sm leading-relaxed shadow-xs",
                      isClient
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-border rounded-tl-xs"
                    )}
                  >
                    {msg.content && <p>{msg.content}</p>}
                    {msg.file_url && (
                      <div className="mt-2 mb-1 rounded-md overflow-hidden max-w-[200px] border border-black/10">
                        <img src={msg.file_url} alt="Attachment" className="w-full h-auto object-cover block" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {projectMessages.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-10 h-10 opacity-30 mx-auto mb-2" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-0.5">Start the conversation by sending a message below.</p>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-50 border-t border-border flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Suggestions:
          </span>
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputContent(q)}
              className="text-xs px-2.5 py-1 rounded-full bg-white border border-border hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer text-slate-700"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-border flex gap-2 items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileUpload} 
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Type a message or question for your designer..."
            className="flex-1 text-sm bg-slate-50 border-slate-200 focus-visible:bg-white"
          />
          <Button
            type="submit"
            disabled={!inputContent.trim()}
            className="gradient-primary border-0 text-white gap-1.5 px-4"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
