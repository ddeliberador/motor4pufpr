/**
 * DataDetailSheet — Side panel for viewing detail of any data item
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink } from "lucide-react";

export interface DetailItem {
  title?: string;
  subtitle?: string;
  type: string;
  fields?: Array<{ label: string; value: string | number | null }>;
  url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

interface DataDetailSheetProps {
  open: boolean;
  onClose: () => void;
  item: DetailItem | null;
}

const DataDetailSheet = ({ open, onClose, item }: DataDetailSheetProps) => {
  if (!item) return null;

  // Auto-generate title and fields from data if not provided
  const title = item.title || item.data?.name || item.data?.title || item.type;
  const fields = item.fields || (item.data ? Object.entries(item.data)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => ({ label: k, value: String(v) })) : []);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-foreground pr-6">
            {title}
          </SheetTitle>
          {item.subtitle && (
            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full font-medium uppercase tracking-wider">
            {item.type}
          </span>

          <div className="space-y-3 mt-4">
            {fields
              .filter((f) => f.value !== null && f.value !== undefined && f.value !== "")
              .map((f, i) => (
                <div key={i} className="flex justify-between items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground flex-shrink-0">{f.label}</span>
                  <span className="text-sm font-medium text-foreground text-right">{f.value}</span>
                </div>
              ))}
          </div>

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-4"
            >
              <ExternalLink className="w-4 h-4" />
              Ver fonte original
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DataDetailSheet;
