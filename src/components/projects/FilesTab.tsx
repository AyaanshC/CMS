"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileText, Trash2, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { formatDate, formatFileSize, cn } from "@/lib/utils";
import type { Project, ProjectFile } from "@/types";

export default function FilesTab({ project, files }: { project: Project; files: ProjectFile[] }) {
  const { addFile, toggleFileVisibility, deleteFile } = useAppStore();

  const [uploadFileModalOpen, setUploadFileModalOpen] = useState(false);
  const [fileForm, setFileForm] = useState({
    fileName: "",
    folder: "Drawings & Layouts",
    fileUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
    isClientVisible: true
  });
  const [selectedFolderFilter, setSelectedFolderFilter] = useState("all");

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    addFile({
      id: 'file-' + Date.now(),
      project_id: project.id,
      folder: fileForm.folder,
      file_name: fileForm.fileName,
      file_url: fileForm.fileUrl,
      file_type: fileForm.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      file_size_bytes: 2100000,
      file_size: 2100000,
      category: 'document',
      uploaded_by: 'user-1',
      uploaded_by_name: 'Priya Sharma',
      uploaded_at: new Date().toISOString(),
      is_client_visible: fileForm.isClientVisible,
      created_at: new Date().toISOString().split('T')[0]
    });
    setFileForm({ fileName: "", folder: "Drawings & Layouts", fileUrl: "", isClientVisible: true });
    setUploadFileModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["all", "Contracts", "BOQ & Quotations", "Drawings & Layouts", "3D Renders", "Site Photos", "Material Selections"].map((fld) => (
            <Button
              key={fld}
              variant={selectedFolderFilter === fld ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFolderFilter(fld)}
              className="text-xs h-7"
            >
              {fld}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setUploadFileModalOpen(true)} className="gradient-primary border-0 gap-1.5 text-xs">
          <Upload className="w-3.5 h-3.5" /> Upload File
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files
          .filter(f => selectedFolderFilter === 'all' || f.folder === selectedFolderFilter)
          .map((file) => (
            <Card key={file.id} className="card-hover overflow-hidden">
              {file.file_type.includes('image') ? (
                <div className="h-32 bg-muted overflow-hidden relative">
                  <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                  <span className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                    {file.folder}
                  </span>
                </div>
              ) : (
                <div className="h-32 bg-indigo-50/60 flex flex-col items-center justify-center p-3 relative">
                  <FileText className="w-10 h-10 text-indigo-500 mb-2" />
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">{file.file_type.split('/')[1] || 'DOC'}</span>
                  <span className="absolute top-1 right-1 bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded">
                    {file.folder}
                  </span>
                </div>
              )}
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-foreground truncate mb-1" title={file.file_name}>
                  {file.file_name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                  <span>{formatFileSize(file.file_size_bytes || 0)}</span>
                  <span>{formatDate(file.created_at)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <button
                    onClick={() => toggleFileVisibility(file.id)}
                    className={cn("flex items-center gap-1 text-[10px] font-medium transition-colors", file.is_client_visible ? "text-emerald-600" : "text-muted-foreground")}
                  >
                    {file.is_client_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {file.is_client_visible ? "Client Visible" : "Studio Only"}
                  </button>
                  <button 
                    onClick={() => deleteFile(file.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* MODAL: Upload File */}
      <Dialog open={uploadFileModalOpen} onOpenChange={setUploadFileModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File to Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadFile} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">File Name</Label>
              <Input 
                required 
                value={fileForm.fileName} 
                onChange={(e) => setFileForm({ ...fileForm, fileName: e.target.value })}
                placeholder="e.g. Living_Room_Lighting_Circuit.dwg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Folder Category</Label>
              <select
                value={fileForm.folder}
                onChange={(e) => setFileForm({ ...fileForm, folder: e.target.value })}
                className="w-full h-9 px-2 text-xs rounded border border-input bg-card"
              >
                {["Contracts", "BOQ & Quotations", "Drawings & Layouts", "3D Renders", "Site Photos", "Material Selections", "Invoices", "Miscellaneous"].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File URL / Mock Path</Label>
              <Input 
                value={fileForm.fileUrl} 
                onChange={(e) => setFileForm({ ...fileForm, fileUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isClientVis"
                checked={fileForm.isClientVisible}
                onChange={(e) => setFileForm({ ...fileForm, isClientVisible: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isClientVis" className="text-xs font-normal">Make visible to client on their portal</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadFileModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="gradient-primary border-0">Upload</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
