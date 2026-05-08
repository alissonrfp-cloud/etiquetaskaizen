// Edge function: extract SKU + quantidade pairs from a picking-list PDF using Lovable AI.
// Accepts JSON: { textContent?: string, pdfBase64?: string }
// Returns: { items: [{ sku: string, quantidade: number }] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KNOWN_PREFIXES = [
  "CDGLBI", "CDGLMI", "CDGLBW", "CDGLMW", "CDGLBS", "CDGLMS", "CDGLBD", "CDGLMD",
  "CBTI", "CBTS", "CBTW", "CBTD",
  "CGLI", "CGLS", "CGLW", "CGLD",
  "COXF",
];

const KNOWN_COLORS = ["BRANCO", "BEGE", "CHUMBO", "CINZA", "PALHA", "PRETO", "TABACO"];

const SYSTEM_PROMPT = `Você é um extrator de dados de listas de picking (separação) de cortinas da Kaizen Enxovais.

Sua tarefa: identificar TODOS os itens de cortina no documento e retornar pares { sku, quantidade }.

Estrutura do SKU: PREFIXO + LARGURA + "X" + ALTURA + COR
- Prefixos válidos: ${KNOWN_PREFIXES.join(", ")}
- Cores válidas: ${KNOWN_COLORS.join(", ")}
- Largura e altura são números inteiros em cm (ex: 300X270)
- Exemplos válidos: CBTS300X270BRANCO, CDGLBI200X250CHUMBO, CGLW400X230BEGE

Regras:
1. SEMPRE retorne o SKU em MAIÚSCULAS, sem espaços nem hífens.
2. A quantidade é o número de unidades a produzir/separar daquela linha.
3. IGNORE linhas de cabeçalho, totais, rodapés, observações ou produtos que NÃO tenham um prefixo válido.
4. Se um item aparecer múltiplas vezes em linhas separadas, retorne uma entrada para cada linha (não some).
5. Se a cor estiver descrita por extenso na descrição (ex: "Cortina Blackout Branco"), combine com o prefixo+dimensões para montar o SKU completo.
6. NUNCA invente SKUs. Se não conseguir identificar prefixo+dimensão+cor com confiança, omita o item.
7. Se houver código de barras ou referência interna no formato de um SKU válido, use-o.`;

const tools = [
  {
    type: "function",
    function: {
      name: "extract_picking_items",
      description: "Retorna a lista de itens (SKU + quantidade) extraídos do documento.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sku: { type: "string", description: "SKU completo em MAIÚSCULAS" },
                quantidade: { type: "integer", minimum: 1, maximum: 9999 },
              },
              required: ["sku", "quantidade"],
              additionalProperties: false,
            },
          },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { textContent, pdfBase64 } = await req.json();

    if (!textContent && !pdfBase64) {
      return new Response(JSON.stringify({ error: "textContent or pdfBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user message: prefer text (cheaper, faster). Fallback to PDF inline for OCR.
    const userContent: any[] = [];

    if (textContent && typeof textContent === "string" && textContent.trim().length > 0) {
      userContent.push({
        type: "text",
        text: `Texto extraído da lista de picking abaixo. Retorne todos os itens via a função extract_picking_items.\n\n---\n${textContent.slice(0, 60000)}`,
      });
    } else if (pdfBase64) {
      userContent.push({
        type: "text",
        text: "PDF da lista de picking abaixo (use OCR/visão). Retorne todos os itens via a função extract_picking_items.",
      });
      userContent.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_picking_items" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { items: { sku: string; quantidade: number }[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", toolCall.function.arguments);
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Light server-side validation: keep only items with a known prefix.
    const items = (parsed.items || []).filter((it) => {
      if (!it?.sku || typeof it.sku !== "string") return false;
      const upper = it.sku.toUpperCase();
      return KNOWN_PREFIXES.some((p) => upper.startsWith(p));
    }).map((it) => ({ sku: it.sku.toUpperCase(), quantidade: it.quantidade }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-picking-pdf error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
