const request = require("supertest");
const app = require("../src/app");

describe("Testes de Performance e Carga - API REST", () => {
  beforeEach(() => {
    clearDatabase();
  });

  describe("Testes de Carga de Usuários", () => {
    it("deve registrar múltiplos usuários simultaneamente", async () => {
      const userPromises = [];
      const userCount = 20;

      for (let i = 0; i < userCount; i++) {
        userPromises.push(
          request(app)
            .post("/api/auth/register")
            .send({
              name: `Usuário ${i + 1}`,
              email: `user${i + 1}@example.com`,
              password: "123456",
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(userPromises);
      const endTime = Date.now();

      const successful = results.filter((res) => res.status === 201);
      expect(successful.length).to.equal(userCount);
      expect(endTime - startTime).to.be.lessThan(10000); // Deve completar em menos de 10 segundos
    });

    it("deve fazer login de múltiplos usuários simultaneamente", async () => {
      const userPromises = [];
      for (let i = 0; i < 10; i++) {
        userPromises.push(
          request(app)
            .post("/api/auth/register")
            .send({
              name: `Login User ${i + 1}`,
              email: `loginuser${i + 1}@example.com`,
              password: "123456",
            })
        );
      }
      await Promise.all(userPromises);

      const loginPromises = [];
      for (let i = 0; i < 10; i++) {
        loginPromises.push(
          request(app)
            .post("/api/auth/login")
            .send({
              email: `loginuser${i + 1}@example.com`,
              password: "123456",
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(loginPromises);
      const endTime = Date.now();

      const successful = results.filter((res) => res.status === 200);
      expect(successful.length).to.equal(10);
      expect(endTime - startTime).to.be.lessThan(3000);
    });
  });

  describe("Testes de Carga de Tarefas", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Load Test User",
        email: "loadtest@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve criar muitas tarefas rapidamente", async () => {
      const taskCount = 100;
      const taskPromises = [];

      for (let i = 0; i < taskCount; i++) {
        taskPromises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa de Carga ${i + 1}`,
              description: `Descrição da tarefa ${i + 1}`,
              priority: ["low", "medium", "high"][i % 3],
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(taskPromises);
      const endTime = Date.now();

      const successful = results.filter((res) => res.status === 201);
      expect(successful.length).to.be.greaterThanOrEqual(90); // Pelo menos 90% devem ter sucesso
      expect(endTime - startTime).to.be.lessThan(10000); // 10 segundos para 100 tarefas
    });

    it("deve listar tarefas com performance adequada", async () => {
      const createPromises = [];
      for (let i = 0; i < 200; i++) {
        createPromises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa ${i + 1}`,
              priority: ["low", "medium", "high"][i % 3],
            })
        );
      }
      await Promise.all(createPromises);

      const pageSizes = [10, 25, 50, 100];

      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        const res = await request(app)
          .get(`/api/tasks?page=1&limit=${pageSize}`)
          .set("Authorization", `Bearer ${token}`);
        const endTime = Date.now();

        expect(res.status).to.equal(200);
        expect(res.body.data.tasks.length).to.be.lessThanOrEqual(pageSize);
        expect(endTime - startTime).to.be.lessThan(2000);
      }
    });

    it("deve atualizar tarefas em lote com performance", async () => {
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa Original ${i + 1}`,
              priority: "medium",
            })
        );
      }
      const createResults = await Promise.all(createPromises);
      const taskIds = createResults.map((res) => res.body.data.task.id);

      const updatePromises = taskIds.map((id, index) =>
        request(app)
          .put(`/api/tasks/${id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            title: `Tarefa Atualizada ${index + 1}`,
            priority: "high",
          })
      );

      const startTime = Date.now();
      const results = await Promise.all(updatePromises);
      const endTime = Date.now();

      const successful = results.filter((res) => res.status === 200);
      expect(successful.length).to.equal(50);
      expect(endTime - startTime).to.be.lessThan(5000);
    });
  });

  describe("Testes de Stress", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Stress Test User",
        email: "stresstest@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve lidar com operações CRUD simultâneas", async () => {
      const operations = [];

      for (let i = 0; i < 20; i++) {
        operations.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Stress Task ${i}`,
              priority: "medium",
            })
        );

        operations.push(
          request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`)
        );

        operations.push(
          request(app)
            .get("/api/tasks/statistics")
            .set("Authorization", `Bearer ${token}`)
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      const successful = results.filter(
        (res) => res.status >= 200 && res.status < 300
      );
      expect(successful.length).to.be.greaterThan(results.length * 0.8);
      expect(endTime - startTime).to.be.lessThan(15000);
    });

    it("deve manter performance com múltiplos usuários", async () => {
      const userPromises = [];
      for (let i = 0; i < 5; i++) {
        userPromises.push(
          request(app)
            .post("/api/auth/register")
            .send({
              name: `Multi User ${i + 1}`,
              email: `multiuser${i + 1}@example.com`,
              password: "123456",
            })
        );
      }
      const userResults = await Promise.all(userPromises);
      const tokens = userResults.map((res) => res.body.data.token);

      const allOperations = [];
      tokens.forEach((userToken, userIndex) => {
        for (let i = 0; i < 20; i++) {
          allOperations.push(
            request(app)
              .post("/api/tasks")
              .set("Authorization", `Bearer ${userToken}`)
              .send({
                title: `User ${userIndex + 1} Task ${i + 1}`,
                priority: ["low", "medium", "high"][i % 3],
              })
          );
        }
      });

      const startTime = Date.now();
      const results = await Promise.all(allOperations);
      const endTime = Date.now();

      const successful = results.filter((res) => res.status === 201);
      expect(successful.length).to.equal(100);
      expect(endTime - startTime).to.be.lessThan(20000);
    });
  });

  describe("Testes de Memória e Recursos", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Memory Test User",
        email: "memorytest@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve lidar com dados grandes sem vazamento de memória", async () => {
      const largeDescriptions = [];
      for (let i = 0; i < 10; i++) {
        largeDescriptions.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa com Descrição Grande ${i + 1}`,
              description: "A".repeat(1000) + " - " + "B".repeat(1000),
              priority: "high",
            })
        );
      }

      const results = await Promise.all(largeDescriptions);
      const successful = results.filter((res) => res.status === 201);
      expect(successful.length).to.be.greaterThanOrEqual(10);

      const listRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(listRes.status).to.equal(200);
      expect(listRes.body.data.tasks.length).to.equal(10);
    });

    it("deve limpar recursos adequadamente após operações", async () => {
      const createPromises = [];
      for (let i = 0; i < 50; i++) {
        createPromises.push(
          request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({
              title: `Tarefa Temporária ${i + 1}`,
              priority: "medium",
            })
        );
      }
      const createResults = await Promise.all(createPromises);
      const taskIds = createResults.map((res) => res.body.data.task.id);

      const deletePromises = taskIds.map((id) =>
        request(app)
          .delete(`/api/tasks/${id}`)
          .set("Authorization", `Bearer ${token}`)
      );

      const deleteResults = await Promise.all(deletePromises);
      const deleted = deleteResults.filter((res) => res.status === 200);
      expect(deleted.length).to.equal(50);

      const finalListRes = await request(app)
        .get("/api/tasks")
        .set("Authorization", `Bearer ${token}`);

      expect(finalListRes.status).to.equal(200);
      expect(finalListRes.body.data.tasks.length).to.equal(0);
    });
  });

  describe("Testes de Concorrência", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Concurrency Test User",
        email: "concurrency@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve manter consistência com atualizações concorrentes", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Concorrente",
          description: "Teste de consistência",
          priority: "medium",
        });

      const taskId = createRes.body.data.task.id;

      const updatePromises = [];
      for (let i = 0; i < 10; i++) {
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

      const successful = results.filter((res) => res.status === 200);
      expect(successful.length).to.be.greaterThan(0);

      const finalRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(finalRes.status).to.equal(200);
      expect(finalRes.body.data.task.id).to.equal(taskId);
    });

    it("deve lidar com toggle concorrente de tarefas", async () => {
      const createRes = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Tarefa Toggle Concorrente",
          priority: "high",
        });

      const taskId = createRes.body.data.task.id;

      const togglePromises = [];
      for (let i = 0; i < 20; i++) {
        togglePromises.push(
          request(app)
            .patch(`/api/tasks/${taskId}/toggle`)
            .set("Authorization", `Bearer ${token}`)
        );
      }

      const results = await Promise.all(togglePromises);

      const successful = results.filter((res) => res.status === 200);
      expect(successful.length).to.equal(20);

      const finalRes = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(finalRes.status).to.equal(200);
      expect(finalRes.body.data.task).to.have.property("completed");
    });
  });
});
