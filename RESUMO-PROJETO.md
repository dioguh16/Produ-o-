# HBW Diário — Resumo do projeto

App PWA (Progressive Web App) pessoal para o Diogo, operador de produção na
HolzBauWerk Schwarzwald GmbH (fábrica de CLT em Besenfeld, Alemanha), para
registar a produção diária (metros de madeira) e acompanhar estatísticas.

Instalada no telemóvel Android via GitHub Pages (repositório GitHub pessoal,
`dioguh16`), sem servidor próprio — tudo corre no browser, dados guardados em
`localStorage`.

## Como funciona (regras de negócio principais)

- **Turnos**: 05:00–14:00 ou 14:00–23:00 (9h cada). O primeiro registo do dia
  determina automaticamente qual dos dois turnos está a decorrer, com base na
  hora.
- **Registo**: cada log é o **valor total acumulado** de metros desde o
  início do turno (não é incremental).
- **Pausa**: um botão marca se houve pausa de 30 min nesse turno. A pausa tem
  hora fixa: 10:00–10:30 (manhã) e 18:00–18:30 (tarde). As horas produtivas
  só descontam a parte da pausa já decorrida (antes da pausa nada, durante
  desconta gradualmente, depois os 30 min inteiros), por isso a média m/h
  fica correta durante o turno. Turno completo com pausa = 8h30 produtivas.
- **Média m/hora e previsão de fim de turno**: calculadas com base na
  **última leitura** (não avançam sozinhas com o relógio). Existe uma
  segunda previsão, "previsão para agora", que essa sim avança em tempo
  real (usa a mesma média, aplicada ao tempo passado desde a última leitura).
- **Meta diária**: 18 000 m. Cores em toda a app: vermelho <16 000,
  amarelo 16 000–18 000, verde ≥18 000. O total/média/previsão do dia
  usam sempre a mesma cor (a da previsão).
- **Terminar turno**: botão que fecha o dia manualmente (em vez de esperar
  pelo dia seguinte). Só dias fechados contam para Recordes e Resumos.
  Há um link discreto "Reabrir turno" para desfazer.
- **Horário do turno ajustável**: por dia, com um seletor de hora nativo
  (`<input type="time">`), para quando um turno acaba mais cedo/tarde que o
  normal.
- **Probeteile**: checkbox simples por baixo do botão de pausa, reinicia
  sozinho todos os dias (não guarda histórico).
- **Notas cronológicas**: notas de texto com hora própria, aparecem
  misturadas com os registos de produção no histórico do dia, ordenadas por
  hora. Não afetam os cálculos de produção. Hora e texto editáveis
  separadamente (toque na hora vs. lápis no texto).
- **Notas tipo Google Keep**: secção separada no menu ("Notas"), notas
  livres com texto + fotos (comprimidas automaticamente antes de guardar),
  grelha estilo Keep.

## Funcionalidades no menu lateral

- **Idioma**: Português / Deutsch, aplica-se a toda a app incluindo texto
  das notificações.
- **Notificações**: interruptor on/off para os lembretes horários (que só
  começam depois do primeiro registo do dia e nunca ultrapassam o fim do
  turno).
- **Dias anteriores**: lista de dias fechados, toque para ver detalhe
  completo (editável). No detalhe há "+ Adicionar leitura" (contagem + hora).
  "+ Criar dia" cria de raiz um dia em falta (data, turno, total, pausa,
  Probeteile) já fechado, com uma única leitura no fim do turno.
- **Resumos**: totais semana/mês, gráfico de barras por dia com linha de
  meta, cores por meta, valores em cima das barras, lista de períodos
  anteriores, barra de progresso face à meta do período. No separador Mês
  há um **calendário do mês** (cada dia com o total em milhares e a cor da
  meta; toque abre o detalhe do dia), setas ‹ › para ver meses anteriores e
  toque nos períodos anteriores para saltar para esse mês.
- **Recordes**: melhor dia (metros) e melhor média m/hora, só de dias
  fechados.
- **Notas**: as notas tipo Keep (ver acima).
- **Dados**: exportar tudo em `.json` (cópia de segurança completa) e em
  `.csv` (uma linha por dia fechado, para abrir em Excel), e importar `.json`
  para restaurar. **Só o `.json` se importa**; o `.csv` é só para Excel.
  A importação só escreve as chaves presentes no ficheiro (não apaga o resto).

