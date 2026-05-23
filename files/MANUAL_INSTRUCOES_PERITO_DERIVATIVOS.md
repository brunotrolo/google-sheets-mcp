# 📖 MANUAL DE INSTRUÇÕES E GUIA DE USO
## Perito Especialista em Finanças e Derivativos B3

**Versão:** 1.0 | **Data:** 23/05/2026 | **Público-Alvo:** Gestores e Operadores

---

## 🎯 COMO UTILIZAR O SISTEMA

### Passo 1: Inicializar o Projeto
No chat do Claude AI, utilize o prompt de ativação:

```
"Claude, ative o modo PERITO ESPECIALISTA EM DERIVATIVOS B3. 
Você está atuando como um engenheiro financeiro sênior com acesso aos MCPs:
- Banco AI (Necton - saldo e margem)
- OpLab Oficial (preços e gregas)
- Google Sheets Derivativos (cockpit de posições)

Inclua todas as skills de análise financeira e execute os protocolos conforme solicitado."
```

**Resposta Esperada:**
```
✅ MODO ATIVADO
🔗 MCPs Conectados: 3/3
📊 Skills Carregadas: Financial Analysis + Data Analysis + Code Interpreter
🚀 Pronto para Auditoria Quantitativa
```

---

## 📋 COMANDOS PRINCIPAIS

### COMANDO 1: Auditoria Diária Completa
**Quando usar:** Todos os dias no início do pregão  
**Tempo estimado:** 3-5 minutos  

```
"Claude, execute o protocolo de auditoria quantitativa. 
Use o MCP Google Sheets para puxar as 24 posições ativas do Cockpit, 
cruze com OpLab para atualizar spots e deltas, 
valide saldo com Banco AI, 
e entregue o FORMATO 1 (Controladoria de Risco e MtM)."
```

**O que esperar:**
- ✅ Tabela completa de 24 posições
- ✅ P&L atualizado
- ✅ Alertas críticos destacados em 🚨
- ✅ Recomendações de manejo por posição

**Output Padrão: FORMATO 1**

---

### COMANDO 2: Descoberta de Oportunidades
**Quando usar:** Quando quer capturar prêmios gordos em IV elevado  
**Frequência:** Semanal ou on-demand  

```
"Claude, execute o protocolo de descoberta quantitativa. 
Utilize o MCP OpLab para varrer as 24 ativos whitelisted, 
identifique SHORT PUTs com Delta -0.15 a -0.30, IV Rank > 50%, 
valide compliance contra Banco AI, 
e entregue as TOP 3 oportunidades em FORMATO 2."
```

**O que esperar:**
- ✅ 3 operações estruturadas com premios atrativos
- ✅ Matemática financeira completa (ROIC, BE, margem)
- ✅ Parecer de compliance (aprovado / condicional)
- ✅ Análise técnica de cada ativo

**Output Padrão: FORMATO 2**

---

### COMANDO 3: Plano de Manejo e Defesa
**Quando usar:** Quando uma posição dispara alerta (Delta > -0.40 ou DTE < 10)  
**Urgência:** IMEDIATA  

```
"Claude, execute o protocolo de otimização de risco. 
Identifique todas as posições com Delta > -0.40 ou DTE < 10 dias, 
recomende rolagens defensivas (reduzindo Delta para -0.35), 
calcule créditos residuais, 
e entregue o FORMATO 3 (Plano de Manejo com impacto em caixa)."
```

**O que esperar:**
- ✅ Lista de posições críticas em prioridade
- ✅ Recomendação específica por posição (Assumir / Rolar / Encerrar)
- ✅ Novo strike e delta-alvo para rolagens
- ✅ Impacto no saldo Necton (R$ liberado ou consumido)

**Output Padrão: FORMATO 3**

---

### COMANDO 4: Validação de Compliance Pré-Execução
**Quando usar:** ANTES de executar qualquer operação nova  
**Crítico:** Sempre fazer esse check  

