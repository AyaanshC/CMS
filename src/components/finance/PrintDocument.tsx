"use client";
import { Button } from "@/components/ui/button";
export function PrintDocument(){return <Button className="print:hidden" onClick={()=>window.print()}>Print / save PDF</Button>;}
