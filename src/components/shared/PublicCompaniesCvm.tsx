/**
 * Maiores empresas de capital aberto do setor (dados públicos da CVM).
 * Recorte PARCIAL: só companhias de capital aberto — a limitação é exibida sempre.
 */
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { api, type PublicCompaniesResult } from "@/lib/api";

interface Props {
  /** Códigos CNAE identificados pela ontologia para o tema pesquisado */
  cnaeCodes: string[];
}

function formatReceita(value: number | null): string {
  if (!value) return "Receita não declarada";
  if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1).replace(".", ",")} bi`;
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function formatCnpj(cnpj: string): string {
  const d = (cnpj || "").replace(/\D/g, "").padStart(14, "0");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export default function PublicCompaniesCvm({ cnaeCodes }: Props) {
  const [result, setResult] = useState<PublicCompaniesResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasCnae = cnaeCodes.length > 0;
  const key = cnaeCodes.join(",");

  useEffect(() => {
    if (!hasCnae) return;
    let active = true;
    setIsLoading(true);
    setFailed(false);
    api
      .getPublicCompaniesByCnae(cnaeCodes, 10)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setResult(res.data);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hasCnae]);

  const companies = result?.companies || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h4 className="text-sm font-semibold text-foreground mb-1">🏛️ Maiores empresas de capital aberto do setor</h4>
      <p className="text-xs text-muted-foreground mb-3">
        Empresas listadas na bolsa cuja classificação setorial corresponde ao setor do tema pesquisado,
        ordenadas pela receita que elas mesmas declararam à CVM.
      </p>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
        <p className="text-xs text-foreground">
          <strong>Recorte parcial</strong> — inclui apenas companhias de capital aberto (dados públicos da CVM).
          Não representa o mercado privado do setor, que no Brasil é frequentemente maior.
        </p>
      </div>

      {!hasCnae && (
        <p className="text-sm text-muted-foreground">
          Este bloco depende de classificação setorial (CNAE). Para o tema pesquisado, as bases não retornaram um
          setor econômico correspondente — é comum em temas científicos transversais, que não têm atividade
          econômica própria. Refaça a busca escolhendo um CNAE para ver as companhias abertas do setor.
        </p>
      )}

      {hasCnae && isLoading && <p className="text-sm text-muted-foreground">Consultando os dados abertos da CVM…</p>}

      {hasCnae && !isLoading && failed && (
        <p className="text-sm text-muted-foreground">
          Não foi possível consultar os dados abertos da CVM agora. Tente novamente mais tarde.
        </p>
      )}

      {hasCnae && !isLoading && !failed && result && !result.available && (
        <p className="text-sm text-muted-foreground">
          {result.reason || "Sem dados de companhias abertas para este setor."}
        </p>
      )}

      {hasCnae && !isLoading && !failed && result?.available && companies.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma companhia de capital aberto com receita declarada foi encontrada para este setor
          {result.cvm_sectors?.length ? ` (${result.cvm_sectors.join(", ")})` : ""}.
        </p>
      )}

      {companies.length > 0 && (
        <>
          <div className="space-y-2">
            {companies.map((c, i) => (
              <div
                key={c.cnpj || i}
                className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-xl p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {c.nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    CNPJ {formatCnpj(c.cnpj)}
                    {c.setor_cvm ? ` · ${c.setor_cvm}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatReceita(c.receita)}</p>
                  <p className="text-xs text-muted-foreground">
                    receita declarada{c.ano_referencia ? ` (${c.ano_referencia})` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {result?.with_revenue ?? companies.length} de {result?.total_matched ?? companies.length} companhias do
              setor têm receita declarada
              {result?.ano_dfp ? ` (arquivo DFP ${result.ano_dfp})` : ""}.
            </span>
            <a
              href="https://dados.cvm.gov.br/dataset/cia_aberta-doc-fca"
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 hover:underline"
            >
              Cadastro das companhias na CVM <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}
