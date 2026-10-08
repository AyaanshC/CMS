"use client";

import { useState, useRef } from "react";
import { Message } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime, getInitials, cn } from "@/lib/utils";
import { Paperclip, Send, Check, CheckCheck, MessageSquare, Image as ImageIcon } from "lucide-react";

import { useAppStore } from "@/lib/store";

export default function MessagesTab({ projectId, messages }: { projectId: string; messages: Message[] }) {
  const [newMessage, setNewMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addMessage } = useAppStore();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: 'msg-' + Date.now(),
      project_id: projectId,
      sender_id: 'user-1', // Mock designer id
      sender_name: 'Priya Sharma', // Mock designer name
      sender_role: 'designer',
      content: newMessage.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    addMessage(msg);
    setNewMessage("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    
    const msg: Message = {
      id: 'msg-' + Date.now(),
      project_id: projectId,
      sender_id: 'user-1', // Mock designer id
      sender_name: 'Priya Sharma',
      sender_role: 'designer',
      content: "",
      file_url: fileUrl,
      file_name: file.name,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    addMessage(msg);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group messages by date would go here in a real app, for now just a list
  
  return (
    <Card className="flex flex-col h-[600px] border-border overflow-hidden">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isMe = msg.sender_role === "designer"; // Assuming we are logged in as designer
          return (
            <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
              <div className={cn("flex max-w-[75%] gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                
                <Avatar className="w-8 h-8 flex-shrink-0 mt-auto">
                  <AvatarFallback className={cn("text-[10px] font-bold", isMe ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-700")}>
                    {getInitials(msg.sender_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col gap-1">
                  <span className={cn("text-[10px] text-muted-foreground px-1", isMe ? "text-right" : "text-left")}>
                    {msg.sender_name}
                  </span>
                  
                  <div className={cn(
                    "px-4 py-2.5 shadow-sm text-sm",
                    isMe ? "message-bubble-right" : "message-bubble-left border border-border"
                  )}>
                    {msg.content && <p>{msg.content}</p>}
                    {msg.file_url && (
                      <div className="mt-2 mb-1 rounded-md overflow-hidden max-w-[200px] border border-black/10">
                        <img src={msg.file_url} alt="Attachment" className="w-full h-auto object-cover block" />
                      </div>
                    )}
                  </div>
                  
                  <div className={cn("flex items-center gap-1 text-[10px] text-muted-foreground px-1 mt-0.5", isMe ? "justify-end" : "justify-start")}>
                    {formatDateTime(msg.created_at)}
                    {isMe && (
                      msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3 opacity-60 mt-10">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs max-w-xs">Send a message to start the conversation with the client.</p>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex items-center gap-2">
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
            className="text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary focus-visible:bg-background transition-all"
          />
          <Button type="submit" disabled={!newMessage.trim()} className="gradient-primary border-0 rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
