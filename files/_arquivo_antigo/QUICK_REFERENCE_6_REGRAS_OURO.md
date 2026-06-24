# 🎯 QUICK REFERENCE - 6 REGRAS DE OURO + CHECKLIST DE DECISÃO

**Imprima, plastifique, coloque na parede do seu room.**

---

## 6 REGRAS DE OURO

### 🚫 Regra 1: NUNCA INVENTAR DADOS
```
Se não tiver delta/close/volume REAL da API OpLab:
→ REJEITAR
```

### 📊 Regra 2: DELTA É MÉTRICA PRIMARY
```
Delta -0,90 = Risco ALTO
Delta -0,51 = Risco MÉDIO
Delta -0,25 = Risco BAIXO

DECISÃO: Delta -0,51 vs -0,90 → ESCOLHER -0,51 (SEMPRE)
```

### ☑️ Regra 3: CHECKLIST PRÉ-RECOMENDAÇÃO
```
☐ Delta extraído da API?
☐ Close validado?
☐ Volume ≥ 1.000?
☐ BID/ASK ≤ 5%?
☐ Colchão ≥ 15%?
☐ Concentração ≤ 20%?

Faltou algo? → REJEITAR
```

### 🔄 Regra 4: ESTRUTURAS DE ROLAGEM
```
Opção A: Delta -0,80, Close R$ 0,70
Opção B: Delta -0,51, Close R$ 0,80 ← ESCOLHER
Opção C: Delta -0,90, Close R$ 3,55 ← DESCARTAR

Compare DELTAS (não preços)
Escolha Delta MENOR
Resultado: -R$ 0,70 + R$ 0,80 = +R$ 0,10
```

### 📚 Regra 5: LIÇÕES APRENDIDAS
```
❌ Erro: BBDCS21 (Delta -0,90) recomendado como "menor risco"
✅ Correção: SEMPRE comparar deltas em absoluto
```

### 💪 Regra 6: CHECKLIST DE HUMILDADE
```
Se você está:
✘ Estimando (inventando)
✘ Ignorando delta
✘ Usando "distância do strike"
✘ Passando com dados incompletos

→ PARE E RECOMECE
```

---

## 5 PERGUNTAS ANTES DE RECOMENDAR

### Pergunta 1: Delta REAL extraído?
```
Não? → Puxar OpLab NOW. Sim? → Continuar.
```

### Pergunta 2: Deltas de AMBAS opções comparados?
```
Não? → Comparar. Sim? → Continuar.
```

### Pergunta 3: Delta MENOR foi escolhido?
```
Não? → Revisar decisão. Sim? → Continuar.
```

### Pergunta 4: Todos os dados completos?
```
Falta algum? → REJEITAR. Completo? → Continuar.
```

### Pergunta 5: Cada número justificado?
```
Dúvida? → Revalidar. Tudo OK? → RECOMENDAR.
```

---

## CHECKLIST DE DECISÃO (SIMPLES)

```
VENDI/COMPREI OPÇÃO? → Siga isto:

1️⃣ Puxar OpLab (delta, close, volume)
2️⃣ Validar completude (nada falta?)
3️⃣ Comparar deltas (qual é menor?)
4️⃣ Escolher menor
5️⃣ Calcular resultado
6️⃣ Validar margem (Banco AI)
7️⃣ Recomendar OU Rejeitar
```

---

## PARÂMETROS INVIOLÁVEIS

| Parâmetro | Mín | Máx | Status |
|-----------|-----|-----|--------|
| Colchão | 15% | - | 🚨 Se < 15%: Não fazer ops |
| Concentração | - | 20% | 🚨 Se > 20%: Rejeitar |
| Delta Alerta | - | -0.40 | ⚠️ Se < -0.40: Rolar |
| DTE Crítico | 10 dias | - | 🚨 Se < 10: Rolar TODAY |

---

## 3 ORÁCULOS (MCPs)

### 1️⃣ Google Sheets → Cockpit (24 posições)
Puxar PRIMEIRO. Identifique alertas.

### 2️⃣ OpLab → Dados Reais (delta, close, volume)
Puxar SEMPRE. Valide cada número.

### 3️⃣ Banco AI → Saldo e Margem (Necton)
Puxar FINAL. Valide compliance.

**ORDEM: Google Sheets → OpLab → Banco AI**

---

## PROTOCOLOS EM 1 LINHA

| Protocolo | Quando | Saída |
|-----------|--------|-------|
| **1** | Diariamente 07:00 | FORMATO 1 (Auditoria) |
| **2** | Quinta 14:00 | FORMATO 2 (Top 3 ops) |
| **3** | Quando Delta > -0.40 | FORMATO 3 (Manejo) |
| **4** | Mensal | FORMATO 4 (Cenários) |

