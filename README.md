# 🌐 Scenario Automation - Frontend

Frontend simples para demonstrar e testar a API **Scenario Automation**.

## 🚀 Como Executar

### 1. **Certifique-se que a API está rodando**

```bash
# No diretório scenario-automation-api
cd scenario-automation-api
.\mvnw.cmd spring-boot:run
```

### 2. **Abra o frontend**

Simplesmente abra o arquivo `index.html` no seu navegador ou use Live Server se tiver VS Code.

**Ou use Python para servir:**

```bash
# No diretório scenario-front-end
python -m http.server 3000
# Acesse: http://localhost:3000
```

## 🔑 Credenciais de Teste

- **Admin:** `admin` / `admin123`
- **User:** `user` / `user123`  
- **Demo:** `demo` / `demo123`

## 📱 Funcionalidades Implementadas

### ✅ **Autenticação**

- Login com JWT
- Logout
- Persistência de sessão no localStorage

### ✅ **Dashboard**

- Status da API em tempo real
- Informações do banco de dados
- Usuário logado

### ✅ **Gestão de Ambientes**

- ➕ Criar novos ambientes
- 👁️ Visualizar lista de ambientes
- 🗑️ Excluir ambientes
- 📝 Formulário com validação

### ✅ **Gestão de Luminárias**

- ➕ Criar novas luminárias
- 👁️ Visualizar lista de luminárias
- 🔄 Ligar/Desligar luminárias
- 🗑️ Excluir luminárias
- 🎨 Seletor de cor
- 💡 Controle de brilho (0-100%)
- 📍 Posicionamento (X, Y)

### ✅ **Interface Visual**

- 🎨 Design moderno e responsivo
- 📱 Mobile-friendly
- 🌈 Indicadores visuais de status
- 🔔 Notificações em tempo real
- ⚡ Loading states
- 🎭 Modais para criação

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura
- **CSS3** - Estilização avançada com gradientes e animações
- **Vanilla JavaScript** - Lógica e integração com API
- **Font Awesome** - Ícones
- **Fetch API** - Requisições HTTP

## 🔗 Endpoints da API Utilizados

```javascript
// Autenticação
POST /api/auth/login

// Health Check
GET /api/health

// Ambientes
GET /api/ambientes
POST /api/ambientes
DELETE /api/ambientes/{id}

// Luminárias
GET /api/luminarias
POST /api/luminarias
PUT /api/luminarias/{id}
DELETE /api/luminarias/{id}
```

## 📊 Fluxo de Uso

1. **Faça login** com uma das credenciais
2. **Verifique o status** da API no dashboard
3. **Crie um ambiente** (ex: "Sala de Estar")
4. **Adicione luminárias** ao ambiente
5. **Teste o controle** ligando/desligando as luminárias
6. **Explore** as funcionalidades de edição e exclusão

## 🎯 Características do Frontend

### **🔒 Segurança**

- Token JWT armazenado localmente
- Headers de autorização automáticos
- Redirecionamento em caso de token expirado

### **🎨 UX/UI**

- Interface intuitiva e moderna
- Feedback visual imediato
- Estados de loading
- Notificações contextuais
- Design responsivo

### **⚡ Performance**

- Carregamento assíncrono
- Atualizações em tempo real
- Cache de dados no frontend
- Otimização de requisições

## 🐛 Tratamento de Erros

- ✅ Conexão com API offline
- ✅ Token expirado
- ✅ Validação de formulários
- ✅ Feedback de erros da API
- ✅ Estados de carregamento

## 📝 Estrutura de Arquivos

```
scenario-front-end/
├── index.html          # Página principal
├── styles.css          # Estilos
├── app.js              # Lógica JavaScript
└── README.md           # Este arquivo
```

## 🔄 Próximas Melhorias

- [ ] Edição inline de ambientes e luminárias
- [ ] Filtros e busca
- [ ] Paginação para listas grandes
- [ ] Gráficos de consumo
- [ ] Themes (claro/escuro)
- [ ] PWA (Progressive Web App)

## 🎮 Como Testar

1. **Login:** Use `admin/admin123`
2. **Crie um ambiente:** "Sala de Estar"
3. **Adicione uma luminária:** LED, cor branca, 80% brilho
4. **Teste o controle:** Ligue/desligue a luminária
5. **Veja o status:** Indicador verde = ligada, vermelho = desligada

---

**💡 Dica:** Mantenha o console do navegador aberto (F12) para ver logs detalhados das requisições à API!
