// Configuração global para testes unitários
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key";
process.env.PORT = "3001";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX_REQUESTS = "100";

// Carregar dotenv para garantir que as variáveis sejam definidas
require("dotenv").config();

const chai = require("chai");
const sinon = require("sinon");

// Configurar Chai
global.expect = chai.expect;
global.sinon = sinon;

// Configurar Sinon
global.sinon = sinon;

// Função para limpar o banco de dados
const database = require("../../src/config/database");
global.clearDatabase = () => {
  database.users.clear();
  database.tasks.clear();
  database.nextUserId = 1;
  database.nextTaskId = 1;
};

// Função para aguardar um pouco entre testes
global.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Configurar Sinon para restaurar automaticamente após cada teste
// Nota: beforeEach e afterEach serão definidos nos arquivos de teste individuais
