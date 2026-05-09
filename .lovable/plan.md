## Tornar todos os campos da etiqueta editáveis

Hoje, na `LabelList`, só uma parte das colunas é editável (Remessa, Lote, Quant., Corte, Saída, Cortador, Overloque, Costura, OBS). As demais são texto fixo. Vou liberar **todas** elas para edição inline, mantendo cores, ordenação e auto-cálculos.

### Campos que passam a ser editáveis
- **Subdiv.** (texto livre, ex: "1 de 3")
- **Tamanho** (ex: "2,00 x 2,50")
- **Tamanho do Corte** (multilinha — vira `<textarea>` compacto, preserva quebras)
- **Modelo** (mantém cor da categoria)
- **Parte Superior** (mantém cor)
- **Cliente** (texto livre; se vazio e categoria = wilson, sugere "Wilson Crepaldi")
- **Retirada / Data de saída** (texto livre, padrão dd/mm)
- **#** continua não editável (é só índice da linha)

### Comportamento
- Edição **inline** (clique → digita → sai), igual ao padrão atual dos campos editáveis.
- **Foco estável**: a ordenação só recalcula quando muda o conjunto de linhas (já implementado via `useMemo` por `orderKey`); vou estender o `orderKey` para não depender de campos livres como `tamanho`/`modelo`, evitando reordenação no meio da digitação.
- **Cores preservadas**: `getLabelColors` continua sendo aplicado em cada célula; ao editar Modelo/Parte Superior, a cor recalcula no próximo render (categoria não muda só por trocar texto do modelo).
- **Multilinha** para "Tamanho do Corte": `<textarea>` com `rows={2}`, `whiteSpace: pre-line`, redimensionamento desativado.
- **Numeric vs texto**: Quant. continua numérico; Subdiv./Tamanho/Modelo etc. são texto livre (sem máscara, para não atrapalhar correções rápidas).
- **Tooltip** discreto em campos derivados (ex: "Tamanho do Corte" calculado automaticamente — ao editar manualmente, vira override e não recalcula mais).

### Detalhes técnicos
- `LabelList.tsx`:
  - Substituir as `<td>` estáticas de Subdiv., Tamanho, Tamanho do Corte, Modelo, Parte Superior, Cliente e Retirada por `EditableCell`.
  - Estender `EditableCell` com prop `multiline?: boolean` que troca `<input>` por `<textarea>` mantendo estilos.
  - Ajustar `orderKey` para usar apenas `id|categoria` (estável durante edição de campos livres).
- `Index.tsx` (`onUpdate`): já recebe `field: keyof ParsedLabel`. Garantir que aceita os novos campos (`tamanho`, `medidasCorte`, `modelo`, `parteSuperior`, `cliente`, `dataSaida`, `subdivisao`) — só passar adiante para `setLabels`.
- Marcar `medidasCorte` como "manualmente editado" usando flag opcional `medidasCorteManual?: boolean` em `ParsedLabel`, para o recalculador de corte (se houver) não sobrescrever.
- Sem mudança em DOCX/impressão: eles já leem os campos do estado, então passam a refletir as edições automaticamente.

### Arquivos tocados
- `src/components/LabelList.tsx` (principal)
- `src/utils/skuParser.ts` (adicionar `medidasCorteManual?: boolean` na interface)
- `src/pages/Index.tsx` (handler `onUpdate` — só verificação, provavelmente nenhuma mudança real)

### Fora do escopo
- Edição de Cortador/Overloque/Costura/Cliente em massa (fica para outra iteração).
- Validação rígida de formato (datas, dimensões) — o objetivo aqui é **liberar correções rápidas**, não restringir.