```
"Claude, valide a operação de venda de PUT a seco: 
Ticker: USIM5, Quantidade: 20 contratos, Strike: R$ 9.19, 
Crédito esperado: R$ 340, Risco máximo: R$ 2.784.

Cruze com Banco AI para verificar:
1. Colchão de liquidez >= 15%
2. Concentração <= 20%
3. Margem suficiente
4. Delta agregado do portfólio

Retorne APROVADA ou REJEITADA com motivo."
```

**O que esperar:**
```
✅ OPERAÇÃO APROVADA

Validações:
• Colchão pós-operação: 5.26% → 6.58% (ainda abaixo de 15%)
  ⚠️ RECOMENDAÇÃO: Executar apenas após capitalização de +R$ 50k
• Concentração: 2,82% ✅
• Margem: Suficiente ✅
```

**Output Padrão: Parecer de Compliance (Sim/Não)**

---

### COMANDO 5: Análise de Cenários (Base/Adverso/Otimista)
**Quando usar:** Para tomar decisões estratégicas sobre rebalance  
**Frequência:** Mensal ou antes de escalação de risco  

```
"Claude, simule 3 cenários para o portfólio atual:

CENÁRIO BASE: Spot se move +1% em cada ativo (volatilidade normal)
CENÁRIO ADVERSO: Mercado cai -5% (risco sistêmico)
CENÁRIO OTIMISTA: Rally de +3% (suprimento de liquidez)

Para cada cenário, calcule:
1. P&L agregado
2. Deltas em cada posição
3. Quantas posições ficam ITM
4. Colchão de liquidez final
5. Necessidade de manejo

Entregue em FORMATO 4 (Relatório Executivo de Cenários)."
```

**O que esperar:**
- ✅ Tabela comparativa dos 3 cenários
- ✅ P&L range (-X a +Y)
- ✅ Posições mais sensíveis
- ✅ Recomendações de hedge por cenário

**Output Padrão: FORMATO 4**

---

## 🔧 COMANDOS AVANÇADOS

### COMANDO A: Backtesting de Recomendações
**Quando usar:** Para calibrar acurácia do sistema  
**Objetivo:** Validar se recomendações históricas foram corretas  

```
"Claude, faça backtest das recomendações geradas nos últimos 30 dias.

Para cada posição que foi encerrada:
1. Qual era a recomendação dada naquele momento?
2. Qual foi o P&L real se tivesse sido seguida?
3. Qual foi o P&L que realmente ocorreu?
4. Calcule acurácia (recomendação ajudou sim/não)

Entregue relatório com taxa de acurácia e top erros."
```

---

### COMANDO B: Simulação de Rolagem
**Quando usar:** Para testar se uma rolagem específica faz sentido  

```
"Claude, simule a rolagem da posição FLRYT167 (FLRY3 PUT Venda).

Situação atual:
- Strike atual: R$ 16,73
- Spot: R$ 15,69
- DTE restante: 65 dias
- Delta: -0,66
- P&L: -R$ 30

Cenário de rolagem (para JUL/17):
- Novo strike (recomendado -1%): R$ 16,55
- Crédito residual esperado: R$ 180
- Novo delta esperado: -0,35

Perguntas:
1. Melhora o colchão de liquidez?
2. Reduz exposição (Delta)?
3. Vale a pena ou é melhor encerrar?

Recomendação final."
```

---

### COMANDO C: Análise de IV Surface
**Quando usar:** Para identificar distorções de volatilidade exploráveis  

```
"Claude, analise a superfície de volatilidade implícita dos 24 ativos.

Para cada ativo:
1. Puxe a cadeia completa de opções (OpLab)
2. Calcule IV Rank para cada strike
3. Identifique picos de IV (anomalias)
4. Recomende onde vender prêmio vs. comprar proteção

Foco: Quais puts estão pagando anormalmente bem?
Resultado: Lista de oportunidades por IV Rank descrescente."
```

---

## 📊 INTERPRETANDO OS FORMATOS

