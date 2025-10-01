process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key";
process.env.PORT = "3001";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX_REQUESTS = "100";

require("dotenv").config();

const chai = require("chai");
const request = require("supertest");

// Configurar Chai
global.expect = chai.expect;
global.request = request;

const database = require("../src/config/database");

// Função para limpar o banco de dados
global.clearDatabase = () => {
  database.users.clear();
  database.tasks.clear();
  database.nextUserId = 1;
  database.nextTaskId = 1;
};

// Função para aguardar um pouco entre testes
global.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

global.createTestUser = async (app, userData = {}) => {
  const defaultUser = {
    name: "Usuário Teste",
    email: "teste@example.com",
    password: "123456",
  };

  const user = { ...defaultUser, ...userData };

  const res = await request(app).post("/api/auth/register").send(user);

  if (res.status !== 201) {
    throw new Error(
      `Failed to create test user: ${res.status} - ${JSON.stringify(res.body)}`
    );
  }

  return res.body.data;
};

global.loginUser = async (
  app,
  email = "teste@example.com",
  password = "123456"
) => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return res.body.data.token;
};

global.createTestTask = async (app, token, taskData = {}) => {
  const defaultTask = {
    title: "Tarefa Teste",
    description: "Descrição da tarefa teste",
    priority: "medium",
  };

  const task = { ...defaultTask, ...taskData };

  const res = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${token}`)
    .send(task);

  const createdTask = res.body.data.task;

  // Se completed foi especificado como true, usar toggle para marcar como concluída
  if (taskData.completed === true) {
    await request(app)
      .patch(`/api/tasks/${createdTask.id}/toggle`)
      .set("Authorization", `Bearer ${token}`);

    // Buscar a tarefa atualizada
    const updatedRes = await request(app)
      .get(`/api/tasks/${createdTask.id}`)
      .set("Authorization", `Bearer ${token}`);

    return updatedRes.body.data.task;
  }

  return createdTask;
};
