# Importação de PDF confiável com IA

## Problema

O parser atual (`src/utils/pdfParser.ts`) depende de regex e de uma lista fixa de prefixos/cores. Como os PDFs vêm de sistemas variados, qualquer mudança de layout (colunas mescladas, descrição em outra linha, espaçamento diferente) resulta em SKUs não reconhecidos.

Regex sozinho não escala para múltiplos formatos. A solução robusta é deixar uma LLM normalizar o texto extraído em uma lista estruturada de `{sku, quantidade}`.

## Solução proposta

Pipeline em 3 camadas, do mais barato ao mais robusto:

1. **Extração de texto local (pdf.js)** — mantém o que já existe, mas simplifica: extrai todo o texto da página preservando linhas (Y) e ordem (X), sem tentar adivinhar SKU ainda.
2. **Parser heurístico atual** — roda primeiro como tentativa rápida e gratuita.
3. **Fallback via Lovable AI Gateway** — se o heurístico encontrar **menos itens que o esperado** (ou zero), envia o texto extraído para o modelo `google/gemini-2.5-flash` com *structured output* (tool calling) pedindo a lista de pares `{sku, quantidade}`. Para PDFs escaneados (sem texto), envia o PDF como `inline_data` para OCR via visão.

A IA recebe instruções com:
- Lista de prefixos válidos (`CDGLBI`, `CBTS`, etc.)
- Lista de cores válidas
- Formato esperado: `PREFIXO + LARGURA + X + ALTURA + COR`
- Exemplos de SKUs corretos
- Instrução para ignorar linhas de cabeçalho/rodapé/total

Cada SKU retornado pela IA ainda passa pelo `createLabel` existente, que valida contra `skuDatabase`. SKUs inválidos viram a lista de erros já mostrada no toast.

## Mudanças

1. **Habilitar Lovable Cloud** (necessário para usar o AI Gateway sem expor chave). Único pré-requisito de infra.
2. **Edge function `parse-picking-pdf`** — recebe o PDF (base64) + texto pré-extraído, chama Gemini com schema estruturado, retorna `{items: [{sku, quantidade}]}`. Mantém a chave `LOVABLE_API_KEY` no servidor.
3. **`src/utils/pdfParser.ts`** — refatorado:
   - Mantém extração local e regex como *fast path*.
   - Se resultado < 1 item OU usuário marcar opção "modo IA", chama a edge function.
   - Mescla resultados, deduplica por SKU.
4. **`src/components/PdfUpload.tsx`** — adiciona toggle "Usar IA (mais preciso)" e indicador de progresso quando estiver chamando a IA. Toast melhorado mostrando contagem de itens lidos por cada método.

## Detalhes técnicos

- Modelo: `google/gemini-2.5-flash` (rápido e barato; suporta visão para PDFs escaneados).
- Structured output via tool calling com schema:
  ```
  { items: [{ sku: string, quantidade: number }] }
  ```
- Limite: PDFs até ~20 páginas processados em uma chamada; acima disso a função divide em lotes.
- Custo: ~1 chamada por importação. Usuário precisa ter créditos de Workspace AI.
- Sem mudanças em `skuParser.ts`, `Index.tsx`, ou no fluxo de etiquetas — a confiabilidade ganha é isolada na camada de parsing.

## Resultado esperado

- PDFs do layout atual: continuam funcionando instantaneamente (fast path).
- PDFs novos/diferentes: a IA extrai os SKUs mesmo com layouts não vistos.
- PDFs escaneados (imagem): OCR via visão da Gemini resolve.
- SKUs inválidos: continuam sinalizados como erro (não inventamos SKU).
