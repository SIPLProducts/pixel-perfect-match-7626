import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { downloadAssetTemplate } from "@/lib/asset-import";
import { downloadTemplateFile, resolveTemplate } from "@/lib/asset-templates";
import { categoryPath } from "@/lib/category-schema";
import type { WorkspaceData } from "./workspace";

const STANDARD = "__standard";

export function useCategoryTemplates() {
  return useQuery({
    queryKey: ["workspace", "category-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_templates").select("category_id,template_key");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function TemplateDownload({ data, variant = "outline", label = "Download Excel template" }: { data: WorkspaceData; variant?: "outline" | "glass"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(STANDARD);
  const [busy, setBusy] = useState(false);
  const links = useCategoryTemplates();
  const categories = data.categories.filter((c) => !data.categories.some((x) => x.parent_id === c.id))
    .map((c) => ({ ...c, path: categoryPath(c, data.categories) })).sort((a, b) => a.path.localeCompare(b.path));
  const selected = data.categories.find((c) => c.id === choice);
  const template = selected ? resolveTemplate(selected.id, data.categories, links.data ?? []) : null;
  const download = async () => {
    setBusy(true);
    try {
      if (choice === STANDARD) await downloadAssetTemplate(data);
      else if (template) await downloadTemplateFile(template);
      setOpen(false);
    } catch { toast.error("Could not download the Excel template. Please try again."); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant={variant} onClick={() => setOpen(true)}><FileSpreadsheet />{label}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Download Excel template</DialogTitle><DialogDescription>Choose the asset category to get its format.</DialogDescription></DialogHeader>
        <div><Label htmlFor="template-category">Asset category</Label>
          <Select value={choice} onValueChange={setChoice}><SelectTrigger id="template-category" className="mt-2 w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={STANDARD}>Standard Asset360 template (all categories)</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.path}</SelectItem>)}</SelectContent></Select>
        </div>
        {selected && (links.isLoading ? <p className="text-sm text-muted-foreground">Checking template…</p>
          : template ? <p className="text-sm">Format: <span className="font-semibold">{template.label}</span></p>
          : <p role="alert" className="text-sm text-destructive">No Excel template is configured for {selected.name}. Ask a manager to set one in Categories.</p>)}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || (!!selected && !template)} onClick={download}>{busy ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}Download</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
