import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronsUpDown, LoaderCircle, PlugZap, X } from "lucide-react";
import { mapSapValues, sapAssetSource } from "@/lib/sap-asset-source";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

/** Read-only SAP code picker. Hands mapped form values back; never saves. */
export function SapAssetEntry({ formKeys, onValues }: { formKeys: readonly string[]; onValues: (values: Record<string, string> | null) => void }) {
  const source = sapAssetSource;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const codes = useQuery({ queryKey: ["sap", "codes", debounced], queryFn: () => source.searchCodes(debounced), enabled: source.configured && open });
  const details = useQuery({ queryKey: ["sap", "details", code], queryFn: () => source.getDetails(code!), enabled: source.configured && !!code });
  useEffect(() => { if (code && details.data) onValues(mapSapValues(details.data, formKeys)); }, [code, details.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!source.configured) return <div className="mt-6 flex items-start gap-3 rounded-xl border border-glass-border bg-glass-strong p-4">
    <PlugZap className="mt-0.5 size-5 text-primary" />
    <div><p className="font-display font-bold">SAP connection is not configured yet.</p><p className="mt-1 text-sm text-muted-foreground">SAP asset codes will appear here once the SAP API is connected.</p></div>
  </div>;

  return <div className="mt-6 flex flex-wrap items-end gap-3">
    <div className="w-full max-w-md">
      <Label className="mb-2 block">SAP Asset Code</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-glass-strong">{code ?? "Select asset code"}<ChevronsUpDown className="opacity-50" /></Button></PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search asset code…" value={query} onValueChange={setQuery} />
            <CommandList>
              {codes.isFetching ? <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Searching SAP…</div>
                : codes.isError ? <div className="p-3 text-sm text-destructive">Could not load asset codes. <button type="button" className="underline" onClick={() => codes.refetch()}>Retry</button></div>
                : <><CommandEmpty>No matching asset codes</CommandEmpty>{codes.data?.map(item => <CommandItem key={item.code} value={item.code} onSelect={() => { onValues(null); setCode(item.code); setOpen(false); }}><Check className={code === item.code ? "opacity-100" : "opacity-0"} /><span className="font-mono">{item.code}</span><span className="truncate text-muted-foreground">{item.label}</span></CommandItem>)}</>}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
    {code && <Button type="button" variant="ghost" onClick={() => { setCode(null); onValues(null); }}><X />Clear SAP selection</Button>}
    {code && details.isLoading && <p className="flex w-full items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading SAP details…</p>}
    {code && details.isError && <p className="flex w-full items-center gap-2 text-sm text-destructive" role="alert"><AlertCircle className="size-4" />Could not load details. <Button type="button" size="sm" variant="outline" onClick={() => details.refetch()}>Retry</Button></p>}
  </div>;
}