## Identidade visual

- Fundo branco, acentos em bege oficial da empresa (`#c3b59e` — confirmado
  no site oficial), texto/botões principais a preto.
- Cabeçalhos de secção com o prefixo "// " (assinatura visual do site da
  HBW).
- Ícone da app: motivo de 3 barras horizontais (bege/preto/bege) inspirado
  no logótipo da empresa, sobre fundo branco — **não** é o logótipo oficial
  copiado (evitado por direitos de autor); há suporte para o utilizador
  adicionar o `logo.png` real manualmente, com reserva automática em texto
  se o ficheiro não existir.
- Ecrã de abertura (splash) animado: ícone estático (mesmo tamanho do
  splash nativo do Android, 128dp) seguido do nome da empresa a aparecer.

## Arquitetura técnica

PWA estática, sem build tools, sem framework. Ficheiros:

- `index.html` — estrutura HTML + CSS
- `manifest.json` — metadados da PWA
- `service-worker.js` — cache offline + notificações + lembra de atualizar
  sozinho quando há versão nova (cache com número de versão que é preciso
  aumentar a cada alteração)
- `icon-192.png`, `icon-512.png` — ícones da app
- `constants.js` — traduções (PT/DE) e valores fixos (meta, duração turno)
- `data.js` — leitura/escrita de dados, datas, exportar/importar, estatísticas
- `entries.js` — registos e notas (criar/editar/apagar)
- `render-main.js` — ecrã principal
- `reminders.js` — lembretes horários e notificações
- `render-drawer.js` — menu lateral e todas as suas secções
- `app.js` — arranque da app (registo do service worker, listeners, splash)

Todos os ficheiros ficam **soltos na raiz do repositório** (sem pastas —
o GitHub mobile não deixa facilmente renomear ficheiros com "/" para criar
pastas).

## Como publicar alterações (processo do Diogo)

1. Recebe um `.zip` com todos os ficheiros atualizados.
2. Extrai no telemóvel.
3. No repositório GitHub (via browser, `github.com`), "Add file → Upload
   files", seleciona todos os ficheiros, substitui os existentes.
4. GitHub Pages publica automaticamente (~1 min).
5. A app deteta a nova versão sozinha e recarrega (graças ao
   `service-worker.js` com cache versionada).

## Decisões conscientes / coisas para não repetir

- **Não copiar o logótipo real da empresa** nem outros ficheiros com
  direitos de autor de terceiros — só recriações inspiradas.
- **Sem framework nem build step** — tem de continuar a funcionar como
  ficheiros estáticos simples, por causa do processo de publicação via
  GitHub Pages a partir do telemóvel.
- **Sem pastas nos ficheiros do repositório** — o Diogo não consegue
  facilmente criar pastas via GitHub mobile.
- Sempre que se altera `service-worker.js` ou qualquer ficheiro, é preciso
  **aumentar o número de versão da cache** (`const CACHE = 'producao-vXX'`)
  para forçar a atualização no telemóvel.

## Ideias discutidas mas ainda não implementadas

- Resumo/relatório diário mais rico (produção por hora dentro do dia)
- Tendências (média 7/30 dias, comparação com período anterior, setas 📈/📉)
- Insights automáticos em linguagem simples ("hoje está X% acima da média")
- Animações de UX (contador a subir, vibração em marcos de 25/50/75/100%)
- Objetivo diário configurável em vez de fixo (considerado desnecessário
  para já — é só o Diogo, numa máquina)

## Contexto pessoal relevante (para continuidade)

- Diogo trabalha por turnos rotativos na HolzBauWerk Schwarzwald, em
  Besenfeld, Alemanha (produção de CLT).
- Vive em Mitteltal, Baiersbronn, Floresta Negra.
- Tem boa autonomia técnica (já construiu outras apps Android em Kotlin).
- Não tem acesso a PC habitualmente — todo o processo de desenvolvimento e
  publicação é feito a partir do telemóvel Android (Xiaomi, MIUI).
- Está no plano gratuito do Claude — conversas longas e edições de código
  grandes esgotam o limite de uso rapidamente; compensa começar conversas
  novas para blocos de trabalho novos, reaproveitando este resumo e os
  ficheiros atuais da app como contexto inicial.
