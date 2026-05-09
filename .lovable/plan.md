# Busca preditiva / por facetas no SKU

## Hoje

`CurtainSearch.tsx` faz match literal: cada palavra digitada precisa estar no nome do produto. Resultado: o usuário precisa adivinhar a frase exata. Quando digita "cortina dupla" funciona porque a string "Dupla" está no nome, mas não há nenhuma orientação visual de quais palavras completam a busca.

## Objetivo

Conforme o usuário digita, mostrar **chips de sugestão** acima da lista, propondo a próxima palavra-chave que faz sentido. Clicar no chip adiciona a palavra à query e refina os resultados.

## Como vai parecer

```
Buscar: [ cortina ▮                              ]
Sugestões:  ( Dupla )  ( Blackout )  ( Flamê )
─────────────────────────────────────────────────
[lista atual de resultados que casam]
```

Depois que o usuário clica em "Dupla" (ou digita):

```
Buscar: [ cortina dupla ▮                        ]
Sugestões:  ( Blackout )  ( Microfibra )
            ( Ilhós )  ( Wave )  ( Trilho Suiço ) ( Trilho Duplo )
─────────────────────────────────────────────────
[só duplas listadas]
```

Mais um clique em "Ilhós":

```
Buscar: [ cortina dupla ilhós ▮                  ]
Sugestões:  ( Blackout )  ( Microfibra )
            ( Branco ) ( Bege ) ( Cinza ) ...
            ( 3,00 x 2,70 ) ( 4,00 x 2,80 ) ...
─────────────────────────────────────────────────
```

Os chips ficam agrupados por **categoria** (Tipo, Acabamento superior, Cor, Tamanho) e só aparecem categorias **ainda não escolhidas** e que **ainda têm mais de uma opção** entre os resultados filtrados — quando sobra uma opção só, ela some (já está implícito).

## Como filtrar

A busca continua sendo "todas as palavras precisam aparecer" (já funciona). A novidade é gerar os chips dinamicamente:

1. Calcular o conjunto de resultados atual (mesmo filtro que existe hoje).
2. Para cada faceta (`tipo`, `superior`, `cor`, `tamanho`), pegar os valores únicos dentro desse conjunto.
3. Remover valores que já apareçam na query (ex: se já tem "ilhós" digitado, não sugerir "Ilhós").
4. Mostrar até 6 chips por faceta, com rótulo da faceta como título pequeno.

## Sinônimos

Para a busca tolerar variações comuns, mapeio sinônimos antes de comparar:
- "ilhos" / "ilhós" / "ilhoses" → ilhós
- "trilho suico" / "suiço" → trilho suiço
- "flame" / "flamê" → flamê
- "blackout" / "black" → blackout

(Normalização: `lowercase` + remover acentos em ambos os lados antes do `includes`.)

## Mudanças

- **`src/components/CurtainSearch.tsx`** — único arquivo afetado:
  - Adicionar normalização sem acento na função de match.
  - Construir, junto com `CATALOG`, uma estrutura auxiliar `{ tipo, superior, cor, tamanho }` por SKU.
  - Calcular facetas restantes a partir dos resultados filtrados.
  - Renderizar chips agrupados acima da lista de resultados, clicáveis (acrescentam palavra à query com espaço).
  - Botão "limpar" (×) na barra para resetar query rapidamente.
  - Aumentar o limite de resultados visíveis quando a query estiver vazia ou curta? Não — manter mínimo de 2 caracteres ou 1 chip clicado para abrir.

## O que NÃO muda

- Estrutura de `SKU_PREFIXES`, `CORES_TECIDO`, `SIZES`.
- API `onSelect(sku)` para o componente pai.
- Validação de SKU no resto do app.

## Resultado

Usuário descobre o catálogo digitando uma palavra e seguindo as sugestões — sem precisar saber se chamamos de "Dupla Flamê c/ Blackout" ou só "blackout". A busca continua funcionando exatamente como antes para quem já sabe o que quer.