### FORMATO 1: Controladoria de Risco

**Seção A - Tabela de Posições**
```
| Ativo | Estrutura | Qtd | Crédito | P&L | Delta | DTE | BE% | Status |
|-------|-----------|-----|---------|-----|-------|-----|-----|--------|
| SANB11| SHORT PUT | 500 | R$128k | -R$44k | -0,67 | 105 | -14,85% | ⚠️ DELTA ALTO |
```

**Como ler:**
- ✅ Verde/OK = Delta entre -0,20 e -0,30 + DTE > 20
- ⚠️ Amarelo = Delta > -0,40 ou DTE entre 10-20
- 🚨 Vermelho = Delta < -0,50 ou DTE < 10 + ITM

**Seção B - Raio-X de Gregas**
```
Theta de Carteira: +R$ 4.888/dia
```
- Quanto o portfólio ganha com decay diário
- **Rule of Thumb:** Se Theta > +1% do notional/mês = positivo

**Seção C - Consolidação de Margem**
```
Colchão de Liquidez: 4,6% (Mínimo: 15%)
```
- 🚨 Se < 10% = não fazer novas operações
- ⚠️ Se < 15% = fazer apenas operações defensivas
- ✅ Se > 20% = pode fazer operações ofensivas

---

### FORMATO 2: Oportunidades Exclusivas

**Como avaliar uma oportunidade:**

1. **IV Rank > 50%?** ✅ (Prêmios elevados)
2. **Delta -0,15 a -0,30?** ✅ (Alta probabilidade OTM)
3. **Profit Rate > 1,5%?** ✅ (Retorno adequado)
4. **Colchão pós-operação > 15%?** ✅ (Compliance ok)
5. **Concentração < 20%?** ✅ (Risco controlado)

Se todos os checks passarem = **EXECUTAR**  
Se algum falhar = **ESPERAR** (capitalização ou mercado mudar)

---

### FORMATO 3: Plano de Manejo

**Hierarquia de ações:**

| Alerta | Ação | Timing |
|--------|------|--------|
| 🚨 Delta -1,00 + DTE < 10 | Assumir ativo OU rolar TODAY | HOJE |
| ⚠️ Delta < -0,40 | Rolar defensivo (-2% strike) | Próximos 2 dias |
| ⚠️ DTE < 10 + ITM | Rolar ou encerrar | Antes do vencimento |
| ⚠️ Colchão < 15% | Fechar 50% de posição | URGENTE |

---

## 🎯 CASOS DE USO COMUNS

### Caso 1: "Acordei e quero saber o status do portfólio"
**Comando:**
```
"Claude, FORMATO 1 rápido. 
Só me diga: quantas posições estão em alerta, qual é o P&L de hoje, 
e se colchão está ok."
```
**Tempo:** 1-2 minutos

---

### Caso 2: "Recebi R$ 100k de capital novo. O que faço?"
**Comando:**
```
"Claude, descoberta de oportunidades com novo capital de R$ 100k.

Hipóteses:
1. Se aplicar tudo em 3 operações SHORT PUT = qual seria o P&L esperado?
2. Qual seria o novo colchão?
3. Manteria concentração < 20%?
4. Qual seria o theta mensal?

Entregue FORMATO 2 considerando o novo patrimônio."
```
**Tempo:** 3-5 minutos

---

### Caso 3: "Uma posição está ficando ITM. O que faço?"
**Comando:**
```
"Claude, FLRY3 PUT Venda (FLRYT167) ficou ITM.

Situação:
- Strike: R$ 16,73
- Spot: R$ 15,69 (ficou abaixo!)
- Delta: -0,66
- DTE: 65 dias

Opções:
A) Assumir 1.000 ações a R$ 16,73
B) Rolar para JUL/17 com strike -2%
C) Encerrar e liberar margem

Qual a melhor? Justifique com números."
```
**Tempo:** 2-3 minutos

---

