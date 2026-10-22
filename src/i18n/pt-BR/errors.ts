import type { Messages } from "../messages";

export const errors: Messages["errors"] = {
  investigation: "Não foi possível concluir a investigação.",
  repository: "Não foi possível abrir o repositório.",
  notFound: "Este repositório parece privado ou não existe.",
  rateLimited: (host) => `O ${host} está limitando as requisições no momento.`,
  busy: (wait) => `Muitas requisições seguidas. Tente novamente em ${wait}.`,
  busySoon: "Muitas requisições seguidas. Tente novamente em instantes.",
  tooLarge: "Este caso é grande demais para ser reescrito.",
  aiUnavailable: "A reconstrução por IA está indisponível no momento.",
  ownerNotRepo:
    "Esse endereço aponta para um usuário ou uma organização do GitHub, não para um repositório. Use owner/repo ou o endereço completo do repositório.",
  notARepository: "Esse caminho não é um repositório git.",
  gitUnavailable:
    "O Git não está disponível aqui, então só repositórios do GitHub funcionam. Use owner/repo ou um endereço como https://github.com/owner/repo.",
  server: "O servidor teve um problema. Tente novamente em instantes.",
  network: "Não foi possível conectar ao servidor. Verifique sua conexão.",
  noEvidence: "A investigação voltou sem nenhuma evidência.",
  signInHint: "Entrar com o GitHub é o jeito mais simples de resolver, sem precisar de token.",
  installHint:
    "Se o repositório for privado, instale o app do Understory no GitHub para liberar o acesso.",
  installApp: "Instalar o app no GitHub",
};
