---
description: Em todo pedido de trabalho, analisa no primeiro turno os pontos de decisão e, se faltar contexto, chama obrigatoriamente a skill intent-clarifier. Sem essa chamada, nada de pesquisa, plano ou mudança em arquivo.
alwaysApply: true
---

# Intent Gate

Esta regra impede que o começo de uma conversa **fixe uma direção errada por suposição implícita**. Ao receber um pedido, a sessão principal primeiro decompõe o pedido para achar os pontos de decisão e, se faltar contexto, chama a skill `intent-clarifier`.

## Gatilho: pedidos em que a regra vale

Se o pedido se encaixar em um destes casos, siga o procedimento abaixo **no primeiro turno**:

- Criar funcionalidade, módulo, tela, serviço ou arquivo novo
- Portar, migrar, reescrever ou refatorar em larga escala
- Pedido que envolve escolher arquitetura, biblioteca, framework, modelo de deploy ou dependência
- Pedido que provavelmente exige pesquisa externa
- Pedido de escopo vago ("me ajuda com X", "melhora Y", "otimiza Z", "faz alguma coisa")
- Pedido em que um pronome ou referência da mensagem não deixa claro de que alvo se trata

## Isenção: pedidos que podem pular a regra

- Edição explícita de um único arquivo indicado ("troca o nome desta função para Y")
- Consulta simples ("mostra este arquivo", "explica este log")
- Execução determinística (rodar testes, build, git status, lint, format)
- Quando todo o contexto já foi obtido em turnos anteriores e o pedido é só "continua"

Se a isenção for duvidosa, o padrão é **acionar a regra**.

## Procedimento obrigatório (primeiro turno)

1. **Reformular o pedido**: reescreva a frase em 1 ou 2 frases com 3 elementos (objetivo / alvo / restrições já ditas).
2. **Listar os pontos de decisão**: enumere mentalmente as bifurcações no caminho até o objetivo. Categorias mínimas: forma do resultado e modelo de entrega, relação com o que já existe, ciclo de vida, critério de sucesso, restrições, público.
3. **Consultar o contexto antes**: leia **rapidamente** os arquivos abaixo para eliminar os pontos que já têm resposta:
   - `CLAUDE.md`
   - `README.md` (as primeiras 200 linhas, se existir)
   - o índice da raiz de `docs/` ou um arquivo parecido com ARCHITECTURE
4. **Avaliar as lacunas**: depois dos 3 passos, se sobrar **1 ou mais** pontos sem confirmação, vá para o 5.
   Se sobrar **0**, vá para o 7 (pode seguir sem chamar a skill, mas cumpra o 5-a).
5. **Chamar a skill `intent-clarifier`**: execute `intent-clarifier` pela ferramenta Skill ou caminho equivalente. A skill faz as perguntas com `AskUserQuestion`.
   - 5-a. Mesmo sem lacunas e sem chamar a skill, diga à pessoa uma vez "Vou seguir com este entendimento: {resumo de 1 ou 2 frases}. Se não for isso, me interrompa" e só então siga.
6. **Receber o pedido refinado**: o bloco `## Clarified Intent` que a skill devolve passa a ser a premissa de todo plano e implementação seguintes.
7. **Seguir para o próximo passo**: só a partir daqui começam pesquisa, plano e mudança em arquivos.

## Proibido antes de concluir o procedimento

- Write / Edit de arquivos
- Pesquisa externa (WebSearch, WebFetch, fetch por MCP externo)
- Apresentar à pessoa um "plano" ou "direção" como decidido
- Listar perguntas em texto e esperar a resposta; perguntas só pela ferramenta `AskUserQuestion`

## Modo Auto e execução automática

A regra vale mesmo com modo Auto ou política de execução automática ligada. Porém, seguindo o procedimento de escalonamento da skill `intent-clarifier`, se a pessoa responder "decide você" também na 2ª rodada, é permitido seguir depois de declarar em 1 linha a suposição mais simples e reversível. A obrigação de declarar a suposição continua no modo Auto.

## Conflito com outras regras sempre ativas

Se o projeto já tiver uma regra sempre ativa do tipo "comece a implementar na hora", "siga sem perguntar" ou "faça rápido", **esta regra prevalece**. Motivo: as duas são `alwaysApply: true`, mas uma decisão implícita sem confirmar a intenção é o tipo de erro mais caro de desfazer, e as outras regras dependem deste momento. Ao achar uma regra em conflito, você pode propor um ajuste à pessoa, mas a própria proposta segue o procedimento desta regra (ou seja, não altere a regra sem perguntar no primeiro turno).

## Por que esta regra existe

Fixar sem querer uma direção errada no primeiro turno faz pesquisa, plano e implementação se empilharem sobre ela, e o custo de voltar atrás cresce rápido. Confirmar antes os pontos de decisão e o contexto limita esse custo a "uma pergunta no primeiro turno".
