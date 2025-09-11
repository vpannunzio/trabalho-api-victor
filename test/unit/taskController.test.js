const sinon = require("sinon");
const taskController = require("../../src/controllers/taskController");
const database = require("../../src/config/database");

describe("TaskController - Testes Unitários", () => {
  let req, res, sandbox;

  beforeEach(() => {
    database.users.clear();
    database.tasks.clear();
    database.nextUserId = 1;
    database.nextTaskId = 1;

    sandbox = sinon.createSandbox();

    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 1 },
    };

    res = {
      status: sandbox.stub(),
      json: sandbox.stub(),
    };
    res.status.returns(res);
    res.json.returns(res);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("createTask", () => {
    it("deve criar uma nova tarefa com dados válidos", async () => {
      req.body = {
        title: "Nova Tarefa",
        description: "Descrição da tarefa",
        priority: "high",
      };

      await taskController.createTask(req, res);

      sinon.assert.calledWith(res.status, 201);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.task).to.have.property("id");
      expect(responseData.data.task.title).to.equal("Nova Tarefa");
      expect(responseData.data.task.description).to.equal(
        "Descrição da tarefa"
      );
      expect(responseData.data.task.priority).to.equal("high");
      expect(responseData.data.task.completed).to.be.false;
      expect(responseData.data.task.userId).to.equal(1);
    });

    it("deve criar tarefa com prioridade padrão quando não especificada", async () => {
      req.body = {
        title: "Tarefa sem prioridade",
        description: "Descrição da tarefa",
      };

      await taskController.createTask(req, res);

      sinon.assert.calledWith(res.status, 201);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.task.priority).to.equal("medium");
    });

    it("deve retornar erro sem autenticação", async () => {
      req.user = null;
      req.body = {
        title: "Nova Tarefa",
        description: "Descrição da tarefa",
      };

      await taskController.createTask(req, res);

      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Token de acesso requerido");
    });
  });

  describe("getTasks", () => {
    beforeEach(async () => {
      await taskController.createTask(
        { body: { title: "Tarefa 1", priority: "high" }, user: { id: 1 } },
        { status: () => ({ json: () => {} }) }
      );
      await taskController.createTask(
        { body: { title: "Tarefa 2", priority: "low" }, user: { id: 1 } },
        { status: () => ({ json: () => {} }) }
      );
      await taskController.createTask(
        { body: { title: "Tarefa 3", priority: "medium" }, user: { id: 1 } },
        { status: () => ({ json: () => {} }) }
      );
    });

    it("deve listar todas as tarefas do usuário", async () => {
      await taskController.getTasks(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.tasks).to.have.length(3);
      expect(responseData.data.pagination.total).to.equal(3);
    });

    it("deve filtrar tarefas por prioridade", async () => {
      req.query = { priority: "high" };

      await taskController.getTasks(req, res);

      sinon.assert.calledWith(res.status, 200);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.length(1);
      expect(responseData.data.tasks[0].priority).to.equal("high");
    });

    it("deve implementar paginação corretamente", async () => {
      req.query = { page: 1, limit: 2 };

      await taskController.getTasks(req, res);

      sinon.assert.calledWith(res.status, 200);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.length(2);
      expect(responseData.data.pagination.page).to.equal(1);
      expect(responseData.data.pagination.limit).to.equal(2);
      expect(responseData.data.pagination.total).to.equal(3);
    });

    it("deve retornar erro sem autenticação", async () => {
      req.user = null;

      await taskController.getTasks(req, res);

      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Token de acesso requerido");
    });
  });

  describe("getTask", () => {
    let taskId;

    beforeEach(async () => {
      const createReq = { body: { title: "Tarefa Teste" }, user: { id: 1 } };
      const createRes = {
        status: () => ({
          json: (data) => {
            taskId = data.data.task.id;
          },
        }),
      };
      await taskController.createTask(createReq, createRes);
    });

    it("deve retornar tarefa específica do usuário", async () => {
      req.params = { id: taskId };

      await taskController.getTask(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.task.id).to.equal(taskId);
      expect(responseData.data.task.title).to.equal("Tarefa Teste");
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      req.params = { id: 99999 };

      await taskController.getTask(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Tarefa não encontrada");
    });

    it("deve retornar erro para ID inválido", async () => {
      req.params = { id: "invalid-id" };

      await taskController.getTask(req, res);

      sinon.assert.calledWith(res.status, 400);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("ID da tarefa inválido");
    });
  });

  describe("updateTask", () => {
    let taskId;

    beforeEach(async () => {
      const createReq = { body: { title: "Tarefa Original" }, user: { id: 1 } };
      const createRes = {
        status: () => ({
          json: (data) => {
            taskId = data.data.task.id;
          },
        }),
      };
      await taskController.createTask(createReq, createRes);
    });

    it("deve atualizar tarefa com dados válidos", async () => {
      req.params = { id: taskId };
      req.body = {
        title: "Tarefa Atualizada",
        description: "Nova descrição",
        priority: "high",
      };

      await taskController.updateTask(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.task.title).to.equal("Tarefa Atualizada");
      expect(responseData.data.task.description).to.equal("Nova descrição");
      expect(responseData.data.task.priority).to.equal("high");
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      req.params = { id: 99999 };
      req.body = { title: "Tarefa Atualizada" };

      await taskController.updateTask(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Tarefa não encontrada");
    });

    it("deve retornar erro para ID inválido", async () => {
      req.params = { id: "invalid-id" };
      req.body = { title: "Tarefa Atualizada" };

      await taskController.updateTask(req, res);

      sinon.assert.calledWith(res.status, 400);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("ID da tarefa inválido");
    });
  });

  describe("toggleTaskCompletion", () => {
    let taskId;

    beforeEach(async () => {
      const createReq = { body: { title: "Tarefa Teste" }, user: { id: 1 } };
      const createRes = {
        status: () => ({
          json: (data) => {
            taskId = data.data.task.id;
          },
        }),
      };
      await taskController.createTask(createReq, createRes);
    });

    it("deve alternar status de conclusão da tarefa", async () => {
      req.params = { id: taskId };

      await taskController.toggleTaskCompletion(req, res);

      sinon.assert.calledWith(res.status, 200);
      let responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.task.completed).to.be.true;

      res.status.reset();
      res.json.reset();

      await taskController.toggleTaskCompletion(req, res);

      sinon.assert.calledWith(res.status, 200);
      responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.task.completed).to.be.false;
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      req.params = { id: 99999 };

      await taskController.toggleTaskCompletion(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Tarefa não encontrada");
    });
  });

  describe("deleteTask", () => {
    let taskId;

    beforeEach(async () => {
      const createReq = {
        body: { title: "Tarefa para Deletar" },
        user: { id: 1 },
      };
      const createRes = {
        status: () => ({
          json: (data) => {
            taskId = data.data.task.id;
          },
        }),
      };
      await taskController.createTask(createReq, createRes);
    });

    it("deve deletar tarefa do usuário", async () => {
      req.params = { id: taskId };

      await taskController.deleteTask(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.message).to.equal("Tarefa deletada com sucesso");

      const task = database.findTaskById(taskId);
      expect(task).to.be.undefined;
    });

    it("deve retornar erro para tarefa inexistente", async () => {
      req.params = { id: 99999 };

      await taskController.deleteTask(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Tarefa não encontrada");
    });
  });

  describe("getTaskStatistics", () => {
    beforeEach(async () => {
      const tasks = [
        { title: "Tarefa 1", priority: "high" },
        { title: "Tarefa 2", priority: "medium" },
        { title: "Tarefa 3", priority: "low" },
        { title: "Tarefa 4", priority: "high" },
      ];

      for (const taskData of tasks) {
        const createReq = { body: taskData, user: { id: 1 } };
        const createRes = { status: () => ({ json: () => {} }) };
        await taskController.createTask(createReq, createRes);
      }

      const toggleReq = { params: { id: 1 }, user: { id: 1 } };
      const toggleRes = { status: () => ({ json: () => {} }) };
      await taskController.toggleTaskCompletion(toggleReq, toggleRes);

      const toggleReq2 = { params: { id: 3 }, user: { id: 1 } };
      await taskController.toggleTaskCompletion(toggleReq2, toggleRes);
    });

    it("deve retornar estatísticas das tarefas", async () => {
      await taskController.getTaskStatistics(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.statistics.total).to.equal(4);
      expect(responseData.data.statistics.completed).to.equal(2);
      expect(responseData.data.statistics.pending).to.equal(2);
      expect(responseData.data.statistics.byPriority.high).to.equal(2);
      expect(responseData.data.statistics.byPriority.medium).to.equal(1);
      expect(responseData.data.statistics.byPriority.low).to.equal(1);
    });

    it("deve retornar erro sem autenticação", async () => {
      req.user = null;

      await taskController.getTaskStatistics(req, res);

      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Token de acesso requerido");
    });
  });

  describe("Isolamento entre usuários", () => {
    beforeEach(async () => {
      req.user = { id: 1 };
      await taskController.createTask(
        { body: { title: "Tarefa Usuário 1" }, user: { id: 1 } },
        { status: () => ({ json: () => {} }) }
      );

      req.user = { id: 2 };
      await taskController.createTask(
        { body: { title: "Tarefa Usuário 2" }, user: { id: 2 } },
        { status: () => ({ json: () => {} }) }
      );
    });

    it("usuário não deve ver tarefas de outros usuários", async () => {
      req.user = { id: 1 };

      await taskController.getTasks(req, res);

      sinon.assert.calledWith(res.status, 200);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.tasks).to.have.length(1);
      expect(responseData.data.tasks[0].title).to.equal("Tarefa Usuário 1");
    });

    it("usuário não deve conseguir acessar tarefa de outro usuário", async () => {
      req.user = { id: 1 };
      req.params = { id: 2 };

      await taskController.getTask(req, res);

      sinon.assert.calledWith(res.status, 404);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Tarefa não encontrada");
    });
  });

  describe("Cenários de Erro", () => {
    it("deve lidar com erro de banco de dados", async () => {
      const databaseStub = sandbox.stub(database, "createTask");
      databaseStub.throws(new Error("Erro de banco de dados"));

      req.body = {
        title: "Nova Tarefa",
        description: "Descrição da tarefa",
      };

      await taskController.createTask(req, res);

      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Erro interno do servidor");
    });
  });
});
