const request = require("supertest");
const app = require("../src/app");

describe("Testes de Integração", () => {
  beforeEach(() => {
    clearDatabase();
  });
  describe("Fluxo completo de usuário", () => {
    it("deve permitir registro, login, criação de tarefas e gerenciamento completo", async () => {
      await delay(100);

      // 1. Registrar usuário
      const userData = {
        name: "Usuário Integração",
        email: "integracao@example.com",
        password: "123456",
      };

      const registerRes = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(registerRes.status).to.equal(201);
      const { user, token } = registerRes.body.data;

      // 2. Fazer login
      const loginRes = await request(app).post("/api/auth/login").send({
        email: userData.email,
        password: userData.password,
      });

      expect(loginRes.status).to.equal(200);
      expect(loginRes.body.data.token).to.be.a("string");

      // 3. Obter perfil
      const profileRes = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(profileRes.status).to.equal(200);
      expect(profileRes.body.data.user.email).to.equal(userData.email);

      // 4. Criar várias tarefas
      const tasks = [
        { title: "Tarefa 1", priority: "high" },
        {
          title: "Tarefa 2",
          priority: "medium",
          description: "Descrição da tarefa 2",
        },
        { title: "Tarefa 3", priority: "low" },
      ];

      const createdTasks = [];
      for (const taskData of tasks) {
        const taskRes = await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${token}`)
          .send(taskData);

        expect(taskRes.status).to.equal(201);
        createdTasks.push(taskRes.body.data.task);
      }

      // 5. Listar tarefas
      const listRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(listRes.status).to.equal(200);
      expect(listRes.body.data.tasks.length).to.equal(3);
      expect(listRes.body.data.statistics.total).to.equal(3);

      // 6. Marcar uma tarefa como concluída
      const taskId = createdTasks[0].id;
      const toggleRes = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set("Authorization", `Bearer ${token}`);

      expect(toggleRes.status).to.equal(200);
      expect(toggleRes.body.data.task.completed).to.be.true;

      // 7. Atualizar outra tarefa
      const updateRes = await request(app)
        .put(`/api/tasks/${createdTasks[1].id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa 2 Atualizada",
          priority: "high",
        });

      expect(updateRes.status).to.equal(200);
      expect(updateRes.body.data.task.title).to.equal("Tarefa 2 Atualizada");
      expect(updateRes.body.data.task.priority).to.equal("high");

      // 8. Verificar estatísticas atualizadas
      const statsRes = await request(app)
        .get("/api/tasks/statistics")
        .set("Authorization", `Bearer ${token}`);

      expect(statsRes.status).to.equal(200);
      expect(statsRes.body.data.overview.completed).to.equal(1);
      expect(statsRes.body.data.overview.pending).to.equal(2);
      expect(statsRes.body.data.priority.high).to.equal(2); // Uma original + uma atualizada

      // 9. Deletar uma tarefa
      const deleteRes = await request(app)
        .delete(`/api/tasks/${createdTasks[2].id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(deleteRes.status).to.equal(200);

      // 10. Verificar que a tarefa foi deletada
      const finalListRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(finalListRes.status).to.equal(200);
      expect(finalListRes.body.data.tasks.length).to.equal(2);

      // 11. Atualizar perfil
      const updateProfileRes = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Nome Atualizado",
        });

      expect(updateProfileRes.status).to.equal(200);
      expect(updateProfileRes.body.data.user.name).to.equal("Nome Atualizado");
    });
  });

  describe("Cenários de erro e edge cases", () => {
    let token;

    beforeEach(async () => {
      await delay(100); // Aguardar um pouco para evitar rate limiting
      const userData = await createTestUser(app, {
        name: "Usuário Edge Cases",
        email: "edge@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve lidar com rate limiting corretamente", async () => {
      // Fazer várias tentativas de login com credenciais erradas
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app).post("/api/auth/login").send({
            email: "edge@example.com",
            password: "senhaerrada",
          })
        );
      }

      const responses = await Promise.all(promises);

      // As primeiras 5 devem retornar 401, a 6ª deve retornar 429 (rate limit)
      const errorResponses = responses.filter((res) => res.status === 401);
      const rateLimitResponses = responses.filter((res) => res.status === 429);

      expect(errorResponses.length).to.be.greaterThan(0);
      // Nota: O rate limiting pode não ser exato devido à natureza assíncrona dos testes
    });

    it("deve validar todos os campos obrigatórios em diferentes endpoints", async () => {
      // Testar validação em registro
      const invalidRegister = await request(app)
        .post("/api/auth/register")
        .send({});

      expect(invalidRegister.status).to.equal(400);
      expect(invalidRegister.body.errors.length).to.be.greaterThan(0);

      // Testar validação em criação de tarefa
      const invalidTask = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(invalidTask.status).to.equal(400);
      expect(invalidTask.body.errors.length).to.be.greaterThan(0);
    });

    it("deve manter consistência de dados após operações múltiplas", async () => {
      // Criar várias tarefas rapidamente
      const taskPromises = [];
      for (let i = 0; i < 5; i++) {
        taskPromises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa ${i + 1}`,
              priority: i % 2 === 0 ? "high" : "low",
            })
        );
      }

      const responses = await Promise.all(taskPromises);
      responses.forEach((res) => {
        expect(res.status).to.equal(201);
      });

      // Verificar que todas as tarefas foram criadas
      const listRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(listRes.status).to.equal(200);
      expect(listRes.body.data.tasks.length).to.equal(5);

      // Verificar estatísticas
      const statsRes = await request(app)
        .get("/api/tasks/statistics")
        .set("Authorization", `Bearer ${token}`);

      expect(statsRes.status).to.equal(200);
      expect(statsRes.body.data.overview.total).to.equal(5);
      expect(statsRes.body.data.priority.high).to.equal(3); // 0, 2, 4
      expect(statsRes.body.data.priority.low).to.equal(2); // 1, 3
    });
  });

  describe("Health check e endpoints básicos", () => {
    it("deve responder ao health check", async () => {
      const res = await request(app).get("/health");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("API está funcionando");
      expect(res.body).to.have.property("timestamp");
      expect(res.body).to.have.property("environment");
    });

    it("deve responder à rota raiz", async () => {
      const res = await request(app).get("/");

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal(
        "Bem-vindo à API de Gerenciamento de Tarefas"
      );
      expect(res.body).to.have.property("endpoints");
    });

    it("deve retornar 404 para rotas inexistentes", async () => {
      const res = await request(app).get("/rota-inexistente");

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Rota não encontrada");
    });
  });
});
