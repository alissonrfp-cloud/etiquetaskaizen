# Auditoria — pontos encontrados e plano de refinamento

Revisei: `pdfParser.ts`, `parse-picking-pdf` (edge function), `PdfUpload.tsx`, `LabelList.tsx`, `docxExport.ts`, `PrintPage.tsx` e `skuParser.ts` / `skuDatabase.ts`.

---

## 1. Importação de PDF

### Problemas encontrados

1. **Lista de prefixos duplicada em 3 lugares** (`pdfParser.ts`, `parse-picking-pdf/index.ts`, `skuDatabase.ts`). Quando alguém adiciona um prefixo novo no catálogo, a importação ignora silenciosamente. Causa raiz dos "SKUs não reconhecidos".
2. **Quantidade frágil**: o regex `(\d+)\s*$` pega o último número da linha. Em layouts que terminam com código de barras, valor unitário ou peso, ele captura o número errado e gera quantidade absurda (ex.: 2390 em vez de 5).
3. **Sem revisão antes de inserir**: as etiquetas são criadas direto no estado. Se a IA errar uma quantidade, o usuário só descobre olhando a lista item por item.
4. **Sem suporte a múltiplos PDFs / drag-and-drop**: precisa importar um por um.
5. **Sem deduplicação**: o mesmo SKU em páginas diferentes vira duas linhas; deveria somar (com aviso).
6. **AI/OCR só lê 1 página**: o fallback `image_url` envia o PDF inteiro como uma imagem só. Em PDFs escaneados de várias páginas, só a primeira é processada.
7. **Mensagem de erro genérica**: quando o parser falha, não diz *qual* SKU não foi reconhecido nem *por quê* (prefixo desconhecido vs. cor inválida vs. dimensão fora do padrão).

### Mudanças propostas

- Criar `src/data/skuDatabase.ts` como **fonte única** de prefixos e cores; `pdfParser.ts` e a edge function passam a importar/derivar dessa lista (a edge function recebe a lista no body do request, evitando ficar fora de sincronia).
- **Heurística de quantidade mais robusta**: identificar a coluna de quantidade pela posição X dos cabeçalhos (`QTD`, `QUANT`, `UNID`) quando detectáveis; fallback para "menor número inteiro razoável após o SKU" (1–999) e ignorar números > 9999 ou < 1.
- **Diálogo de revisão pós-extração**: tabela editável com SKU + quantidade + status (✓ reconhecido / ⚠ não reconhecido). Usuário pode corrigir antes de "Confirmar e adicionar".
- **Multi-arquivo + drag-and-drop** no botão de importar.
- **Deduplicação opcional**: agrupar SKUs idênticos somando quantidades, com toggle no diálogo de revisão.
- **OCR página por página**: renderizar cada página do PDF como imagem PNG via `pdf.js` e enviar como conteúdo multimodal (`image_url[]`) — captura todas as páginas em PDFs escaneados.
- **Mensagens específicas** por motivo de falha (prefixo, cor, dimensão).

---

## 2. Lista de etiquetas

### Problemas encontrados

1. **Campos não tipados** (`cortador`, `overloque`, `costura`, `saidaInicio`) acessados via `(label as any).campo`. Eles **se perdem** quando a etiqueta é re-criada (ex.: ao subdividir/aglutinar via `splitIntoLots`).
2. **Foco do input some**: `LabelList` re-ordena por modelo a cada render; quando o usuário digita em "Cortador", a linha pode mudar de posição e perder foco.
3. **Edição limitada**: não dá para corrigir Remessa, Lote, Quantidade, Saída ou OBS direto na tabela — precisa apagar e recriar.
4. **Sem agrupamento visual**: lotes do mesmo modelo aparecem misturados com outros — dificulta conferência.
5. **OBS truncada**: campo aparece como "—" quando vazia, mas quando preenchido pode estourar a célula sem `whiteSpace: pre-line`.

### Mudanças propostas

