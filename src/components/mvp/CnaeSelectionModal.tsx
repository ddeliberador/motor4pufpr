import React, { useState, useEffect } from "react";
import { Search, Check, X, Building2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";


// CNAE structure from official IBGE database
export interface CnaeCode {
  code: string;
  description: string;
  section?: string;
  division?: string;
  group?: string;
  class?: string;
  subclass?: string;
  isOfficialMatch?: boolean;
}

interface CnaeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCnaes: CnaeCode[]) => void;
  suggestedCnaes: CnaeCode[];
  searchQuery: string;
  isLoading?: boolean;
}

const CnaeSelectionModal: React.FC<CnaeSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  suggestedCnaes,
  searchQuery,
  isLoading = false,
}) => {
  const [selectedCnaes, setSelectedCnaes] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");

  // Auto-select suggested CNAEs when modal opens
  useEffect(() => {
    if (isOpen && suggestedCnaes.length > 0) {
      const initialSelection = new Set(
        suggestedCnaes.filter(c => c.isOfficialMatch).map(c => c.code)
      );
      setSelectedCnaes(initialSelection);
    }
  }, [isOpen, suggestedCnaes]);

  const handleToggle = (code: string) => {
    setSelectedCnaes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCnaes.size === filteredCnaes.length) {
      setSelectedCnaes(new Set());
    } else {
      setSelectedCnaes(new Set(filteredCnaes.map(c => c.code)));
    }
  };

  const handleConfirm = () => {
    const selected = suggestedCnaes.filter(c => selectedCnaes.has(c.code));
    onConfirm(selected);
  };

  const filteredCnaes = suggestedCnaes.filter(
    cnae =>
      cnae.code.toLowerCase().includes(filterText.toLowerCase()) ||
      cnae.description.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Selecionar CNAEs Oficiais
          </DialogTitle>
          <DialogDescription>
            Foram encontrados CNAEs relacionados a "<strong>{searchQuery}</strong>".
            Selecione quais devem ser incluídos na análise.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">
              Consultando base oficial de CNAEs...
            </p>
          </div>
        ) : (
          <>
            {/* Filter Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar CNAEs..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">
                {selectedCnaes.size} de {filteredCnaes.length} selecionados
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedCnaes.size === filteredCnaes.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </Button>
            </div>

            {/* CNAE List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-[200px] max-h-[350px]">
              {filteredCnaes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhum CNAE encontrado para o filtro.</p>
                </div>
              ) : (
                filteredCnaes.map(cnae => (
                  <div
                    key={cnae.code}
                    onClick={() => handleToggle(cnae.code)}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${
                        selectedCnaes.has(cnae.code)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }
                    `}
                  >
                    <Checkbox
                      checked={selectedCnaes.has(cnae.code)}
                      onCheckedChange={() => handleToggle(cnae.code)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {cnae.code}
                        </span>
                        {cnae.isOfficialMatch && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded-full font-medium">
                            Match oficial
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {cnae.description}
                      </p>
                      {cnae.section && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Seção: {cnae.section}
                        </p>
                      )}
                    </div>
                    {selectedCnaes.has(cnae.code) && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <DialogFooter className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || selectedCnaes.size === 0}>
            <Check className="w-4 h-4 mr-2" />
            Confirmar Seleção ({selectedCnaes.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CnaeSelectionModal;
