import { randomId } from "@/lib/uuid";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, LoaderCircle, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { documentTypes, DOCUMENT_ACCEPT, validateDocumentFile, type DocumentType } from "@/lib/asset-document-schema";
import { downloadAssetDocument } from "@/lib/asset-documents.functions";
import type { WorkspaceData } from "./workspace";

export type PendingDocument = { id: string; type: DocumentType; file: File };
type Document = WorkspaceData["attachments"][number];

export function AssetDocumentList({ documents }: { documents: Document[] }) {
  const download = useServerFn(downloadAssetDocument);
  const [busy, setBusy] = useState<string | null>(null);
  async function open(document: Document) {
    setBusy(document.id);
    try {
      const result = await download({ data: { id: document.id } });
      const link = window.document.createElement("a");
      link.href = result.url; link.download = document.file_name; link.rel = "noopener";
      link.click();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not download attachment"); }
    finally { setBusy(null); }
  }
  return <div className="divide-y divide-glass-border">{documents.map(document => <div key={document.id} className="flex min-w-0 items-center gap-3 py-3"><FileText className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{document.file_name}</p><p className="mt-1 text-xs text-muted-foreground">{documentTypes.find(type => type.id === document.document_type)?.label} · {(document.file_size / 1024 / 1024).toFixed(2)} MB</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Download ${document.file_name}`} title="Download attachment" disabled={busy !== null} onClick={() => open(document)}>{busy === document.id ? <LoaderCircle className="animate-spin" /> : <Download />}</Button></div>)}</div>;
}

export function AssetDocumentPicker({ pending, onChange, existing }: { pending: PendingDocument[]; onChange: (files: PendingDocument[]) => void; existing: Document[] }) {
  return <section className="border-b border-glass-border py-6"><h3 className="mb-5 flex items-center gap-2 font-display text-base font-bold"><Paperclip className="size-4" />Asset attachments</h3><div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{documentTypes.map(type => <div key={type.id} className="min-w-0"><label htmlFor={`attachment-${type.id}`} className="mb-2 block text-sm font-medium">{type.label}</label><input id={`attachment-${type.id}`} type="file" multiple accept={DOCUMENT_ACCEPT} className="block w-full min-w-0 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-glass-strong file:px-3 file:py-2 file:text-foreground" onChange={event => {
    const added: PendingDocument[] = [];
    for (const file of Array.from(event.target.files ?? [])) {
      try { validateDocumentFile(file); added.push({ id: randomId(), type: type.id, file }); }
      catch (error) { toast.error(`${file.name}: ${error instanceof Error ? error.message : "Invalid file"}`); }
    }
    onChange([...pending, ...added]); event.target.value = "";
  }} />{pending.filter(document => document.type === type.id).map(document => <div key={document.id} className="mt-2 flex items-center gap-2"><span className="min-w-0 flex-1 break-all text-xs">{document.file.name}</span><Button type="button" variant="ghost" size="icon" title="Remove selected attachment" aria-label={`Remove ${document.file.name}`} onClick={() => onChange(pending.filter(item => item.id !== document.id))}><X className="size-4" /></Button></div>)}</div>)}</div>{existing.length > 0 && <div className="mt-5"><AssetDocumentList documents={existing} /></div>}</section>;
}