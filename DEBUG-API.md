# 🔧 DEBUG: APIs Desconectadas

## Problema
Frontend mostra "Verificando..." ou "Failed to fetch" mesmo com backend funcionando.

## Checklist de Diagnóstico

### ✅ 1. Verifique o arquivo `.env`

```bash
# Deve existir na raiz do projeto
cat .env
```

**Deve conter:**
```env
VITE_API_URL=https://motor4pufpr-production.up.railway.app/api/v1
```

### ✅ 2. Teste a API diretamente

Abra no navegador:
```
https://motor4pufpr-production.up.railway.app/api/v1/health
```

**Deve retornar:**
```json
{
  "status": "healthy",
  "service": "MOTOR 4P UFPR API",
  "version": "0.1.0"
}
```

### ✅ 3. Reinicie o servidor Vite

**CRÍTICO:** Vite só carrega variáveis de ambiente no startup!

```bash
# 1. Pare o servidor (Ctrl+C)
# 2. Inicie novamente
npm run dev
```

### ✅ 4. Limpe o cache do navegador

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### ✅ 5. Verifique o Console do Navegador

1. Abra DevTools (F12)
2. Vá na aba **Console**
3. Procure por erros de CORS ou fetch

**Erros comuns:**

#### CORS Error:
```
Access to fetch at 'https://...' has been blocked by CORS policy
```
**Solução:** Backend já configurado, redeploy no Railway se necessário

#### Network Error:
```
Failed to fetch
TypeError: NetworkError when attempting to fetch resource
```
**Solução:** Verifique se VITE_API_URL está correta no .env

### ✅ 6. Verifique a URL no código

Abra DevTools → Network → XHR e veja qual URL está sendo chamada.

**Deve ser:**
```
https://motor4pufpr-production.up.railway.app/api/v1/health
```

**NÃO deve ser:**
```
http://localhost:8000/api/v1/health  ❌
```

### ✅ 7. Teste em modo Incógnito

Abra o site em uma janela anônima para descartar problemas de cache.

## Fluxo de Correção

```bash
# 1. Confirme que .env existe e está correto
cat .env

# 2. Se não existir, crie:
cp .env.example .env
# Edite e coloque: VITE_API_URL=https://motor4pufpr-production.up.railway.app/api/v1

# 3. REINICIE o Vite
# Ctrl+C no terminal
npm run dev

# 4. Aguarde mensagem "Local: http://localhost:5173"

# 5. Abra/Recarregue o navegador
# Ctrl+Shift+R
```

## Verificação Final

Após seguir os passos acima, você deve ver:

✅ Badge **"API Conectada"** (verde) no MvpEngine  
✅ Status **"Sistema Online • v0.1.0"** na página inicial  
✅ Preview de Ontologia funcionando (sem "Failed to fetch")  
✅ Exemplos carregando do backend

## Ainda não funciona?

### Debug Avançado

1. **Verifique se o Vite leu o .env:**

No console do navegador:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

Deve mostrar:
```
https://motor4pufpr-production.up.railway.app/api/v1
```

Se mostrar `undefined` ou `http://localhost:8000/api/v1`:
- ❌ Vite não leu o .env
- ✅ Reinicie o servidor Vite

2. **Teste a API com curl/fetch:**

```bash
curl https://motor4pufpr-production.up.railway.app/api/v1/health
```

Ou no console do navegador:
```javascript
fetch('https://motor4pufpr-production.up.railway.app/api/v1/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

## Configuração para Lovable (Produção)

No Lovable, configure a variável de ambiente:

1. Settings → Environment Variables
2. Adicione:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://motor4pufpr-production.up.railway.app/api/v1`
3. Publish/Redeploy

## Contato

Se o problema persistir após seguir todos os passos, verifique:
- Status do Railway: https://railway.app/status
- Logs do backend no Railway
