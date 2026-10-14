"use client";
import { ProjectChat } from "./ProjectChat";
import type { Message } from "@/types";
export default function MessagesTab({ projectId, messages }: { projectId: string; messages: Message[] }) {
  return <ProjectChat projectId={projectId} messages={messages} />;
}
