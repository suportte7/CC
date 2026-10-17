# CardControl 💳

App web para controle de empréstimos de cartão de crédito.

## Stack
- **Frontend:** HTML + CSS + JS puro → GitHub Pages
- **Backend:** Google Apps Script
- **Dados:** Google Sheets

## Deploy

### 1. Google Apps Script
1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha chamada **CardControl**
2. Menu → **Extensões → Apps Script**
3. Apague o código padrão
4. Cole o conteúdo do `Code.gs` (Parte 1 + Parte 2, em sequência)
5. Salve → nomeie o projeto **CardControl**
6. **Implantar → Nova implantação**
7. Tipo: **App da Web**
8. Executar como: **Eu**
9. Quem acessa: **Qualquer pessoa**
10. Clique **Implantar** → copie a URL gerada

### 2. GitHub Pages
1. Crie um repositório público chamado `card-control-app`
2. Faça upload de: `index.html`, `app.html`, `style.css`, `api.js`, `app.js`
3. **Settings → Pages → Branch: main → Save**
4. Acesse: `https://SEU_USUARIO.github.io/card-control-app`

### 3. Conectar
Abra `api.js` e substitua:
```javascript
const SCRIPT_URL = 'SUA_URL_AQUI';