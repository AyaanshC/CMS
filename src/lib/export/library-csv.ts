export const LIBRARY_COLUMNS=["item_name","category","unit","standard_rate","standard_cost_rate","description","specifications"] as const;
export function encodeCsv(rows:Record<string,unknown>[]){
 const cell=(value:unknown)=>{const text=String(value??"");const safe=typeof value==="string"&&/^[=+\-@\t\r]/.test(text)?"'"+text:text;return '"'+safe.replaceAll('"','""')+'"';};
 return '\uFEFF'+[LIBRARY_COLUMNS.join(','),...rows.map(row=>LIBRARY_COLUMNS.map(k=>cell(row[k])).join(','))].join('\r\n');
}
export function parseLibraryCsv(text:string){
 if(text.length>2_000_000)throw new Error("CSV must be 2 MB or smaller.");
 const rows:string[][]=[];let row:string[]=[],value="",quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\n')){row.push(value);value="";if(c==='\n'){rows.push(row);row=[];}}else if(c!=='\r'||quoted)value+=c;}
 if(quoted)throw new Error("CSV has an unclosed quoted field.");if(value||row.length){row.push(value);rows.push(row);}
 const headers=rows.shift()?.map(h=>h.trim());if(!headers||!['item_name','category','unit','standard_rate'].every(k=>headers.includes(k)))throw new Error("CSV must include item_name, category, unit and standard_rate columns.");
 const data=rows.filter(r=>r.some(v=>v.trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
 if(data.length>200)throw new Error("Import at most 200 items at a time.");
 return data.map(r=>({...r,standard_rate:r.standard_rate.trim()===""?NaN:Number(r.standard_rate),standard_cost_rate:r.standard_cost_rate?.trim()?Number(r.standard_cost_rate):null}));
}
