import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronsUpDown, Info, LoaderCircle, PlugZap } from "lucide-react";
import { sapAssetSource } from "@/lib/sap-asset-source";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

/** Read-only SAP lookup. Never creates or updates asset records. */
export function SapAssetEntry() {
  const source = sapAssetSource;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  const codes = useQuery({ queryKey: ["sap", "codes", debounced], queryFn: () => source.searchCodes(debounced), enabled: source.configured && open });
  const details = useQuery({ queryKey: ["sap", "details", code], queryFn: () => source.getDetails(code!), enabled: source.configured && !!code });

  if (!source.configured) return <section className="soft-enter py-8">
    <div className="flex items-start gap-3 rounded-xl border border-glass-border bg-glass-strong p-5">
      <PlugZap className="mt-0.5 size-5 text-primary" />
      <div><h3 className="font-display font-bold">SAP connection is not configured yet.</h3><p className="mt-1 text-sm text-muted-foreground">Asset codes and details will appear here once the SAP API is connected. Use "Without SAP" to register an asset now.</p></div>
    </div>
  </section>;

  return <section className="soft-enter space-y-6 py-6">
    <div className="max-w-md">
      <Label className="mb-2 block">SAP Asset Code</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-glass-strong">{code ?? "Select asset code"}<ChevronsUpDown className="opacity-50" /></Button></PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search asset code…" value={query} onValueChange={setQuery} />
            <CommandList>
              {codes.isFetching ? <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Searching SAP…</div>
                : codes.isError ? <div className="p-3 text-sm text-destructive">Could not load asset codes. <button className="underline" onClick={() => codes.refetch()}>Retry</button></div>
                : <><CommandEmpty>No matching asset codes</CommandEmpty>{codes.data?.map(item => <CommandItem key={item.code} value={item.code} onSelect={() => { setCode(item.code); setOpen(false); }}><Check className={code === item.code ? "opacity-100" : "opacity-0"} /><span className="font-mono">{item.code}</span><span className="truncate text-muted-foreground">{item.label}</span></CommandItem>)}</>}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
    {code && <div className="rounded-xl border border-glass-border bg-glass-strong p-5">
      <h3 className="mb-4 font-display font-bold">SAP asset details</h3>
      {details.isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading details…</p>
        : details.isError ? <p className="flex items-center gap-2 text-sm text-destructive" role="alert"><AlertCircle className="size-4" />Could not load details. <Button size="sm" variant="outline" onClick={() => details.refetch()}>Retry</Button></p>
        : !details.data?.length ? <p className="text-sm text-muted-foreground">No details returned for this asset code.</p>
        : <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{details.data.map(d => <div key={d.label}><dt className="text-xs text-muted-foreground">{d.label}</dt><dd className="text-sm font-medium">{d.value ?? "—"}</dd></div>)}</dl>}
    </div>}
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="size-4" />Saving SAP assets will be enabled once the save workflow is confirmed.</p>
  </section>;
}
