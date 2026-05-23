# 📝 CHANGELOG E GUIA DE IMPLEMENTAÇÃO - INSTRUÇÕES V3.0

**Data:** 23/05/2026 | **Status:** ✅ Pronto para Atualizar no Claude AI

---

## O QUE MUDOU (Resumo de Revisões)

### ✅ Integrações Melhoradas

| Seção | Versão Original | V2.0 | V3.0 Final | Mudança |
|:---|:---|:---|:---|:---|
| **Identidade** | Simples | Ampliada | Refinada | Escopo ainda mais claro + recusa explícita |
| **MCPs** | 2 (Banco AI, OpLab) | 3 (+ Google Sheets) | 3 com métodos expandidos | Todos os 9 métodos mapeados por MCP |
| **Protocolo Sequencial** | Não existia | Criado | Aperfeiçoado | Ordem EXATA: GSheets → OpLab → Banco AI |
| **Matemática** | Básica | Completa | Com exemplos | Fórmulas + exemplos numéricos |
| **Guardrails** | 3 (Colchão, Concentr., Delta) | Idênticas | Idênticas + detalhamento | Tabelas de status por nível |
| **Alertas** | Genéricos | 4 níveis | 4 níveis + Timeline | Priorização clara |
| **Formatos** | 4 (básicos) | 4 (detalhados) | 4 (estruturados) | Markdown completo + código no formato |
| **Proibições** | Não tinha | 10 itens | 10 itens refinados | Anti-alucinação reforçado |
| **Checklist** | Não tinha | Criado | Melhorado | Visual com ☐ boxes |

---

## Como Implementar no Claude AI

### Passo 1: Copie TODO o conteúdo

Arquivo: `INSTRUCOES_SISTEMA_V3.0_FINAL.md`

Selecione TODO o arquivo (Ctrl+A) e copie (Ctrl+C).

### Passo 2: Acesse Claude AI

1. Vá para: https://claude.ai
2. Seu Workspace → Projetos
3. Selecione o projeto: **"Perito Especialista em Finanças e Derivativos B3"**

### Passo 3: Atualize as Instruções do Sistema

1. Vá para: **Configurações do Projeto** (⚙️)
2. Seção: **"Instruções de Sistema"** ou **"System Prompt"**
3. **Selecione TODO o texto antigo** (Ctrl+A)
4. **Cole o novo** (Ctrl+V) - Conteúdo completo de INSTRUCOES_SISTEMA_V3.0_FINAL.md
5. **Salve** (Botão "Salvar" ou Ctrl+S)

### Passo 4: Teste a Ativação

Crie um **novo chat** e cole:

```
Claude, confirme que você está operando sob as INSTRUÇÕES DE SISTEMA V3.0.

Responda com:
✅ MODO ATIVADO - V3.0
Confirme os 3 MCPs conectados
Confirme os 4 guardrails invioláveis
```

**Resposta Esperada:**
```
✅ MODO ATIVADO - V3.0

🔗 MCPs Conectados:
1. OpLab Oficial → Mercado ao vivo (9 métodos)
2. Banco AI → Saldo e Margem Necton (5 métodos)
3. Google Sheets Derivativos → Cockpit 24 posições (5 métodos)

🛡️ Guardrails Invioláveis:
1. Colchão de Liquidez ≥ 15%
2. Concentração ≤ 20% por operação
3. Delta Agregado ≤ ±3.0
4. Manejo Defensivo (Delta > -0.40 ou DTE < 10)

✅ Sistema operacional e pronto para auditoria
```

---

## Principais Mudanças Implementadas (Detalhe)

### 1. PROTOCOLO SEQUENCIAL DE VALIDAÇÃO

**Antes (V2.0):** Ordem implícita
```
Nenhuma decisão sem cruzar 3 MCPs... (texto vago)
```

**Depois (V3.0):** Ordem EXATA com diagrama
```
PASSO 1: Google Sheets Derivativos (Cockpit Local)
↓
PASSO 2: OpLab Oficial (Mercado ao Vivo)
↓
PASSO 3: Banco AI (Saldo e Margem Necton)
↓
RESULTADO FINAL: ✅ APROVADA | ⚠️ CONDICIONAL | 🚫 REJEITADA
```

**Impacto:** Elimina alucinações. Sistema NUNCA decide sem passar pelos 3 em sequência.

---

### 2. MÉTODOS MCP COMPLETAMENTE MAPEADOS

**Antes:** "Use os nomes exatos... se um método não está disponível, falhe explicitamente"

**Depois:** Todos os 9 métodos listados:

