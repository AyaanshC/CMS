"use client";

import { useState } from "react";
import { use, Suspense } from "react";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Folder, FileText, Image as ImageIcon, Download, Eye, ExternalLink,
  Layers, CheckCircle2
} from "lucide-react";
import { ProjectFile } from "@/types";

export default function PortalFilesPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading files...</div>}>
      <PortalFilesContent params={params} />
    </Suspense>
  );
}

function PortalFilesContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { projects, files } = useAppStore();

  const project = projects.find((p) => p.portal_slug === slug);
  const clientFiles = files.filter(
    (f) => f.project_id === project?.id && f.is_client_visible
  );

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found.</div>;
  }

  const filteredFiles = clientFiles.filter(
    (f) => activeCategory === "all" || f.category === activeCategory
  );

  const categories = [
    { key: "all", label: `All Files (${clientFiles.length})` },
    { key: "3d_render", label: "3D Renders" },
    { key: "2d_drawing", label: "2D Drawings" },
    { key: "specification", label: "Material Specs" },
    { key: "handover", label: "Handover Docs" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Project Files & Deliverables</h1>
        <p className="text-sm text-muted-foreground">
          Access high-resolution 3D renders, approved working drawings, and material selection sheets.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-slate-900 text-white"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid of Files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredFiles.map((file) => {
          const isImage = file.thumbnail_url || file.file_type.includes("image");
          return (
            <Card
              key={file.id}
              className="overflow-hidden shadow-sm hover:border-indigo-300 transition-all flex flex-col group cursor-pointer"
              onClick={() => setPreviewFile(file)}
            >
              <div className="relative aspect-video bg-slate-100 overflow-hidden flex items-center justify-center">
                {file.thumbnail_url ? (
                  <img
                    src={file.thumbnail_url}
                    alt={file.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileText className="w-10 h-10 opacity-40 mb-1" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">
                      {file.file_type.split("/")[1] || "DOCUMENT"}
                    </span>
                  </div>
                )}
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 text-[10px] bg-white/90 backdrop-blur-sm shadow-xs capitalize"
                >
                  {file.category.replace("_", " ")}
                </Badge>
              </div>

              <CardContent className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added {formatDate(file.uploaded_at)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {(file.file_size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center h-7 px-2 text-xs rounded-md hover:bg-slate-100 text-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-border">
          <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No files in this category</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Files shared by your design team will appear here automatically.
          </p>
        </div>
      )}

      {/* Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="capitalize">
                  {previewFile.category.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Uploaded on {formatDate(previewFile.uploaded_at)}
                </span>
              </div>
              <DialogTitle className="text-base truncate">{previewFile.name}</DialogTitle>
            </DialogHeader>

            <div className="py-2">
              {previewFile.thumbnail_url ? (
                <div className="rounded-lg overflow-hidden border border-border max-h-[500px] flex items-center justify-center bg-black/5">
                  <img
                    src={previewFile.thumbnail_url}
                    alt={previewFile.name}
                    className="max-h-[480px] w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-lg border border-border">
                  <FileText className="w-16 h-16 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium">{previewFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(previewFile.file_size / (1024 * 1024)).toFixed(1)} MB · Document Preview
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <span className="text-xs text-muted-foreground">
                Author: {previewFile.uploaded_by}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewFile(null)}>
                  Close
                </Button>
                <a
                  href={previewFile.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md gradient-primary text-white"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download File
                </a>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
