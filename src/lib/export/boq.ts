import type {BOQVersion} from "@/types";
import {boqTotals,lineTotal} from "@/lib/finance/money";
export async function boqWorkbook(boq:BOQVersion,studio:string){
  const {Workbook}=await import("exceljs");const workbook=new Workbook();
  workbook.creator=studio;const sheet=workbook.addWorksheet("BOQ");
  sheet.columns=[{width:26},{width:22},{width:60},{width:12},{width:14},{width:18},{width:22}];
  sheet.addRow([studio]);sheet.addRow([boq.version_label||`Revision ${boq.version_number}`,boq.status]);sheet.addRow([]);
  const header=sheet.addRow(["Room / section","Category","Description","Unit","Quantity","Rate","Amount"]);
  header.font={bold:true,color:{argb:"FFFFFFFF"}};header.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF496958"}};
  for(const section of boq.sections)for(const item of section.items){
    sheet.addRow([section.room_name??section.name??"General",section.category,item.description,item.unit,item.quantity,item.unit_rate,lineTotal(item.quantity,item.unit_rate)]);
  }
  const totals=boqTotals(boq);sheet.addRow([]);
  for(const [label,value] of [["Items subtotal",totals.itemsSubtotal],["Designer fee",boq.designer_fee],["Discount",-boq.discount_amount],["Taxable",totals.taxable],[`GST (${boq.gst_percent}%)`,totals.gst],["Grand total",totals.grandTotal]] as const){const row=sheet.addRow([label,"","","","","",value]);row.font={bold:true};}
  sheet.getColumn(6).numFmt='#,##0.00';sheet.getColumn(7).numFmt='#,##0.00';
  sheet.views=[{state:"frozen",ySplit:4}];sheet.autoFilter={from:{row:4,column:1},to:{row:4,column:7}};
  sheet.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0};
  return workbook;
}
export async function downloadBoq(boq:BOQVersion,studio:string){
  const workbook=await boqWorkbook(boq,studio);const buffer=await workbook.xlsx.writeBuffer();
  const url=URL.createObjectURL(new Blob([new Uint8Array(buffer).buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  const a=document.createElement("a");a.href=url;a.download=`BOQ-v${boq.version_number}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