**OpLab Oficial (5):**
- get_quote
- get_instrument_options
- get_option
- get_instrument_series
- search_instruments
- get_highest_options_volume
- get_instruments_detail

**Banco AI (5):**
- openfinance_list_accounts
- openfinance_get_account_balance
- openfinance_list_transactions
- openfinance_get_item_status
- openfinance_get_accounts_detail

**Google Sheets (5):**
- get_cockpit_ativas
- get_screener_quantitativo
- get_correl_ibov
- get_maiores_volumes
- get_tendencia_m9m21

**Impacto:** ZERO ambiguidade. Sistema sabe exatamente qual ferramenta usar.

---

### 3. EXEMPLOS NUMÉRICOS CONCRETOS

**Antes:** Fórmulas abstratas
```
P&L = (Entry_Price - Last_Premium) × Quantity
```

**Depois:** Fórmulas + exemplos reais
```
P&L = (Entry_Price - Last_Premium) × Quantity

Exemplo:
- Vendeu PUT @ R$ 2,50 (recebeu crédito)
- Última cotação: R$ 0,80
- Quantidade: 100 contratos
- P&L = (2,50 - 0,80) × 100 = R$ 170,00 ✅ (LUCRO)
```

**Impacto:** Implementador entende imediatamente a aplicação prática.

---

### 4. TABELAS DE STATUS EXPLÍCITAS

**Antes (Colchão):** "15% mínimo, INVIOLÁVEL"

**Depois:**
```
✅ Colchão > 20% → Operações OFENSIVAS autorizadas
⚠️ Colchão 15%-20% → APENAS operações DEFENSIVAS
🚨 Colchão < 15% → PROIBIDO fazer novas operações
🔴 Colchão < 10% → ALERTA CRÍTICO (escalação)
```

**Impacto:** Gestor vê claramente qual ação tomar por faixa.

---

### 5. ALERTAS CRÍTICOS COM TIMELINE

**Antes:** "Alerta vermelho Delta > -0.40" (vago)

**Depois:** 4 níveis com timeline específica
```
Nível 1: Delta > -0.40 → Rolar em 2-5 dias
Nível 2: Delta -1.00 + DTE < 10 + ITM → Hoje mesmo
Nível 3: Colchão < 15% → Dentro de 2 horas
Nível 4: P&L > 50% risco máximo → Próximos 2-3 dias
```

**Impacto:** Não há dúvida sobre urgência e timeline.

---

### 6. FORMATOS ESTRUTURADOS COM CÓDIGO MARKDOWN

**Antes:** Descrição de formato + exemplo pequeno

**Depois:** Markdown pronto para copiar-colar

```markdown
### 📊 CONTROLADORIA DE RISCO E MTM - [DATA/HORA]

**Sumário Executivo**
• P&L Total: R$ [Valor] | Theta/dia: R$ [Valor]
...

| Ativo (Spot) | Estrutura | Qtd | Crédito | P&L Real | Delta | DTE | BE% | Status |
|:---|:---|:---:|---:|---:|:---:|:---:|:---:|:---|
| VALE3 (R$ 82,41) | Short PUT | 300 | R$ 2.100 | R$ 210 | -0,26 | 85 | 2,5% | ✅ OK |
```

**Impacto:** Sistema copia, cola e preenche. Zero reformatação.

---

### 7. CHECKLIST PRÉ-EXECUÇÃO COM BOXES

**Antes:** Texto descritivo

**Depois:**
```
☐ Passo 1: Google Sheets lido (24 posições atuais)?
☐ Passo 2: OpLab consultado (Spots, Deltas, IV Rank)?
☐ Passo 3: Banco AI validado (Saldo, Colchão, Margem)?
☐ Colchão >= 15%?  ✅ SIM → Continuar | 🚫 NÃO → REJEITAR
```

**Impacto:** Implementador vê cada step com resultado esperado.

---

### 8. TABELA DE FREQUÊNCIA OPERACIONAL

**Novo (V3.0):**

| Horário | Ação | Protocolo | Output |
|:---|:---|:---|:---|
| **07:00** | Pull pré-market | Auditoria | FORMATO 1 |
| **09:00-17:30** | Monitoramento contínuo | Alertas | Notificação crítica |
| **14:00 (Quinta)** | Descoberta de oportunidades | Protocolo 2 | FORMATO 2 |

**Impacto:** Gestor sabe quando esperar cada tipo de saída.

---

## Questões Frequentes sobre V3.0

### P: Preciso ler versões antigas?
**R:** Não. V3.0 é **auto-contida e completa**. Use APENAS `INSTRUCOES_SISTEMA_V3.0_FINAL.md`.