### Caso 4: "Quero colocar R$ 10k em risco. É possível?"
**Comando:**
```
"Claude, valide operação:
- Venda 50 contratos de USIM5 PUT a R$ 9,19
- Crédito esperado: R$ 850
- Risco máximo: R$ 5.750

Checklist:
1. Colchão + Concentração ok?
2. Margem da Necton permite?
3. Delta do portfólio fica dentro de limites?
4. Aprovada ou rejeitada?"
```
**Tempo:** 1 minuto

---

## 🚨 ALERTAS E COMO REAGIR

### Alerta: "Delta > -0.40"
**Significado:** Posição curta está "pesada"  
**Risco:** Se o ativo subir, perda rápida  
**Ação:** Rolar defensivamente ou encerrar  
**Timeline:** Próximos 2-3 dias  

---

### Alerta: "DTE < 10 dias + ITM"
**Significado:** Exercício iminente  
**Risco:** Será forçado a comprar o ativo em breve  
**Ação:** Rolar TODAY ou assumir ativo  
**Timeline:** Antes do vencimento (hoje mesmo)  

---

### Alerta: "Colchão < 15%"
**Significado:** Liquidez apertada  
**Risco:** Sem margem de segurança  
**Ação:** NÃO fazer novas operações / Capitalizar / Reduzir posições  
**Timeline:** URGENTE (próximas horas)  

---

### Alerta: "Concentração > 20%"
**Significado:** Uma operação está muito gorda  
**Risco:** Risco sistêmico elevado  
**Ação:** Reduzir quantidade ou escolher outro ativo  
**Timeline:** Antes de executar  

---

## 📞 TROUBLESHOOTING

### P: "Claude não está respondendo"
**R:** 
1. Reative o modo: _"Claude, ative PERITO ESPECIALISTA"_
2. Verifique MCPs: _"Quais MCPs estão online?"_
3. Se problema persiste: Reinicialize a conversa

---

### P: "Os números do FORMATO 1 não batem"
**R:**
1. O OpLab pode estar 5-10 min atrasado
2. Peça refresh: _"Claude, atualize spots com OpLab agora"_
3. Compare com Bloomberg/TradeView para validar
4. Se discrepância > 1%: Escalpe para suporte

---

### P: "Quero fazer uma operação mas fui rejeitado"
**R:**
1. Veja qual check falhou (colchão / concentração / margem)
2. Escolha: Capitalizar, reduzir outra posição, ou esperar
3. Não force operação com compliance violado

---

## 📈 PERFORMANCE TRACKING

### Métricas para Acompanhar Mensalmente

```
Theta Capturado este mês: +R$ ________
P&L realizado: +R$ ________ (-R$ ________)
Posições que viraram ITM: _____ de 24
Rolagens executadas: _____
Oportunidades não executadas: _____

Taxa de Acurácia de Recomendações: _____%
```

---

## ✅ CHECKLIST OPERACIONAL DIÁRIO

- [ ] 07:00 - Ler FORMATO 1 (Auditoria Diária)
- [ ] 07:15 - Verificar colchão (se < 15%, não fazer operações novas)
- [ ] 07:30 - Identificar alertas (Delta > -0,40 ou DTE < 10)
- [ ] 08:00 - Executar rollagens ou defesa conforme recomendado
- [ ] 11:00 - Mid-day check (verificar se spots se movimentaram)
- [ ] 15:00 - Avaliar FORMATO 2 se há oportunidades urgentes
- [ ] 16:30 - Consolidar P&L do dia
- [ ] 17:00 - Preparar para próximo dia

---

## 🎓 TREINAMENTO RECOMENDADO

**Week 1:** Entender FORMATO 1 (ler diariamente 5 min)  
**Week 2:** Executar primeira rolagem recomendada  
**Week 3:** Avaliar FORMATO 2 e considerar operação nova  
**Week 4:** Fazer backtest para validar acurácia do sistema  

---

**Versão Deste Manual:** 1.0  
**Última Atualização:** 23/05/2026  
**Próxima Revisão:** 30/05/2026
