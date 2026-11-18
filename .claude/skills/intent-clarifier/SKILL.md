---
name: intent-clarifier
description: Identifica os pontos de decisão e as lacunas de contexto de um pedido de trabalho e pergunta pela ferramenta AskUserQuestion. Chamada no primeiro turno de pedidos de criação, migração, design ou escopo vago. Acionada pela regra intent-gate; sem ela, não siga para pesquisa, plano ou mudança em arquivo.
---

# Intent Clarifier

Decompõe o pedido no primeiro turno, encontra os pontos de decisão e as lacunas de contexto e pergunta diretamente à pessoa pela ferramenta `AskUserQuestion`. Só passa para o passo seguinte (pesquisa, plano, mudança) depois de rodar o ciclo de perguntas até ter contexto suficiente.

## Pedidos que devem chamar esta skill

- Criar funcionalidade, módulo, tela, serviço ou arquivo novo
- Portar, migrar, reescrever ou refatorar em larga escala
- Pedido que exige escolher arquitetura, biblioteca, framework, modelo de deploy ou dependência
- Pedido que provavelmente exige pesquisa externa (busca na web, leitura de documentação)
- Pedido de escopo vago: "me ajuda com X", "melhora Y", "otimiza Z", "faz alguma coisa"
- Pedido em que um pronome (isto, isso, aquilo) não deixa claro o alvo

## Pedidos que não precisam chamá-la (execução simples e óbvia)

- Edição explícita de um único arquivo indicado: "troca o nome desta função para Y"
- Consulta simples: "mostra este arquivo", "explica este log"
- Comando determinístico: rodar testes, build, git status, lint, format
- Quando todo o contexto já foi obtido em turnos anteriores e a pessoa só disse "continua"

Se a isenção for duvidosa, o padrão é **chamar**.

## Procedimento

### Passo 1: Reformular o pedido (em 1 ou 2 frases, internamente)

Não repita a frase da pessoa; reconstrua com estes 3 elementos:

- **Objetivo (goal)**: o resultado que a pessoa quer no fim, em 1 frase
- **Alvo (subject)**: onde o objetivo se aplica (arquivo, módulo, serviço, projeto)
- **Restrições (constraints, se houver)**: restrições e preferências já ditas na frase

Se não der para reconstruir, não pule para o Passo 2: a primeira pergunta do Passo 3 vira a **confirmação do próprio pedido**.

### Passo 2: Listar os pontos de decisão

Tire todas as bifurcações do caminho até o objetivo. Para cada uma, não passe direto achando que "a pessoa deve ter suposto A, B ou C": liste as opções de forma explícita. Confira no mínimo estas categorias:

1. **Forma do resultado e modelo de entrega**: separado / integrado ao que existe / mesclado num arquivo existente / público ou não
2. **Relação com o que já existe**: importar / copiar / referenciar / substituir / descartar / manter em paralelo
3. **Ciclo de vida e manutenção**: longo prazo / experimental / descartado numa data / quem mantém
4. **Critério de sucesso**: o que é "pronto", condições obrigatórias, o que fica de fora
5. **Restrições**: stack, linguagem, framework, biblioteca, desempenho, segurança, compatibilidade, prazo
6. **Público e cenário de uso**: ferramenta interna / família / desenvolvedor externo / usuário final
7. **Se houver pesquisa externa**: que fontes valem como autoridade e em que ponto o resultado conta como decidido

### Passo 3: Achar as lacunas de contexto

Tire da lista os pontos que **já têm resposta explícita** em:

- a mensagem atual da pessoa
- decisões combinadas nos turnos anteriores
- `CLAUDE.md`, `README.md` e os documentos relevantes de `docs/` do projeto

O que sobrar = perguntas. Reduza a no máximo 4, por importância. Se passar de 4, priorize os pontos mais a montante e com mais dependências.

### Passo 4: Perguntar

**Use a ferramenta `AskUserQuestion`.** Não liste perguntas em texto para esperar a resposta.

- No máximo 4 perguntas por chamada
- Cada pergunta tem `question` (texto), `header` (até 12 caracteres), `options` (2 a 4, com label e description) e `multiSelect` (quando couber)
- Se houver uma opção recomendada, ela vem primeiro com `(recomendado)`
- Explique na description, em 1 linha, a troca entre as opções: "A: simples mas difícil de estender / B: maior, mas fácil de manter"

Depois de perguntar, **não siga para o próximo passo** até receber a resposta real.

### Passo 5: Conferir se basta (ciclo)

Com a resposta:

- A informação nova revelou outros pontos de decisão? Se sim, repita os Passos 2 a 4. **No máximo 3 rodadas** (a inicial e até 2 a mais), como equilíbrio entre ter contexto suficiente e não cansar a pessoa. Se não resolver em 3 rodadas, é mais eficiente a pessoa reorganizar os requisitos.
- Todos os pontos resolvidos? Devolva à sessão principal o **resumo do pedido refinado** e encerre:

```
## Clarified Intent
- Objetivo: {reformulação}
- Alvo: {reformulação}
- Pontos decididos:
  - {ponto 1}: {valor escolhido} (base: {resumo da resposta})
  - {ponto 2}: {valor escolhido} (base: ...)
- Pontos deixados em aberto (reconfirmar se precisar durante o trabalho):
  - {listar, ou "nenhum"}
- Suposições (seguindo sem resposta da pessoa):
  - {1 por linha, se houver; cada uma marcada "se não for isso, avise"}
```

- Se nem na 3ª rodada (a última permitida) der para resolver, pergunte por `AskUserQuestion`: "Parece que vale um tempo para organizar os requisitos. Quer pausar?" e pare.

## Proibido

- Listar perguntas em texto e esperar a resposta (sempre a ferramenta `AskUserQuestion`)
- Fazer qualquer coisa além de Read antes de receber a resposta (nada de Write/Edit/WebSearch/WebFetch)
- Decidir implicitamente com base em "padrão razoável" ou "geralmente se faz assim"
- Incluir no plano como "decidido" algo que a pessoa não confirmou
- Juntar várias decisões numa pergunta só (A, B, C e D em perguntas separadas)

## Exceções em que se pode seguir com suposição

Se, na 2ª rodada, a pessoa ainda responder "não sei" ou "decide você":

1. Escolha 1 suposição, a mais simples e reversível
2. Declare em 1 linha: "Vou seguir com esta suposição: {X}. Se não for a intenção, avise já"
3. Registre a suposição no histórico do trabalho (descrição de PR, mensagem de commit, ASSUMPTIONS.md etc.)
4. A declaração em 1 linha vale também no modo Auto

## O que devolver à sessão principal

A skill roda em conversa, então ela termina quando a sessão principal pode passar ao próximo passo (pesquisa, plano, implementação). O retorno é o bloco `## Clarified Intent` do Passo 5, que a sessão principal usa como premissa de todas as decisões seguintes.
