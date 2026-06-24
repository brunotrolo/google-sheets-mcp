# ⚡ QUICK START: Ative o Projeto em 5 Minutos

## 🚀 PASSO 1: Copie e Cole Este Prompt (Copiar: Ctrl+C)

```
Claude, ative o MODO PERITO ESPECIALISTA EM DERIVATIVOS B3.

Você está funcionando como um Engenheiro Financeiro Sênior, 
Algoritmo de Risco Institucional e Perito em Derivativos da B3.

ACESSO MCP (3 conectados):
• MCP 1: Banco AI → openfinance_list_accounts, openfinance_get_account_balance
• MCP 2: OpLab Oficial → get_quote, get_instrument_options, get_option
• MCP 3: Google Sheets Derivativos → get_cockpit_ativas, get_screener_quantitativo

SKILLS ATIVAS:
• Financial Analysis (P&L, MtM, breakeven, cenários)
• Data Analysis (consolidação, filtragem, scoring)
• Code Interpreter (Python + Bash para orquestração)

PARÂMETROS DE RISCO:
• Colchão mínimo de liquidez: 15%
• Limite de concentração: 20% por operação
• Delta alerta: < -0.40 em SHORT PUT
• DTE crítico: < 10 dias
• Patrimônio estimado: R$ 500.000

WHITELIST DE 24 ATIVOS:
B3SA3, BBAS3, BBDC4, BRAV3, BRKM5, CMIG4, CMIN3, COGN3, CSAN3, CSNA3, 
DIRR3, EMBJ3, FLRY3, GGBR4, ITSA4, ITUB4, NATU3, PETR4, PRIO3, PSSA3, 
SANB11, SUZB3, USIM5, VALE3

PROTOCOLOS DISPONÍVEIS:
1. Auditoria Quantitativa Diária (FORMATO 1)
2. Descoberta de Oportunidades (FORMATO 2)
3. Plano de Manejo (FORMATO 3)
4. Relatório Executivo (FORMATO 4)

Confirme ativação com: ✅ MODO ATIVADO
```

## 📌 PASSO 2: Cole no Chat Claude AI

1. Vá para: https://claude.ai (ou seu workspace Claude AI)
2. Nova conversa
3. Cole o prompt acima
4. Aperte ENTER

**Resposta esperada em segundos:**
```
✅ MODO ATIVADO
🔗 MCP 1 (Banco AI): ONLINE
🔗 MCP 2 (OpLab): ONLINE
🔗 MCP 3 (Google Sheets): ONLINE
📊 4 Protocolos Carregados
🎯 Pronto para Auditoria Quantitativa
```

---

## ⚡ PASSO 3: Primeiro Comando (Escolha Um)

### Opção A: Auditoria Rápida (Recomendado para primeiro uso)
Cole este prompt:

```
Claude, execute auditoria rápida:

1. Pull do Cockpit (Google Sheets) → 24 posições
2. Atualizar spots com OpLab
3. Validar saldo com Banco AI
4. Entregue FORMATO 1 resumido (apenas alertas)

Resumo de 10 linhas: P&L total, Theta daily, Colchão, Posições críticas.
```

**Tempo:** 2-3 minutos  
**Output:** Tabela simples com status ✅

---

### Opção B: Descoberta de Oportunidades
Cole este prompt:

```
Claude, descubra as 3 melhores oportunidades SHORT PUT:

Critérios:
• Delta: -0.15 a -0.30
• IV Rank: > 50%
• DTE: 15-30 dias
• Tendência: ALTA
• Whitelist: 24 ativos

Valide compliance (colchão 15%, concentração 20%).
Entregue resumo das 3 (Ticker | Strike | Prêmio | ROIC | Status).
```

**Tempo:** 3-4 minutos  
**Output:** 3 operações estruturadas

---

### Opção C: Status Crítico (Se tem alerta)
Cole este prompt:

```
Claude, situação crítica:

FLRY3 PUT (FLRYT167) está em alerta:
- Delta: -0,66 (acima do -0,40)
- DTE: 65 dias
- Spot saiu de R$ 16,73 → R$ 15,69 (ficou ITM)

Opções:
A) Assumir 1.000 ações
B) Rolar para JUL/17
C) Encerrar

Qual fazer? Calcule P&L de cada opção.
```

