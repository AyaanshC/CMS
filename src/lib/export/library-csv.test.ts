import {describe,it,expect} from "vitest";
import {encodeCsv,parseLibraryCsv} from "./library-csv";
describe("library CSV",()=>{
it("roundtrips commas, quotes, newlines and zero rates",()=>{const item={item_name:'Oak, "A"',category:"Carpentry",unit:"nos",standard_rate:0,description:"First\nSecond"};expect(parseLibraryCsv(encodeCsv([item]))[0]).toMatchObject(item);});
it("rejects broken quoting and incomplete headers",()=>{expect(()=>parseLibraryCsv('item_name,category,unit,standard_rate\n"broken')).toThrow('unclosed');expect(()=>parseLibraryCsv('name,rate\nOak,10')).toThrow('must include');});
it("exports formula-like text as literal cells",()=>{expect(encodeCsv([{item_name:'=1+1',standard_rate:12}])).toContain('"\'=1+1"');});
});
