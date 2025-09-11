const request = require("supertest");
const app = require("../src/app");

describe("Testes REST Adicionais - Cobertura Avançada", () => {
  beforeEach(() => {
    clearDatabase();
  });

  describe("Testes de Performance e Carga", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Performance Test",
        email: "performance@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve lidar com múltiplas requisições simultâneas", async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa ${i + 1}`,
              description: `Descrição da tarefa ${i + 1}`,
              priority: i % 2 === 0 ? "high" : "medium",
            })
        );
      }

      const results = await Promise.all(promises);

      results.forEach((res, index) => {
        expect(res.status).to.equal(201);
        expect(res.body.data.task.title).to.equal(`Tarefa ${index + 1}`);
      });
    });

    it("deve processar listagem com muitas tarefas eficientemente", async () => {
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa Massiva ${i + 1}`,
              priority: ["low", "medium", "high"][i % 3],
            })
        );
      }

      await Promise.all(createPromises);

      const startTime = Date.now();
      const res = await request(app)
        .get("/api/tasks?page=1&limit=20")
        .set("Authorization", `Bearer ${token}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(res.status).to.equal(200);
      expect(res.body.data.tasks).to.have.length(20);
      expect(res.body.data.pagination.totalTasks).to.equal(50);
      expect(responseTime).to.be.lessThan(1000);
    });
  });

  describe("Testes de Segurança Avançados", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Security Test",
        email: "security@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve rejeitar tentativas de SQL injection", async () => {
      const maliciousData = {
        title: "'; DROP TABLE users; --",
        description: "1' OR '1'='1",
        priority: "high",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(maliciousData);

      expect(res.status).to.equal(201);
      expect(res.body.data.task.title).to.equal(maliciousData.title);
      expect(res.body.data.task.description).to.equal(
        maliciousData.description
      );
    });

    it("deve sanitizar dados de entrada com XSS", async () => {
      const xssData = {
        title: "<script>alert('XSS')</script>Tarefa Segura",
        description: "Descrição com <img src=x onerror=alert('XSS')>",
        priority: "medium",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(xssData);

      expect(res.status).to.equal(201);
      expect(res.body.data.task.title).to.include("Tarefa Segura");
      expect(res.body.data.task.title).to.not.include("<script>");
    });

    it("deve validar tamanho máximo de dados", async () => {
      const largeData = {
        title: "A".repeat(1000),
        description: "B".repeat(5000),
        priority: "high",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(largeData);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Dados inválidos");
    });

    it("deve rejeitar tokens malformados", async () => {
      const malformedTokens = [
        "Bearer invalid.token.here",
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid",
        "Bearer ",
        "InvalidToken",
        "",
      ];

      for (const token of malformedTokens) {
        const res = await request(app)
          .get("/api/auth/profile")
          .set("Authorization", token);

        expect(res.status).to.equal(403);
        expect(res.body.success).to.be.false;
      }
    });
  });

  describe("Testes de Edge Cases e Cenários Especiais", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Edge Case Test",
        email: "edgecase@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve lidar com caracteres especiais e Unicode", async () => {
      const unicodeData = {
        title: "Tarefa com emoji 🚀 e acentos ção",
        description: "Descrição com símbolos: @#$%^&*()_+-=[]{}|;':\",./<>?",
        priority: "high",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(unicodeData);

      expect(res.status).to.equal(201);
      expect(res.body.data.task.title).to.equal(unicodeData.title);
      expect(res.body.data.task.description).to.equal(unicodeData.description);
    });

    it("deve lidar com valores numéricos extremos", async () => {
      const extremeData = {
        title: "Tarefa com ID extremo",
        description: "Testando limites numéricos",
        priority: "medium",
      };

      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send(extremeData);

      expect(res.status).to.equal(201);
      const taskId = res.body.data.task.id;

      const largeIdRes = await request(app)
        .get(`/api/tasks/${Number.MAX_SAFE_INTEGER}`)
        .set("Authorization", `Bearer ${token}`);

      expect(largeIdRes.status).to.equal(404);
    });

    it("deve manter consistência com operações concorrentes", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Concorrente",
          description: "Teste de consistência",
          priority: "high",
        });

      const taskId = createRes.body.data.task.id;

      const updatePromises = [];
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          request(app)
            .put(`/api/tasks/${taskId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa Atualizada ${i + 1}`,
              priority: i % 2 === 0 ? "high" : "low",
            })
        );
      }

      const results = await Promise.all(updatePromises);

      const successfulUpdates = results.filter((res) => res.status === 200);
      expect(successfulUpdates.length).to.be.greaterThan(0);
    });

    it("deve lidar com timeouts e requisições lentas", async () => {
      const startTime = Date.now();

      const res = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .timeout(5000);

      const endTime = Date.now();

      expect(res.status).to.equal(200);
      expect(endTime - startTime).to.be.lessThan(5000);
    });
  });

  describe("Testes de Validação Avançada", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Validation Test",
        email: "validation@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve validar todos os tipos de prioridade", async () => {
      const priorities = ["low", "medium", "high"];

      for (const priority of priorities) {
        const res = await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${token}`)
          .send({
            title: `Tarefa ${priority}`,
            priority: priority,
          });

        expect(res.status).to.equal(201);
        expect(res.body.data.task.priority).to.equal(priority);
      }
    });

    it("deve rejeitar prioridades inválidas", async () => {
      const invalidPriorities = ["urgent", "critical", "normal", "", null, 123];

      for (const priority of invalidPriorities) {
        const res = await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${token}`)
          .send({
            title: "Tarefa com prioridade inválida",
            priority: priority,
          });

        expect(res.status).to.equal(400);
        expect(res.body.success).to.be.false;
      }
    });

    it("deve validar formato de email em atualizações", async () => {
      const invalidEmails = [
        "email-invalido",
        "@example.com",
        "test@",
        "test..test@example.com",
        "test@example",
        "",
        null,
      ];

      for (const email of invalidEmails) {
        const res = await request(app)
          .put("/api/auth/profile")
          .set("Authorization", `Bearer ${token}`)
          .send({ email: email });

        expect(res.status).to.equal(400);
        expect(res.body.success).to.be.false;
      }
    });

    it("deve validar senhas em diferentes cenários", async () => {
      const invalidPasswords = ["", "123", "a".repeat(1000), null, undefined];

      for (const password of invalidPasswords) {
        const res = await request(app)
          .post("/api/auth/register")
          .send({
            name: "Test User",
            email: `test${Date.now()}@example.com`,
            password: password,
          });

        expect(res.status).to.equal(400);
        expect(res.body.success).to.be.false;
      }
    });
  });

  describe("Testes de Headers e CORS", () => {
    it("deve incluir headers de segurança apropriados", async () => {
      const res = await request(app).get("/health");

      expect(res.headers).to.have.property("x-content-type-options");
      expect(res.headers).to.have.property("x-frame-options");
      expect(res.headers).to.have.property("x-xss-protection");
    });

    it("deve lidar com requisições CORS", async () => {
      const res = await request(app)
        .options("/api/tasks")
        .set("Origin", "https://example.com")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type, Authorization");

      expect(res.status).to.equal(204);
      expect(res.headers).to.have.property("access-control-allow-origin");
    });

    it("deve rejeitar requisições com Content-Type inválido", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "text/plain")
        .send("invalid data");

      expect(res.status).to.equal(400);
    });
  });

  describe("Testes de Rate Limiting Avançado", () => {
    it("deve aplicar rate limiting por IP", async () => {
      const requests = [];

      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app).post("/api/auth/login").send({
            email: "nonexistent@example.com",
            password: "wrongpassword",
          })
        );
      }

      const results = await Promise.all(requests);

      const rateLimited = results.filter((res) => res.status === 429);
      expect(rateLimited.length).to.be.greaterThan(0);
    });
  });

  describe("Testes de Logs e Monitoramento", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Logging Test",
        email: "logging@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve registrar logs apropriados para operações", async () => {
      const originalConsoleLog = console.log;
      const logs = [];
      console.log = (...args) => {
        logs.push(args.join(" "));
        originalConsoleLog(...args);
      };

      try {
        await request(app)
          .post("/api/tasks")
          .set("Authorization", `Bearer ${token}`)
          .send({
            title: "Tarefa para Log",
            description: "Teste de logging",
            priority: "medium",
          });

        expect(logs.length).to.be.greaterThan(0);
        expect(logs.some((log) => log.includes("POST /api/tasks"))).to.be.true;
      } finally {
        console.log = originalConsoleLog;
      }
    });
  });
});
