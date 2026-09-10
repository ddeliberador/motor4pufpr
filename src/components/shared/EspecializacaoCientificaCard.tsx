import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

export interface EspecializacaoCientificaBrasil {
  area_pt: string;
  area_en?: string;
  grande_area_pt: string;
  quadrante?: number | null;
  ie: number | null;
  participacao_brasil_pct: number | null;
  volume_brasil: number | null;
  crescimento_pct: number | null;
  casamento?: string;
  fonte?: string;
  fonte_url?: string;
  periodo?: string;
  fonte_label?: string;
}

const nf = (v: number | null | undefined, dig = 2) =>
  v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: dig, maximumFractionDigits: dig });

export default function EspecializacaoCientificaCard({
  dados,
}: {
  dados?: EspecializacaoCientificaBrasil | null;
}) {
  if (!dados) return null;

  const ie = dados.ie ?? null;
  const especializado = ie !== null && ie >= 1;
  const cresc = dados.crescimento_pct ?? null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative w-full text-left bg-card border border-border rounded-2xl p-5 cursor-help transition-all hover:shadow-md"
        >
          <Info className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground/50" />

          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📚</span>
            <p className="text-sm font-semibold text-foreground leading-tight">
              O Brasil é forte nesta área?
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Peso da produção científica brasileira em <span className="font-medium text-foreground">{dados.area_pt}</span>
          </p>

          <p className="text-4xl font-bold text-foreground mb-1">
            {nf(ie)}
            <span className="text-base font-normal text-muted-foreground ml-1">IE</span>
          </p>

          <p className={`text-sm font-medium mt-1 ${especializado ? "text-emerald-500" : "text-amber-500"}`}>
            {especializado
              ? "Área em que o país é especializado"
              : "Área abaixo da média mundial do país"}
          </p>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-muted-foreground">Participação</dt>
              <dd className="font-semibold text-foreground">{nf(dados.participacao_brasil_pct, 2)}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Publicações</dt>
              <dd className="font-semibold text-foreground">
                {dados.volume_brasil === null || dados.volume_brasil === undefined
                  ? "—"
                  : dados.volume_brasil.toLocaleString("pt-BR")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Crescimento</dt>
              <dd className={`font-semibold ${cresc !== null && cresc < 0 ? "text-red-500" : "text-emerald-500"}`}>
                {cresc === null ? "—" : `${cresc > 0 ? "+" : ""}${nf(cresc, 1)}%`}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[10px] text-muted-foreground">
            {dados.fonte_label || "CGEE/MCTI — Painel WoS Brasil"} · triênio {dados.periodo || "2023-2025"}
          </p>
        </button>
      </PopoverTrigger>

      <PopoverContent side="bottom" className="w-80 text-xs leading-relaxed space-y-3">
        <div>
          <p className="font-semibold text-sm mb-1">Índice de Especialização (IE)</p>
          <p className="text-muted-foreground">
            Compara a participação do Brasil nesta área com a participação do país no total mundial de
            publicações. Acima de 1, o Brasil produz mais nesta área do que a média da sua ciência;
            abaixo de 1, produz menos.
          </p>
        </div>

        <div>
          <p className="font-semibold mb-1">Área identificada</p>
          <p className="text-muted-foreground">
            {dados.area_pt}
            {dados.area_en ? ` (${dados.area_en})` : ""} — grande área: {dados.grande_area_pt}
            {dados.casamento ? ` · casamento por ${dados.casamento}` : ""}
          </p>
        </div>

        {dados.quadrante ? (
          <div>
            <p className="font-semibold mb-1">Quadrante</p>
            <p className="text-muted-foreground">
              Quadrante {dados.quadrante} do painel de especialização (volume × especialização).
            </p>
          </div>
        ) : null}

        <div className="pt-2 border-t border-border">
          <a
            href={dados.fonte_url || "https://octi.cgee.org.br/panoramas/brasil/outros/painel-wos"}
            target="_blank"
            rel="noreferrer"
            className="text-primary font-medium hover:underline"
          >
            Fonte: CGEE/MCTI — Painel WoS Brasil, triênio {dados.periodo || "2023-2025"} →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
