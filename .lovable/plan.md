

## Plano: App Gerador de Etiquetas de Cortinas

### O que sera construido

Um app web onde o operador digita SKU + Quantidade, e a etiqueta e gerada automaticamente com cores nos campos, pronta para exportar como DOCX e imprimir.

### Fluxo do usuario

```text
1. Digita o SKU (com autocomplete) + Quantidade
2. App decodifica o SKU e preenche todos os campos automaticamente
3. Preview da etiqueta aparece na tela com as cores aplicadas
4. Pode adicionar mais SKUs (lista de etiquetas)
5. Clica "Exportar DOCX" e baixa o arquivo formatado com cores
```

### Estrutura do SKU (decodificacao automatica)

O SKU segue o padrao: `PREFIXO + LARGURA + X + ALTURA + COR`

Exemplo: `CBTS300X270BRANCO`
- **CBTS** = Black-out Basic com Trilho Suico (Parte Superior = Trilho Suico)
- **300X270** = 3,00m x 2,70m
- **BRANCO** = cor do tecido

Prefixos mapeados:
| Prefixo | Modelo | Parte Superior |
|---------|--------|---------------|
| CBTI | Black-out Basic | Ilhos Redondo Cromado |
| CBTS | Black-out Basic | Trilho Suico |
| CBTW | Black-out Basic | Wave |
| CGLI | Gaze de Linho | Ilhos Redondo Cromado |
| CGLS | Gaze de Linho | Trilho Suico |
| CGLW | Gaze de Linho | Wave |
| CDGLBI | Dupla Flam c/ Blackout Premium | Ilhos Redondo Cromado |
| CDGLMI | Dupla Flam c/ Microfibra Premium | Ilhos Redondo Cromado |
| CDGLBW | Dupla Flam c/ Blackout Premium | Wave |
| CDGLMW | Dupla Flam c/ Microfibra Premium | Wave |

Calculos automaticos:
- **Medidas do Corte**: largura/2 + 10cm x altura + 10cm (ex: 3,00m → 2 partes de 1,60m x 2,80m)
- **Parte Inferior**: sempre "Bainha"

### Cores padrao (editaveis depois)

Campos que recebem cor de fundo na celula da etiqueta:
- **Modelo** (tipo de tecido): Blackout = cinza claro, Gaze de Linho = bege claro, Dupla = rosa claro
- **Parte Superior**: Trilho Suico = azul, Ilhos = verde, Wave = laranja
- **Cor do tecido**: Branco = branco, Preto = cinza escuro, Chumbo = cinza medio, etc. (borda ou tag colorida)

### Campos da etiqueta

| Campo | Fonte | Colorido? |
|-------|-------|-----------|
| Remessa | Data de hoje (editavel) | Nao |
| Quant. | Digitado pelo usuario | Nao |
| Tamanho | Decodificado do SKU | Nao |
| Medidas do Corte | Calculado | Nao |
| Modelo | Decodificado (ex: "Blackout Branco") | Sim |
| Parte Inferior | Sempre "Bainha" | Sim |
| Parte Superior | Decodificado do prefixo | Sim |
| Cliente | Padrao "Kaizen Enxovais" | Nao |
| OBS | Campo livre | Nao |

### Arquivos a criar/modificar

1. **`src/data/skuDatabase.ts`** - Base de dados dos SKUs com todos os prefixos, cores e regras de decodificacao. Inclui os 800+ SKUs da planilha como lookup e a logica de parse do SKU.

2. **`src/data/colorRules.ts`** - Mapeamento de cores para cada campo (Modelo, Parte Superior, Parte Inferior). Cores padrao iniciais faceis de ajustar.

3. **`src/pages/Index.tsx`** - Pagina principal com:
   - Campo de input SKU com autocomplete/busca
   - Campo de quantidade
   - Botao "Adicionar"
   - Preview da etiqueta com cores
   - Lista de etiquetas adicionadas
   - Botao "Exportar DOCX"

4. **`src/components/SkuInput.tsx`** - Componente de input com autocomplete que busca na base de SKUs

5. **`src/components/LabelPreview.tsx`** - Preview visual da etiqueta com as cores aplicadas (tabela estilizada)

6. **`src/components/LabelList.tsx`** - Lista de todas as etiquetas adicionadas, com opcao de remover

7. **`src/utils/skuParser.ts`** - Logica de decodificacao do SKU (extrair prefixo, dimensoes, cor, calcular medidas de corte)

8. **`src/utils/docxExport.ts`** - Geracao do arquivo DOCX usando a biblioteca `docx` (npm), com tabelas coloridas formatadas identicamente a planilha ETIQUETAS

### Dependencias

- `docx` (npm) - para gerar o .docx no browser
- `file-saver` - para download do arquivo gerado

### Resultado

O operador digita apenas **SKU + Quantidade**, e o app preenche tudo automaticamente com cores. Exporta um DOCX formatado pronto para imprimir e colar nas trouxas.

