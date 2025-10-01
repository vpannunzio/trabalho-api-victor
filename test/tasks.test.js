const request = require("supertest");
const app = require("../src/app");

describe("Gerenciamento de Tarefas", () => {
  let token;

  beforeEach(async () => {
    clearDatabase();
    await delay(100); // Aguardar um pouco para evitar rate limiting
    const userData = await createTestUser(app, {
      name: "Tarefas Teste",
      email: "tarefas@example.com",
      password: "123456",
    });
    token = userData.token;
  });

  describe("POST /api/tasks", () => {
    it("deve criar uma nova tarefa com dados válidos", async () => {
      const taskData = {
        title: "Nova Tarefa",
        description: "Descrição da nova tarefa",
        priority: "high",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(taskData);

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Tarefa criada com sucesso");
      expect(res.body.data.task).to.have.property("id");
      expect(res.body.data.task).to.have.property("title", taskData.title);
      expect(res.body.data.task).to.have.property(
        "description",
        taskData.description
      );
      expect(res.body.data.task).to.have.property(
        "priority",
        taskData.priority
      );
      expect(res.body.data.task).to.have.property("completed", false);
      expect(res.body.data.task).to.have.property("userId");
    });

    it("deve criar tarefa com prioridade padrão quando não especificada", async () => {
      const taskData = {
        title: "Tarefa Sem Prioridade",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(taskData);

      expect(res.status).to.equal(201);
      expect(res.body.data.task).to.have.property("priority", "medium");
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      const invalidData = {
        title: "", // Título vazio
        priority: "invalid", // Prioridade inválida
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(invalidData);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Dados inválidos");
    });

    it("deve retornar erro sem autenticação", async () => {
      const taskData = {
        title: "Tarefa Teste",
      };

      const res = await request(app).post("/api/tasks").send(taskData);

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Token de acesso requerido");
    });
  });

  describe("GET /api/tasks", () => {
    beforeEach(async () => {
      // Criar algumas tarefas para teste
      await createTestTask(app, token, {
        title: "Tarefa 1",
        priority: "high",
        completed: false,
      });
      await createTestTask(app, token, {
        title: "Tarefa 2",
        priority: "medium",
        completed: true,
      });
      await createTestTask(app, token, {
        title: "Tarefa 3",
        priority: "low",
        completed: false,
      });
    });

    it("deve listar todas as tarefas do usuário", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.tasks).to.be.an("array");
      expect(res.body.data.tasks.length).to.equal(3);
      expect(res.body.data.pagination).to.have.property("totalTasks", 3);
      expect(res.body.data.statistics).to.have.property("total", 3);
      expect(res.body.data.statistics).to.have.property("completed", 1);
      expect(res.body.data.statistics).to.have.property("pending", 2);
    });

    it("deve filtrar tarefas por status de conclusão", async () => {
      const res = await request(app)
        .get("/api/tasks?completed=true")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.tasks.length).to.equal(1);
      expect(res.body.data.tasks[0].completed).to.be.true;
    });

    it("deve filtrar tarefas por prioridade", async () => {
      const res = await request(app)
        .get("/api/tasks?priority=high")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.tasks.length).to.equal(1);
      expect(res.body.data.tasks[0].priority).to.equal("high");
    });

    it("deve implementar paginação corretamente", async () => {
      const res = await request(app)
        .get("/api/tasks?page=1&limit=2")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.tasks.length).to.equal(2);
      expect(res.body.data.pagination).to.have.property("currentPage", 1);
      expect(res.body.data.pagination).to.have.property("totalPages", 2);
      expect(res.body.data.pagination).to.have.property("hasNextPage", true);
    });
  });

  describe("GET /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      const task = await createTestTask(app, token, {
        title: "Tarefa Específica",
        description: "Descrição da tarefa específica",
      });
      taskId = task.id;
    });

    it("deve retornar tarefa específica do usuário", async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.task).to.have.property("id", taskId);
      expect(res.body.data.task).to.have.property("title", "Tarefa Específica");
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const res = await request(app)
        .get("/api/tasks/99999")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Tarefa não encontrada");
    });

    it("deve retornar erro para ID inválido", async () => {
      const res = await request(app)
        .get("/api/tasks/invalid-id")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(404);
    });
  });

  describe("PUT /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      const task = await createTestTask(app, token, {
        title: "Tarefa para Atualizar",
        description: "Descrição original",
      });
      taskId = task.id;
    });

    it("deve atualizar tarefa com dados válidos", async () => {
      const updateData = {
        title: "Título Atualizado",
        description: "Descrição atualizada",
        priority: "high",
      };

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Tarefa atualizada com sucesso");
      expect(res.body.data.task).to.have.property("title", updateData.title);
      expect(res.body.data.task).to.have.property(
        "description",
        updateData.description
      );
      expect(res.body.data.task).to.have.property(
        "priority",
        updateData.priority
      );
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      const invalidData = {
        title: "", // Título vazio
        priority: "invalid",
      };

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(invalidData);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Dados inválidos");
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const updateData = {
        title: "Título Atualizado",
      };

      const res = await request(app)
        .put("/api/tasks/99999")
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Tarefa não encontrada");
    });
  });

  describe("PATCH /api/tasks/:id/toggle", () => {
    let taskId;

    beforeEach(async () => {
      const task = await createTestTask(app, token, {
        title: "Tarefa para Toggle",
        completed: false,
      });
      taskId = task.id;
    });

    it("deve alternar status de conclusão da tarefa", async () => {
      // Primeiro toggle - marcar como concluída
      const res1 = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set("Authorization", `Bearer ${token}`);

      expect(res1.status).to.equal(200);
      expect(res1.body.success).to.be.true;
      expect(res1.body.message).to.equal("Tarefa concluída com sucesso");
      expect(res1.body.data.task.completed).to.be.true;

      // Segundo toggle - marcar como não concluída
      const res2 = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set("Authorization", `Bearer ${token}`);

      expect(res2.status).to.equal(200);
      expect(res2.body.success).to.be.true;
      expect(res2.body.message).to.equal("Tarefa reaberta com sucesso");
      expect(res2.body.data.task.completed).to.be.false;
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const res = await request(app)
        .patch("/api/tasks/99999/toggle")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Tarefa não encontrada");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    let taskId;

    beforeEach(async () => {
      const task = await createTestTask(app, token, {
        title: "Tarefa para Deletar",
      });
      taskId = task.id;
    });

    it("deve deletar tarefa do usuário", async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Tarefa deletada com sucesso");

      // Verificar se a tarefa foi realmente deletada
      const getRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).to.equal(404);
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      const res = await request(app)
        .delete("/api/tasks/99999")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Tarefa não encontrada");
    });
  });

  describe("GET /api/tasks/statistics", () => {
    beforeEach(async () => {
      // Criar tarefas com diferentes prioridades e status
      await createTestTask(app, token, {
        title: "Tarefa Alta 1",
        priority: "high",
        completed: true,
      });
      await createTestTask(app, token, {
        title: "Tarefa Alta 2",
        priority: "high",
        completed: false,
      });
      await createTestTask(app, token, {
        title: "Tarefa Média",
        priority: "medium",
        completed: true,
      });
      await createTestTask(app, token, {
        title: "Tarefa Baixa",
        priority: "low",
        completed: false,
      });
    });

    it("deve retornar estatísticas das tarefas", async () => {
      const res = await request(app)
        .get("/api/tasks/statistics")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.overview).to.have.property("total", 4);
      expect(res.body.data.overview).to.have.property("completed", 2);
      expect(res.body.data.overview).to.have.property("pending", 2);
      expect(res.body.data.overview).to.have.property("completionRate", 50);
      expect(res.body.data.priority).to.have.property("high", 2);
      expect(res.body.data.priority).to.have.property("medium", 1);
      expect(res.body.data.priority).to.have.property("low", 1);
    });
  });

  describe("Isolamento entre usuários", () => {
    let token2;

    beforeEach(async () => {
      // Criar segundo usuário
      const userData2 = await createTestUser(app, {
        name: "Usuário 2",
        email: "usuario2@example.com",
        password: "123456",
      });
      token2 = userData2.token;

      // Criar tarefa para o primeiro usuário
      await createTestTask(app, token, {
        title: "Tarefa do Usuário 1",
      });
    });

    it("usuário não deve ver tarefas de outros usuários", async () => {
      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.tasks.length).to.equal(0);
    });

    it("usuário não deve conseguir acessar tarefa de outro usuário", async () => {
      // Primeiro, obter ID da tarefa do primeiro usuário
      const tasksRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      const taskId = tasksRes.body.data.tasks[0].id;

      // Tentar acessar com o segundo usuário
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token2}`);

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Acesso negado a esta tarefa");
    });
  });
});
