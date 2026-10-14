"use client";
import {Suspense,use} from "react";
import {useAppStore} from "@/lib/store";
import {MaterialBoard} from "@/components/projects/MaterialBoard";
import {BrandLoader} from "@/components/brand/BrandLoader";
export default function Page({params}:{params:Promise<{slug:string}>}){return <Suspense fallback={<BrandLoader label="Loading materials"/>}><Content params={params}/></Suspense>;}
function Content({params}:{params:Promise<{slug:string}>}){const {slug}=use(params);const {projects,materialOptions}=useAppStore();const project=projects.find(p=>p.portal_slug===slug);if(!project)return <p>Project unavailable.</p>;return <div className="space-y-4"><h1 className="text-2xl font-semibold">Material selections</h1><p className="text-sm text-muted-foreground">Compare options for each room and category. The studio finalizes your chosen materials.</p><MaterialBoard projectId={project.id} materials={materialOptions.filter(m=>m.project_id===project.id)}/></div>;}
