import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Checkbox plant picker. An empty selection means "All plants". */
export function PlantMultiSelect({ plants, value, onChange, disabled, className, prefix = "" }: { plants: string[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean; className?: string; prefix?: string }) {
  const label = value.length === 0 || value.length === plants.length ? "All plants" : value.length === 1 ? `${prefix}${value[0]}` : `${value.length} plants selected`;
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter(x => x !== p) : [...value, p]);
  return <Popover>
    <PopoverTrigger asChild><Button type="button" variant="outline" disabled={disabled} aria-label="Filter by plant" className={`w-full justify-between font-normal ${className ?? ""}`}><span className="truncate">{label}</span><ChevronDown className="size-4 opacity-50" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-64 p-2">
      <div className="mb-2 flex justify-between gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => onChange([...plants])}>Select all</Button><Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>Clear</Button></div>
      <div className="max-h-64 overflow-y-auto">{plants.length === 0 && <p className="p-2 text-xs text-muted-foreground">No plants available</p>}{plants.map(p => <label key={p} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"><Checkbox checked={value.includes(p)} onCheckedChange={() => toggle(p)} />{prefix}{p}</label>)}</div>
    </PopoverContent>
  </Popover>;
}
