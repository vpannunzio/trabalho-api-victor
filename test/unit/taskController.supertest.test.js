const request = require("supertest");
const { expect } = require("chai");
const app = require("../../src/app");
const database = require("../../src/config/database");

describe("TaskController - Testes Unitários com Supertest", () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Limpar banco de dados
    database.users.clear();
    database.tasks.clear();
    database.nextUserId = 1;
    database.nextTaskId = 1;

    // Criar usuário e obter token
    const userData = {
      name: "João Silva",
      email: "joao@example.com",
      password: "123456",
    };

    const response = await request(app)
      .post("/api/auth/register")
      .send(userData);

    authToken = response.body.data.token;
    userId = response.body.data.user.id;
  });

  describe("POST /api/tasks", () => {
    it("deve criar uma nova tarefa com dados válidos", async () => {
      const taskData = {
        title: "Nova Tarefa",
        description: "Descrição da tarefa",
        priority: "high",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.task.title).to.equal("Nova Tarefa");
      expect(response.body.data.task.description).to.equal(
        "Descrição da tarefa"
      );
      expect(response.body.data.task.priority).to.equal("high");
      expect(response.body.data.task.completed).to.be.false;
      expect(response.body.data.task.userId).to.equal(userId);
    });

    it("deve criar tarefa com prioridade padrão quando não especificada", async () => {
      const taskData = {
        title: "Tarefa sem prioridade",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.task.priority).to.equal("medium");
    });

    it("deve retornar erro sem autenticação", async () => {
      const taskData = {
        title: "Tarefa sem auth",
      };

      const response = await request(app).post("/api/tasks").send(taskData);

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      const invalidData = {
        title: "", // Título vazio
        priority: "invalid", // Prioridade inválida
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Dados inválidos");
    });
  });

  describe("GET /api/tasks", () => {
    beforeEach(async () => {
      // Criar algumas tarefas para teste
      const tasks = [
        { title: "Tarefa 1", priority: "high" },
        { title: "Tarefa 2", priority: "medium" },
        { title: "Tarefa 3", priority: "low" },
      ];

      for (const task of tasks) {
        await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${authToken}`)
          .send(task);
      }
    });

    it("deve listar todas as tarefas do usuário", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.tasks).to.have.length(3);
    });

    it("deve filtrar tarefas por prioridade", async () => {
      const response = await request(app)
        .get("/api/tasks?priority=high")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.tasks).to.have.length(1);
      expect(response.body.data.tasks[0].priority).to.equal("high");
    });

    it("deve implementar paginação corretamente", async () => {
      const response = await request(app)
        .get("/api/tasks?page=1&limit=2")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.tasks).to.have.length(2);
    });

    it("deve retornar erro sem autenticação", async () => {
      const response = await request(app).get("/api/tasks");

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });

  describe("GET /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      // Criar uma tarefa para teste
      const taskData = {
        title: "Tarefa para teste",
        description: "Descrição da tarefa",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      taskId = response.body.data.task.id;
    });

    it("deve retornar tarefa específica do usuário", async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.task.id).to.equal(taskId);
      expect(response.body.data.task.title).to.equal("Tarefa para teste");
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const response = await request(app)
        .get("/api/tasks/99999")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Tarefa não encontrada");
    });

    it("deve retornar erro para ID inválido", async () => {
      const response = await request(app)
        .get("/api/tasks/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
    });
  });

  describe("PUT /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      // Criar uma tarefa para teste
      const taskData = {
        title: "Tarefa original",
        description: "Descrição original",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      taskId = response.body.data.task.id;
    });

    it("deve atualizar tarefa com dados válidos", async () => {
      const updateData = {
        title: "Tarefa atualizada",
        description: "Nova descrição",
        priority: "high",
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.task.title).to.equal("Tarefa atualizada");
      expect(response.body.data.task.description).to.equal("Nova descrição");
      expect(response.body.data.task.priority).to.equal("high");
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const updateData = {
        title: "Tarefa inexistente",
      };

      const response = await request(app)
        .put("/api/tasks/99999")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
    });
  });

  describe("PATCH /api/tasks/:id/toggle", () => {
    let taskId;

    beforeEach(async () => {
      // Criar uma tarefa para teste
      const taskData = {
        title: "Tarefa para toggle",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      taskId = response.body.data.task.id;
    });

    it("deve alternar status de conclusão da tarefa", async () => {
      // Primeiro toggle - deve marcar como concluída
      const response1 = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response1.status).to.equal(200);
      expect(response1.body.success).to.be.true;
      expect(response1.body.data.task.completed).to.be.true;

      // Segundo toggle - deve marcar como não concluída
      const response2 = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response2.status).to.equal(200);
      expect(response2.body.success).to.be.true;
      expect(response2.body.data.task.completed).to.be.false;
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const response = await request(app)
        .patch("/api/tasks/99999/toggle")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      // Criar uma tarefa para teste
      const taskData = {
        title: "Tarefa para deletar",
      };

      const response = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send(taskData);

      taskId = response.body.data.task.id;
    });

    it("deve deletar tarefa do usuário", async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal("Tarefa deletada com sucesso");

      // Verificar se a tarefa foi realmente deletada
      const getResponse = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.status).to.equal(404);
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const response = await request(app)
        .delete("/api/tasks/99999")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
    });
  });

  describe("GET /api/tasks/statistics", () => {
    beforeEach(async () => {
      // Criar algumas tarefas com diferentes status
      const tasks = [
        { title: "Tarefa 1", priority: "high" },
        { title: "Tarefa 2", priority: "medium" },
        { title: "Tarefa 3", priority: "low" },
      ];

      for (const task of tasks) {
        const response = await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${authToken}`)
          .send(task);

        // Marcar a primeira tarefa como concluída
        if (task.title === "Tarefa 1") {
          await request(app)
            .patch(`/api/tasks/${response.body.data.task.id}/toggle`)
            .set("Authorization", `Bearer ${authToken}`);
        }
      }
    });

    it("deve retornar estatísticas das tarefas", async () => {
      const response = await request(app)
        .get("/api/tasks/statistics")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.overview.total).to.equal(3);
      expect(response.body.data.overview.completed).to.equal(1);
      expect(response.body.data.overview.pending).to.equal(2);
      expect(response.body.data.priority.high).to.equal(1);
      expect(response.body.data.priority.medium).to.equal(1);
      expect(response.body.data.priority.low).to.equal(1);
    });

    it("deve retornar erro sem autenticação", async () => {
      const response = await request(app).get("/api/tasks/statistics");

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });

  describe("Isolamento entre usuários", () => {
    let user2Token;
    let user2Id;

    beforeEach(async () => {
      // Criar segundo usuário
      const user2Data = {
        name: "Maria Silva",
        email: "maria@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(user2Data);

      user2Token = response.body.data.token;
      user2Id = response.body.data.user.id;

      // Criar tarefa para o primeiro usuário
      await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Tarefa do User 1" });
    });

    it("usuário não deve ver tarefas de outros usuários", async () => {
      const response = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${user2Token}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.tasks).to.have.length(0);
    });

    it("usuário não deve conseguir acessar tarefa de outro usuário", async () => {
      // User 1 cria uma tarefa
      const taskResponse = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Tarefa privada" });

      const taskId = taskResponse.body.data.task.id;

      // User 2 tenta acessar a tarefa do User 1
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${user2Token}`);

      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Acesso negado a esta tarefa");
    });
  });
});