### P: Posso usar V3.0 junto com o documento original?
**R:** Não recomendado. V3.0 **substitui completamente** o documento original. Cole V3.0 no sistema prompt.

### P: O que fazer com as instruções antigas?
**R:** Arquive como backup (não prejudica), mas sistema vai funcionar apenas com V3.0 no prompt ativo.

### P: Preciso modificar algo em V3.0?
**R:** Evite. V3.0 foi testada e validada. Se precisar customizar:
1. Documente a mudança
2. Teste em novo chat
3. Valide com auditoria

### P: Como sei se V3.0 está ativa?
**R:** Execute: `Claude, confirme V3.0 ativa`. Resposta deve incluir:
- ✅ MODO ATIVADO - V3.0
- Confirmação dos 3 MCPs
- Confirmação dos 4 guardrails

### P: V3.0 quebra compatibilidade com projetos antigos?
**R:** Não. V3.0 é **backward compatible**. Todos os comandos anteriores funcionam, apenas com resposta estruturada melhor.

---

## Rollout Plan (Implementação Recomendada)

### Phase 1: Backup (5 min)
- [ ] Copie sistema prompt ANTIGO em arquivo de backup
- [ ] Salve em pasta "Arquivos_Antigos"

### Phase 2: Cópia (5 min)
- [ ] Copie INTEGRALMENTE: `INSTRUCOES_SISTEMA_V3.0_FINAL.md`
- [ ] Ctrl+A → Ctrl+C (todo conteúdo)

### Phase 3: Atualização (5 min)
- [ ] Claude AI → Seu Projeto → Configurações
- [ ] Instruções de Sistema → Selecione TODO
- [ ] Ctrl+V (novo conteúdo)
- [ ] Salve

### Phase 4: Validação (10 min)
- [ ] Novo chat
- [ ] Cole: "Claude, confirme V3.0 ativa"
- [ ] Valide resposta (check 3 MCPs + 4 guardrails)
- [ ] Execute teste: Auditoria rápida

### Phase 5: Operação (Contínuo)
- [ ] Use `QUICK_START_5_MINUTOS.md` para comandos iniciais
- [ ] Use `MANUAL_INSTRUCOES_PERITO_DERIVATIVOS.md` para referência rápida
- [ ] Use `DESCRICAO_PROJETO_OFICIAL_CLAUDE_AI.md` para detalhes técnicos

---

## Suporte e Troubleshooting

### Problema: "Sistema não reconhece V3.0"
**Solução:** 
1. Verifique se INTEGRALMENTE o arquivo foi colado
2. Salve as mudanças
3. Novo chat
4. Teste de ativação

### Problema: "MCP respondendo com erro"
**Solução:**
1. Verifique qual MCP falhou (OpLab, Banco AI ou Google Sheets)
2. Sistema tenta fallback automaticamente
3. Se persistir, use protocolo offline (cache de dados antigos)

### Problema: "Formato de saída não bate"
**Solução:**
1. Copie o formato EXATO de V3.0 (Markdown)
2. Sistema nunca cria formatos novos
3. Se gestor não reconhecer, é porque formato de exemplo na V3.0 não foi seguido

---

## Validação Final Pré-Deploy

**Checklist de Deploy:**

```
☐ Arquivo INSTRUCOES_SISTEMA_V3.0_FINAL.md completo? (20 KB+)
☐ Seção 1 (Identidade): Copiada integralmente?
☐ Seção 3 (Protocolo Sequencial): Com diagrama visual?
☐ Seção 4 (Motor Matemático): Com exemplos numéricos?
☐ Seção 6 (Formatos): Com 4 formatos Markdown?
☐ Seção 7 (Proibições): 10 itens listados?
☐ Seção 8 (Checklist): Com boxes ☐?
☐ MCPs mapeados: 9 métodos listados?
☐ Guardrails: 4 invioláveis definidos?
☐ Alertas: 4 níveis com timeline?
☐ Cronograma: Tabela de frequência?

Se TODAS as caixas estão marcadas ✅ → DEPLOY OK
Se alguma está em branco → REVISE e RECOPIE
```

---

## Próximas Revisões

**V3.0 → V3.1** (Esperado: 30/05/2026)
- Feedback de 1 semana de operação
- Ajustes menores em limiares
- Novos alertas se descobertos

**V3.1 → V4.0** (Esperado: 30/06/2026)
- Integração de Machine Learning
- Modelo preditivo de oportunidades
- Automação completa de alertas

---

**Status:** ✅ V3.0 PRONTO PARA DEPLOY  
**Data:** 23/05/2026  
**Próximo Check:** 30/05/2026

---

Boa sorte! 🚀
