# EtiquetasKaizen

Sistema de automação para geração de etiquetas de produção de cortinas Kaizen Enxovais.

## O que faz

- Importa picking list em PDF e extrai os itens automaticamente
- Parseia SKUs de cortinas calculando medidas de corte customizadas
- Gera etiquetas de produção em arquivo DOCX pronto para impressão
- Permite busca manual de cortinas por SKU

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (banco + Edge Functions)
- pdf.js para leitura de PDF
- docx para geração de Word
- Vitest + Playwright para testes

## Instalação local

Pré-requisitos: Node.js 18+ e conta no Supabase (gratuita)

```bash
git clone https://github.com/alissonrfp-cloud/etiquetaskaizen.git
cd etiquetaskaizen
npm install
```

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

```bash
npm run dev
```

Acesse http://localhost:5173

## Scripts disponíveis

- `npm run dev` — Servidor de desenvolvimento
- `npm run build` — Build de produção
- `npm test` — Roda todos os testes
- `npm run lint` — Verifica ESLint

## Fluxo de uso

1. Upload do PDF (picking list formato Kaizen)
2. Revisar itens extraídos (SKUs reconhecidos e não reconhecidos)
3. Exportar DOCX com etiquetas formatadas

## Estrutura

```
src/
├── pages/       Rotas (Index, PrintPage)
├── components/  Componentes React
├── utils/       Lógica core (pdfParser, skuParser, docxExport)
├── data/        Base de dados SKU e regras de cores
└── test/        Testes unitários
```

## Arquivos críticos

- `src/utils/pdfParser.ts` — extração de itens do PDF
- `src/utils/skuParser.ts` — parse de SKU e cálculo de medidas de corte
- `src/utils/docxExport.ts` — geração do documento Word
- `src/data/skuDatabase.ts` — base de prefixos e modelos de cortina
