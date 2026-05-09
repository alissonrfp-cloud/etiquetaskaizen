## Diagnóstico do bug

A "Lista de Separação" da Kaizen tem layout fixo de 4 colunas: **ID | SKU | NOME | QTD**, com QTD sendo sempre o último inteiro da linha. O parser atual usa heurística de "primeiro número plausível após o SKU", então em linhas como:

```
4141313  CBTI220X130BEGE  Cortina Blackout Ilhós 2,20m x 1,30m BEGE  1
```

ele pega o **2** de "2,20m" em vez do **1** final. Isso explica os erros que você viu (CBTI220X130BEGE virou 2, CBTI260X180BEGE virou 2, CBTI220X130CHUMBO virou 2 quando era 4, etc.).

Também há um problema secundário: SKUs "estranhos" como `63049100-PRETO-90CM`, `CBTS-SOBMED-BRANCO-4M`, `CE--Cinza`, `CE--Preto` são silenciosamente descartados — você quer que apareçam na revisão para você decidir.

## O que vou fazer

### 1. Reescrever o parser para o formato Picking List (`src/utils/pdfParser.ts`)

- **Detecção de formato**: se o texto contém "Picking List" / "Filtros aplicados" / cabeçalho `ID SKU NOME QTD`, usar o **modo tabela**. Senão, mantém o modo heurístico antigo (compat).
- **Modo tabela — extração de QTD correta**:
  - QTD = **último número inteiro isolado** da linha (regex `/(\d+)\s*$/` com tolerância a espaços/quebras).
  - ID = primeiro número de 7 dígitos no início.
  - SKU = token entre ID e a descrição (até o primeiro espaço duplo ou início de "Cortina ").
- **Multi-linha**: linhas que quebram (descrição longa) são juntadas até encontrar a próxima linha que começa com ID de 7 dígitos.
- **Total de validação**: ao encontrar "Total 95" no rodapé, comparar com a soma das QTDs extraídas. Se diferir, marcar a importação como "atenção" no diálogo de revisão.

### 2. Trazer tudo para a tela de revisão (`PdfReviewDialog.tsx`)

- Não descartar SKUs desconhecidos no parser. Em vez disso:
  - SKUs reconhecidos (match em `SKU_PREFIXES`) → vêm marcados ✓ e com modelo/cor preenchidos.
  - SKUs não reconhecidos (ex: `63049100-PRETO-90CM`, `CE--Cinza`, `CBTS-SOBMED-BRANCO-4M`) → vêm com badge "não reconhecido" e **desmarcados por padrão**, mas visíveis.
- Cada linha tem checkbox para incluir/excluir. Botão "Marcar todos reconhecidos" / "Desmarcar todos".
- Coluna de QTD editável (já existe, mantém).
- Rodapé do diálogo mostra: `X de Y itens · Z unidades · Total na lista: N` (com aviso vermelho se não bater).

### 3. Ajustes de robustez

- **`skuParser.ts`**: garantir que SKUs com hífen (`CBTS-SOBMED-...`, `CE--Cinza`) não quebrem a regex de extração de medidas — apenas retornar `null`/desconhecido para a UI lidar.
- **Edge function `parse-picking-pdf`**: alinhar o prompt da IA ao mesmo formato (QTD = última coluna), e instruir a retornar **todos** os SKUs (incluindo desconhecidos) com flag `recognized: boolean`.
- **Teste unitário** em `src/test/skuParser.test.ts` (ou novo `pdfParser.test.ts`) com fixture do PDF que você enviou: assert que CBTI220X130BEGE=1, CBTI220X130CHUMBO=4, CBTI220X130CINZA=5, total=95.

## Arquivos tocados

- `src/utils/pdfParser.ts` — reescrita do extrator (modo tabela)
- `src/components/PdfReviewDialog.tsx` — UI de revisão com itens não reconhecidos visíveis
- `src/utils/skuParser.ts` — tolerância a SKUs fora do padrão
- `supabase/functions/parse-picking-pdf/index.ts` — alinhar IA ao formato tabela
- `src/test/pdfParser.test.ts` (novo) — fixture + asserts da lista real

## Fora do escopo

- Auto-detectar/cadastrar novos prefixos de SKU (continua manual em `skuDatabase.ts`).
- Suporte a outros layouts de picking list além do da Kaizen — fica para quando aparecer outro formato.
