# 🚀 Setup do MOTOR 4P UFPR

## Configuração de Ambiente

### Frontend

1. **Crie o arquivo `.env` na raiz do projeto:**

```bash
cp .env.example .env
```

2. **Configure a URL da API:**

Edite o arquivo `.env` e configure:

```env
# Para desenvolvimento local (backend rodando localmente)
VITE_API_URL=http://localhost:8000/api/v1

# Para produção (backend no Railway)
VITE_API_URL=https://motor4pufpr-production.up.railway.app/api/v1
```

3. **Instale as dependências:**

```bash
npm install
```

4. **Inicie o servidor de desenvolvimento:**

```bash
npm run dev
```

### Backend

1. **Entre na pasta backend:**

```bash
cd backend
```

2. **Crie ambiente virtual Python:**

```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

3. **Instale dependências:**

```bash
pip install -r requirements.txt
```

4. **Execute o backend:**

```bash
python run.py
```

O backend estará disponível em `http://localhost:8000`

## Verificação

Após iniciar o frontend, você deve ver:

- ✅ Badge "API Conectada" (verde) se o backend estiver acessível
- ⚠️ Badge "Modo Simulado" (amarelo) se o backend estiver indisponível

## URLs Importantes

- **Frontend (dev):** http://localhost:5173
- **Backend (local):** http://localhost:8000
- **Backend (Railway):** https://motor4pufpr-production.up.railway.app
- **API Docs (local):** http://localhost:8000/docs
- **API Docs (Railway):** https://motor4pufpr-production.up.railway.app/docs

## Troubleshooting

### APIs aparecem desconectadas

1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Verifique se `VITE_API_URL` está configurada corretamente
3. **Reinicie o servidor Vite** (Ctrl+C e `npm run dev` novamente)
4. Limpe o cache do navegador (Ctrl+Shift+R)

### CORS errors

Se aparecer erro de CORS, verifique que o backend está configurado para aceitar requisições do frontend.

O arquivo `backend/app/main.py` já está configurado para aceitar:
- `http://localhost:5173`
- `https://motor4pufpr.lovable.app`

## Deployment

### Frontend (Lovable)

Configure a variável de ambiente no Lovable:

```
VITE_API_URL = https://motor4pufpr-production.up.railway.app/api/v1
```

### Backend (Railway)

O backend já está deployado e configurado automaticamente via Railway.