**Tempo:** 2-3 minutos  
**Output:** Recomendação executável

---

## 📊 PASSO 4: Próximos Passos Recomendados

### Dia 1:
- ✅ Ler FORMATO 1 (entender alertas)
- ✅ Validar que os 3 MCPs estão respondendo

### Dia 2-3:
- ✅ Executar primeira auditoria completa
- ✅ Avaliar se há posições em alerta
- ✅ Fazer uma rolagem recomendada

### Dia 4-7:
- ✅ Descobrir 3 oportunidades
- ✅ Decidir qual executar
- ✅ Medir P&L 1 semana depois

### Week 2+:
- ✅ Fazer auditoria diária
- ✅ Implementar rolagens conforme alerta
- ✅ Capturar theta diário de +R$ 4k

---

## 🎯 COMANDOS MAIS ÚTEIS (Bookmark Estes)

### Comando 1: Status 30 Segundos
```
Claude, 1 minuto. Posições em alerta?
```

### Comando 2: Descoberta Quick
```
Claude, TOP 3 oportunidades SHORT PUT hoje (Delta -0.15/-0.30, IV > 50%).
```

### Comando 3: Manejo de Posição
```
Claude, [TICKER] PUT em alerta. Opções: assumir / rolar / encerrar?
```

### Comando 4: Validação Pré-Execução
```
Claude, aprova venda de [QTD] contratos [TICKER] PUT strike [X]?
Colchão e concentração ok?
```

### Comando 5: Análise de Cenário
```
Claude, mercado cai 5%. P&L do portfólio? Qual posição mais afetada?
```

---

## ✅ CHECKLIST ATIVAÇÃO

- [ ] Claude AI aberto
- [ ] Prompt de ativação colado
- [ ] Resposta "MODO ATIVADO" recebida
- [ ] Primeiro comando executado (escolha A, B ou C)
- [ ] Resultado obtido
- [ ] Documentação salva em bookmarks:
  - [ ] ESPECIFICACAO_PROJETO_PERITO_DERIVATIVOS_B3.md
  - [ ] MANUAL_INSTRUCOES_PERITO_DERIVATIVOS.md
  - [ ] QUICK_START.md (este arquivo)

---

## 🚨 SE ALGO NÃO FUNCIONAR

### MCP Offline?
```
Claude, qual MCP está offline?
• Banco AI: online/offline?
• OpLab: online/offline?
• Google Sheets: online/offline?
```

### Números não batem?
```
Claude, por que VALE3 no FORMATO 1 mostra spot R$ 82,41 
mas OpLab mostra R$ 82,35?
```

### Não entendo um número?
```
Claude, explique em 1 parágrafo o que significa "Delta -0.67".
```

---

## 📈 PRIMEIRA SEMANA - TIMELINE

| Dia | Ação | Tempo |
|-----|------|-------|
| **D1** | Ativar projeto | 5 min |
| **D1** | Executar auditoria rápida | 3 min |
| **D2** | Ler FORMATO 1 completo | 10 min |
| **D3** | Identificar posição em alerta | 2 min |
| **D3** | Executar rolagem recomendada | 5 min |
| **D4-5** | Descoberta de oportunidades | 5 min |
| **D6** | Validar se foi aprovada | 1 min |
| **D7** | Avaliar P&L após 1 semana | 5 min |

**TOTAL TEMPO SEMANA 1:** ~45 minutos

---

## 💬 PRÓXIMO PASSO AGORA

1. **Copie o prompt de ativação** (acima, em verde)
2. **Vá para claude.ai**
3. **Cole o prompt**
4. **Aperte ENTER**
5. **Escolha Opção A, B ou C** (acima)

---

**Pronto! Em 5 minutos você terá o Perito Especialista rodando.** 🚀

Dúvidas? Releia a seção "SE ALGO NÃO FUNCIONAR" ou 
consulte o MANUAL_INSTRUCOES_PERITO_DERIVATIVOS.md (mais completo).
