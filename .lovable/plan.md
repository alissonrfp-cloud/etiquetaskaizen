

## Persistir etiquetas ao navegar entre páginas

Hoje as etiquetas vivem apenas no `useState` do `Index.tsx`. Quando você vai para `/imprimir` e volta, o componente é remontado e o estado é zerado. A solução é salvar a lista no `localStorage` do navegador, que persiste entre navegações, recarregamentos e até reinícios do navegador.

### O que será feito

1. **Criar hook `useLocalStorage`** em `src/hooks/use-local-storage.ts`
   - Wrapper de `useState` que lê/escreve automaticamente em `localStorage`.
   - Tratamento de erros (JSON inválido, storage cheio).

2. **Aplicar no `src/pages/Index.tsx`**
   - Trocar `useState<ParsedLabel[]>([])` por `useLocalStorage<ParsedLabel[]>("kaizen-labels", [])`.
   - Persistir também o estado de subdivisão ativa (`useLocalStorage("kaizen-subdivisao", true)`) para manter a preferência.

3. **Botão "Limpar tudo"**
   - Adicionar botão discreto ao lado do contador de etiquetas para limpar a lista quando o usuário quiser começar do zero (com confirmação via `AlertDialog`).
   - Necessário porque, com persistência, a lista nunca mais some sozinha.

4. **Migração segura na leitura do `PrintPage`**
   - `PrintPage` continua recebendo as etiquetas via `location.state`, mas como fallback, lerá do `localStorage` caso o usuário recarregue a página de impressão diretamente.

### Comportamento resultante

- Ir para `/imprimir` e voltar: lista intacta.
- Recarregar a página (F5): lista intacta.
- Fechar e reabrir o navegador: lista intacta.
- Botão "Limpar tudo" para resetar manualmente quando terminar um lote de produção.

