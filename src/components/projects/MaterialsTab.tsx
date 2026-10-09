"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Palette, Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { MaterialOption } from "@/types";

export default function MaterialsTab({ materials }: { materials: MaterialOption[] }) {
  const { toggleMaterialSelection } = useAppStore();

  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Material Selections & Specifications</span>
      </div>

      {materials.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {materials.map(mat => (
            <Card key={mat.id} className="overflow-hidden card-hover">
              <div className="h-44 bg-muted overflow-hidden relative">
                <img src={mat.image_url} alt={mat.product_name} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                  {mat.category}
                </span>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs text-foreground leading-snug">{mat.product_name}</h4>
                  <span className="text-xs font-bold text-indigo-600">₹{mat.approx_cost}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{mat.brand} · {mat.room_name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{mat.description}</p>
                <div className="pt-2 border-t flex justify-between items-center">
                  <button
                    onClick={() => toggleMaterialSelection(mat.id)}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all",
                      mat.is_selected ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <Check className="w-3 h-3" />
                    {mat.is_selected ? "Selected by Client" : "Select Option"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl bg-slate-50/50">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Materials Selected</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            You haven't added any material options or moodboard items for this project yet.
          </p>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add from Library
          </Button>
        </div>
      )}
    </>
  );
}
