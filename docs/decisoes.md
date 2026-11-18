# Decisões

Decisões tomadas na criação do Ninho, com o motivo. Cada uma pode ser revista sem reescrever o resto.

## Produto

1. Uma pessoa participa de uma família só. Isso simplifica permissões e a navegação, e cobre o caso comum de uma casa.
2. Quem cria a família administra: adiciona perfis sem conta, remove pessoas, gera novo código de convite e renomeia a família. Qualquer pessoa da família cria, edita e exclui qualquer evento, como numa agenda de papel na geladeira.
3. Perfis sem conta (crianças, avós) aparecem como participantes e filtros, mas não entram no app.
4. O convite é um código de 8 caracteres sem letras ambíguas, aceito com ou sem hífen e em minúsculas. Gerar outro código invalida o anterior.
5. A recorrência tem diária, semanal, mensal e anual, com data final opcional. Editar um evento recorrente edita a série inteira, porque exceções por ocorrência complicariam o modelo e a interface sem pedido real.
6. Eventos mensais no dia 31 pulam meses sem esse dia, e aniversários em 29/02 aparecem só em anos bissextos, como no RFC 5545.
7. A agenda assinável (`/ics/<token>.ics`) traz todos os eventos da família, com RRULE. O token é por pessoa e não expira.
8. O filtro de pessoas fica salvo só no navegador de quem filtrou.
9. A semana começa no domingo, como na maioria dos calendários brasileiros.

## Técnica

1. Vue 3 + Vite no front, Hono no Node e SQLite via `node:sqlite`. Não há dependência nativa para compilar e o banco é um arquivo, o que basta para uma família.
2. Eventos de dia inteiro guardam datas locais (`2026-11-20`); eventos com hora guardam instantes UTC. A expansão de recorrência roda no navegador, no fuso de quem vê, então "toda terça às 17h" continua às 17h depois de uma mudança de horário de verão.
3. Sessão por cookie `HttpOnly` e `SameSite=Lax`, com só o hash do token no banco. Escritas exigem a mesma origem e corpo JSON, o que bloqueia formulários de outros sites.
4. Senhas usam scrypt. Login e cadastro têm limite de tentativas em memória, suficiente para um processo só.
5. As atualizações ao vivo usam Server-Sent Events num barramento em memória. Rodar mais de uma instância da API exigiria trocar o barramento (Redis, Postgres LISTEN/NOTIFY).

## Design

A direção 1, "Mesa", foi a escolhida entre as três de `docs/design/r1/`: fundo quente, Bricolage Grotesque com Hanken Grotesk, terracota como cor de ação e agenda como tela principal no celular. A visão de semana com grade de horas e o seletor de repetição em segmentos vieram da direção 2.