- Adicionar campos opcionais `cortador?`, `overloque?`, `costura?`, `saidaInicio?` na interface `ParsedLabel` (com persistência via `localStorage`).
- **Travar a ordem da lista** durante edição (memoizar com `useMemo` baseado em `labels.length` + IDs, não em conteúdo dos campos editáveis).
- Tornar **Remessa, Lote, Quantidade, Saída, OBS editáveis** inline na lista (mesmo padrão do `EditableCell`).
- Agrupar visualmente por modelo (separador sutil entre grupos, mantendo a tabela única).
- OBS com `whiteSpace: pre-line` e largura mínima.

---

## 3. Exportação DOCX e Impressão

### Problemas encontrados

1. **Ordem divergente**: `LabelList` mostra ordenado por modelo; `exportToDocx` exporta na ordem original. O usuário vê uma coisa na tela e outra no arquivo.
2. **Coluna OBS ausente** no DOCX e na lista impressa.
3. **Linha TOTAL invisível**: fundo branco + texto preto sem borda destacada; some no meio da tabela.
4. **Etiquetas 3cm com colunas espremidas**: `width: 3.5%` para Corte e Quantidade, em A4 paisagem, dá cerca de 10mm — texto fica cortado quando "Subdiv." vira "10 de 12".
5. **Cabeçalho ausente na impressão**: nenhuma página identifica Remessa/Data/Cliente; ao imprimir várias páginas, perde-se referência.
6. **Emoji ⚠ na coluna Saída**: nem toda fonte do Word renderiza; aparece como quadrado vazio em alguns ambientes.
7. **DOCX page size**: `orientation: undefined` com `width > height` — funciona mas `docx-js` espera `orientation: PageOrientation.LANDSCAPE` explícito.

### Mudanças propostas

- Ordenar `labels` por modelo (mesmo critério do `LabelList`) antes de gerar DOCX e antes da impressão.
- Adicionar coluna **OBS** opcional (só aparece se algum item tiver OBS preenchida) tanto no DOCX quanto na lista impressa.
- Linha TOTAL com fundo cinza claro (`#E5E7EB`) e texto bold maior — destaque visual.
- Recalcular larguras das etiquetas 3cm: Corte/Subdiv ficam com `minWidth: 45px` em vez de %; Tamanho do Corte continua flexível.
- **Cabeçalho de página na impressão**: "Kaizen Enxovais — Remessa X — Data Y — Cliente Z — N etiquetas / N un" no topo, repetido em cada página via `@page` margins + `<thead>` repetido.
- Trocar ⚠ por **fundo vermelho** na célula Saída quando `urgente: true` (já é assim na tela; replicar no DOCX).
- Definir `orientation: PageOrientation.LANDSCAPE` explicitamente no DOCX.

---

## Detalhes técnicos (resumo de arquivos tocados)

```
src/data/skuDatabase.ts        → fonte única (já existe; expandir export)
src/utils/pdfParser.ts         → quantidade robusta + dedup + multi-página OCR
src/utils/skuParser.ts         → tipar cortador/overloque/costura/saidaInicio
src/components/PdfUpload.tsx   → multi-file + drag-drop + diálogo de revisão
src/components/LabelList.tsx   → edição inline ampliada + ordem estável
src/utils/docxExport.ts        → ordenar, OBS, TOTAL destacado, cabeçalho
src/pages/PrintPage.tsx        → cabeçalho de página + larguras das etiquetas
supabase/functions/parse-picking-pdf/index.ts
                               → receber prefixos do client + multi-página
```

Novo componente: `src/components/PdfReviewDialog.tsx` (revisar/editar antes de inserir).

---

## Ordem de execução sugerida

1. **Fundamentos** (rápido, baixo risco): tipar campos extras, ordenar export, OBS no DOCX, TOTAL destacado, fonte única de prefixos.
2. **Importação confiável**: revisão pós-extração, quantidade robusta, mensagens específicas.
3. **Quality of life**: multi-PDF, drag-drop, dedup, OCR multi-página, edição ampliada na lista, cabeçalho de impressão.

Posso fazer tudo numa rodada só, ou se preferir entrego em fases (1 → 2 → 3) para você validar entre elas.
