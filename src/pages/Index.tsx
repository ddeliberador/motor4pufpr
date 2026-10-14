import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { carregarStatusHome } from "@/lib/homeStatus";

const entradas = [
  { to: "/mapa", titulo: "Mapa", descricao: "Explore o país pelas sete camadas da inteligência artificial, da energia às aplicações." },
  { to: "/analise", titulo: "Análise", descricao: "Séries históricas, variação e comparações entre estados, setores e períodos." },
  { to: "/bases", titulo: "Bases", descricao: "Todas as fontes usadas, com situação da coleta, periodicidade e o que ainda não funciona." },
  { to: "/sobre", titulo: "Sobre", descricao: "O projeto, o método e quem participa da pesquisa." },
];

const Index = () => {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof carregarStatusHome>> | null>(null);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => {
    let ativo = true;
    carregarStatusHome().then((resultado) => { if (ativo) setStatus(resultado); })
      .catch(() => { if (ativo) setFalhou(true); });
    return () => { ativo = false; };
  }, []);

  return (
    <div className="home-textual min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[928px] px-4 pb-14 pt-44 sm:px-6 sm:pt-40">
        <h1 className="home-title max-w-[16ch] font-bold leading-[1.06]">
          Onde está a inovação brasileira e como ela evolui
        </h1>
        <p className="mt-7 max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
          Dados públicos de pesquisa, energia, infraestrutura, mercado e política em um só lugar, cada um com a fonte e a data da coleta.
        </p>
        <nav aria-label="Explore o Motor" className="mt-12 border-t border-border sm:mt-16">
          {entradas.map(({ to, titulo, descricao }) => (
            <Link key={to} to={to} className="group flex items-center justify-between gap-6 border-b border-border py-[26px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              <div>
                <h2 className="text-2xl font-semibold group-hover:text-accent">{titulo}</h2>
                <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">{descricao}</p>
              </div>
              <span aria-hidden="true" className="shrink-0 text-2xl text-accent motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:translate-x-1">→</span>
            </Link>
          ))}
        </nav>
        <div aria-live="polite" className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] leading-relaxed text-muted-foreground tabular-nums">
          {status && <><span>{status.bases.toLocaleString("pt-BR")} bases no catálogo</span><span>{status.coletas.toLocaleString("pt-BR")} com coleta registrada</span></>}
          {falhou && <span>Contagens indisponíveis no momento.</span>}
          <span className="text-warning">CNPq e CAPES ainda sem dado real</span>
        </div>
      </main>
      <footer className="mx-auto max-w-[928px] border-t border-border px-4 py-8 text-[13px] leading-relaxed text-muted-foreground sm:px-6">
        <p>Pesquisa de doutorado em Políticas Públicas, PPGPP/UFPR</p>
        <p className="mt-1">Orientação: Prof. Walter Shima · Coorientação: Profª Eunice Liu</p>
      </footer>
    </div>
  );
};

export default Index;