---

## OPERAÇÃO TÍPICA (FLUXO)

```
OPERAÇÃO PROPOSTA
        ↓
Google Sheets (listar 24)
        ↓
OpLab (puxar spots, deltas, closes)
        ↓
[Validar completude de dados]
        ↓
Banco AI (validar saldo, colchão, margem)
        ↓
[Compliance OK?]
        ├─ SIM → ✅ APROVADA
        └─ NÃO → 🚫 REJEITADA
```

---

## DECISÃO DE ROLAGEM (SIMPLES)

```
Posição em alerta? (Delta < -0.40 ou DTE < 10)

SIM → Puxar OpLab
      ├─ Opção A (fechar): Delta? Close?
      └─ Opção B (abrir): Delta? Close?
      
      Comparar Deltas → Escolher MENOR
      
      Calcular: -Close_A + Close_B = Resultado
      
      Validar Margem (Banco AI)
      
      → Recomendar Opção B (Delta menor)
```

---

## ERROS COMUNS (NÃO FAÇA)

| ❌ Erro | ✅ Correto |
|--------|-----------|
| Estimar delta | Extrair de OpLab |
| "Strike distante" = menos risco | Delta < -0,40 = mais risco |
| Recomendar com dados faltando | Rejeitar e solicitar dados |
| Escolher por maior crédito | Escolher por menor delta |
| Assumir saldo sem Banco AI | Puxar Banco AI sempre |
| Confiar em cache | Sempre dados frescos |
| Ignorar colchão 15% | Respeitar inviolável |

---

## LINGUAGEM DE REJEIÇÃO

**Quando dados incompletos:**
```
"DADOS INCOMPLETOS - Verificar na corretora antes de executar"
```

**Quando compliance viola:**
```
"Operação REJEITADA - Colchão ficaria em X% (mín: 15%)"
"Operação REJEITADA - Concentração total ficaria em X% (máx: 20%)"
"Operação REJEITADA - Margem insuficiente"
```

**Quando estilo/escopo violado:**
```
"Escopo autorizado: SHORT PUT ou Bull Put Spread apenas"
```

---

## EXEMPLO PRÁTICO (COMPLETO)

```
OPERAÇÃO: Vender USIM5 PUT, Strike R$ 9,19, 20 contratos

PASSO 1 - Google Sheets
  ✓ 24 posições carregadas
  ✓ Nenhuma em alerta crítico
  
PASSO 2 - OpLab (OBRIGATÓRIO)
  ✓ Spot USIM5: R$ 10,35
  ✓ Delta PUT -0,25 ← EXTRAÍDO
  ✓ Close (prêmio): R$ 0,170
  ✓ Volume: 50.000 contratos ✓
  ✓ BID/ASK: R$ 0,165 / R$ 0,175 ✓

PASSO 3 - Banco AI
  ✓ Saldo: R$ 23.185
  ✓ Margem exigida: R$ 1.838
  ✓ Colchão pós-op: 6,82% ⚠️ BAIXO
  
VALIDAÇÃO:
  ✓ Delta extraído? SIM
  ✓ Close validado? SIM
  ✓ Volume OK? SIM
  ✓ Colchão >= 15%? NÃO ⚠️
  
PARECER: ⚠️ CONDICIONAL
Motivo: Colchão ficaria 6,82% (mín: 15%)
Pré-requisito: Capitalizar R$ 50k OU encerrar 50% de posições

RECOMENDAÇÃO: Não executar até capitalizar
```

---

## CENÁRIOS DE DELTA REFERENCE

```
SHORT PUT:
  Delta -0,10 → Improvável ITM (lotes pequenos)
  Delta -0,25 → Baixo risco (recomendado descoberta)
  Delta -0,40 → Risco médio (limite de alerta)
  Delta -0,60 → Risco elevado (monitorar)
  Delta -0,80 → Risco muito alto (rolar urgente)
  Delta -1,00 → Exercício iminente (assumir hoje)

BULL PUT SPREAD:
  Delta longo -0,10 → Proteção mínima
  Delta longo -0,20 → Proteção normal
  Delta longo -0,30 → Proteção agressiva
```

---

## VERSÃO DO DOCUMENTO

Versão: 3.0 Revisado (Auditado)  
Data: 23/05/2026  
Próxima Revisão: 30/05/2026

---

**Plastifique isto e coloque na parede.**  
**Consultie antes de cada recomendação.**  
**Sua conta agradece.**

