# Regras de UX

Toda tela nova segue estas regras, em todos os tamanhos.

1. Nada rola na horizontal no celular. Os testes e2e conferem isso.
2. Diálogos usam `<dialog>` nativo com `showModal()`, então o resto da página fica inerte, Esc fecha e o foco volta para quem abriu. No celular ocupam a tela inteira com as ações fixas no rodapé, empilhadas em coluna com a principal em cima.
3. No desktop, as ações de diálogo ficam à direita (secundária, depois principal) e a ação destrutiva fica à esquerda, com ícone e texto e confirmação em dois cliques.
4. O filtro de pessoas é painel ao vivo na barra lateral. Abaixo de 1080px vira diálogo com "Limpar" e "Aplicar", e o X fecha sem aplicar. Filtros ativos aparecem como chips removíveis.
5. Ações reconhecíveis são botões de ícone com `aria-label` e `title` iguais. A ação principal da tela tem ícone e texto.
6. Rótulo acima do campo, placeholder como exemplo real, erro embaixo do campo. Datas e horas usam os seletores nativos, que já formatam no idioma do aparelho.
7. Alvos de toque têm pelo menos 24px (WCAG 2.5.8), como os dias do mini calendário, 40px nos botões de ícone e 44px nos botões com texto e nos campos.
8. Tudo que aparece ou some anima em transform e opacity entre 150 e 380ms, e `prefers-reduced-motion` desliga.
9. Cor nunca é a única informação: eventos mostram nome de quem participa na agenda, e o mês mostra pontos coloridos mais o título.
