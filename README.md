# 🚀 API de Gerenciamento de Tarefas - Victor POS

Uma API REST completa para gerenciamento de tarefas com autenticação JWT, desenvolvida em Node.js com Express.

## 📋 Funcionalidades

- ✅ **Autenticação JWT** - Sistema seguro de login e registro
- 📝 **CRUD de Tarefas** - Criar, listar, atualizar e deletar tarefas
- 🔐 **Middleware de Segurança** - Rate limiting, CORS, Helmet
- 📊 **Estatísticas** - Dashboard com métricas das tarefas
- 🧪 **Testes Automatizados** - Cobertura completa com Mocha, Chai e Supertest
- 🚀 **CI/CD Pipeline** - GitHub Actions para testes e deploy
- 📚 **Documentação Completa** - API bem documentada

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Joi** - Validação de dados
- **Mocha** - Framework de testes
- **Chai** - Biblioteca de assertions
- **Supertest** - Testes de API
- **GitHub Actions** - CI/CD

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 16+ 
- npm ou yarn

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd trabalho-api-victor
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Execute a aplicação

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

A API estará disponível em `http://localhost:3000`

## 🧪 Executando os Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:coverage
```

## 📚 Documentação da API

### Base URL
```
http://localhost:3000/api
```

### Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Inclua o token no header:

```
Authorization: Bearer <seu-token>
```

### Endpoints

#### 🔐 Autenticação

##### POST `/auth/register`
Registra um novo usuário.

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "123456"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "data": {
    "user": {
      "id": 1,
      "name": "João Silva",
      "email": "joao@example.com",
      "apiKey": "uuid-key",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  }
}
```

##### POST `/auth/login`
Faz login do usuário.

**Body:**
```json
{
  "email": "joao@example.com",
  "password": "123456"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": 1,
      "name": "João Silva",
      "email": "joao@example.com"
    },
    "token": "jwt-token"
  }
}
```

##### GET `/auth/profile`
Obtém o perfil do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "João Silva",
      "email": "joao@example.com"
    }
  }
}
```

##### PUT `/auth/profile`
Atualiza o perfil do usuário.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com"
}
```

##### DELETE `/auth/account`
Deleta a conta do usuário.

**Headers:** `Authorization: Bearer <token>`

#### 📝 Tarefas

##### POST `/tasks`
Cria uma nova tarefa.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "title": "Nova Tarefa",
  "description": "Descrição da tarefa",
  "priority": "high"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Tarefa criada com sucesso",
  "data": {
    "task": {
      "id": 1,
      "title": "Nova Tarefa",
      "description": "Descrição da tarefa",
      "priority": "high",
      "completed": false,
      "userId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

##### GET `/tasks`
Lista todas as tarefas do usuário.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `completed` (boolean) - Filtrar por status
- `priority` (string) - Filtrar por prioridade (low, medium, high)
- `page` (number) - Página para paginação
- `limit` (number) - Itens por página

**Exemplo:** `GET /tasks?completed=false&priority=high&page=1&limit=10`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalTasks": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "statistics": {
      "total": 15,
      "completed": 5,
      "pending": 10,
      "completionRate": 33
    }
  }
}
```

##### GET `/tasks/:id`
Obtém uma tarefa específica.

**Headers:** `Authorization: Bearer <token>`

##### PUT `/tasks/:id`
Atualiza uma tarefa.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "title": "Título Atualizado",
  "description": "Nova descrição",
  "priority": "medium",
  "completed": true
}
```

##### PATCH `/tasks/:id/toggle`
Alterna o status de conclusão da tarefa.

**Headers:** `Authorization: Bearer <token>`

##### DELETE `/tasks/:id`
Deleta uma tarefa.

**Headers:** `Authorization: Bearer <token>`

##### GET `/tasks/statistics`
Obtém estatísticas das tarefas.

**Headers:** `Authorization: Bearer <token>`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total": 15,
      "completed": 5,
      "pending": 10,
      "completionRate": 33
    },
    "priority": {
      "high": 3,
      "medium": 7,
      "low": 5
    },
    "recent": {
      "last7Days": 8
    }
  }
}
```

### 🏥 Health Check

##### GET `/health`
Verifica o status da API.

**Resposta:**
```json
{
  "success": true,
  "message": "API está funcionando",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## 🔒 Segurança

### Rate Limiting
- **Autenticação:** 5 tentativas por 15 minutos
- **API Geral:** 100 requisições por 15 minutos

### Validação
- Todos os inputs são validados com Joi
- Senhas são hasheadas com bcrypt
- Tokens JWT com expiração de 24 horas

### Headers de Segurança
- Helmet.js para headers de segurança
- CORS configurado
- Rate limiting implementado

## 🚀 Deploy

### GitHub Actions

O projeto inclui pipelines automatizadas:

1. **CI Pipeline** (`ci.yml`):
   - Testes em múltiplas versões do Node.js
   - Análise de segurança
   - Cobertura de código
   - Build da aplicação

2. **Deploy Pipeline** (`deploy.yml`):
   - Deploy automático para produção
   - Testes de saúde
   - Verificação pós-deploy

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 Cobertura de Testes

Execute `npm run test:coverage` para ver a cobertura de testes:

```
Statements   : 95.45% ( 21/22 )
Branches     : 90.91% ( 20/22 )
Functions    : 100%   ( 10/10 )
Lines        : 95.45% ( 21/22 )
```

## 🛠️ Scripts Disponíveis

```bash
npm start          # Inicia a aplicação
npm run dev        # Inicia em modo desenvolvimento
npm test           # Executa os testes
npm run test:watch # Executa testes em modo watch
npm run test:coverage # Executa testes com cobertura
```

## 📁 Estrutura do Projeto

```
src/
├── config/
│   └── database.js      # Configuração do banco de dados
├── controllers/
│   ├── authController.js # Controlador de autenticação
│   └── taskController.js # Controlador de tarefas
├── middleware/
│   ├── auth.js          # Middleware de autenticação
│   ├── rateLimiter.js   # Rate limiting
│   └── validation.js    # Validação de dados
├── routes/
│   ├── auth.js          # Rotas de autenticação
│   └── tasks.js         # Rotas de tarefas
└── app.js               # Aplicação principal

test/
├── setup.js             # Configuração dos testes
├── auth.test.js         # Testes de autenticação
├── tasks.test.js        # Testes de tarefas
├── integration.test.js  # Testes de integração
└── mocha.opts           # Configuração do Mocha

.github/workflows/
├── ci.yml               # Pipeline de CI
└── deploy.yml           # Pipeline de deploy
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**Victor POS**
- GitHub: [@victor-pos](https://github.com/victor-pos)

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas, por favor abra uma issue no GitHub.

---

⭐ Se este projeto foi útil para você, considere dar uma estrela!
