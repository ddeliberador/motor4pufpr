// Tema claro/escuro do app. O CSS já define `.dark` em index.css; aqui só se
// aplica a classe no <html> e se lembra a escolha no navegador.

export type Tema = "claro" | "escuro";
const CHAVE = "motor-tema";

export function temaAtual(): Tema {
  return document.documentElement.classList.contains("dark") ? "escuro" : "claro";
}

export function definirTema(t: Tema) {
  document.documentElement.classList.toggle("dark", t === "escuro");
  try { localStorage.setItem(CHAVE, t); } catch { /* sem armazenamento */ }
}

/** Chamado uma vez na inicialização, antes da primeira pintura. */
export function aplicarTemaSalvo() {
  try {
    const t = localStorage.getItem(CHAVE) as Tema | null;
    if (t === "escuro") document.documentElement.classList.add("dark");
  } catch { /* sem armazenamento */ }
}
