const sinon = require("sinon");
const bcrypt = require("bcryptjs");
const authController = require("../../src/controllers/authController");
const database = require("../../src/config/database");

describe("AuthController - Testes Unitários Simplificados", () => {
  let req, res, sandbox;

  beforeEach(() => {
    database.users.clear();
    database.nextUserId = 1;

    sandbox = sinon.createSandbox();

    req = {
      body: {},
      user: {},
    };

    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub().returnsThis(),
    };

    // Configurar o mock para que res.status().json() funcione
    res.status.returns(res);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("register", () => {
    it("deve registrar um novo usuário com sucesso", async () => {
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      await authController.register(req, res);

      sinon.assert.calledWith(res.status, 201);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.user).to.have.property("id");
      expect(responseData.data.user.email).to.equal("joao@example.com");
      expect(responseData.data.user.name).to.equal("João Silva");
      expect(responseData.data).to.have.property("token");
    });

    it("deve retornar erro ao tentar registrar email duplicado", async () => {
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      await authController.register(req, res);
      res.status.reset();
      res.json.reset();

      req.body = {
        name: "João Santos",
        email: "joao@example.com",
        password: "654321",
      };

      await authController.register(req, res);

      sinon.assert.calledWith(res.status, 409);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Email já está em uso");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };
      await authController.register(req, res);
      res.status.reset();
      res.json.reset();
    });

    it("deve fazer login com credenciais válidas", async () => {
      req.body = {
        email: "joao@example.com",
        password: "123456",
      };

      await authController.login(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.user.email).to.equal("joao@example.com");
      expect(responseData.data).to.have.property("token");
    });

    it("deve retornar erro com email inexistente", async () => {
      req.body = {
        email: "inexistente@example.com",
        password: "123456",
      };

      await authController.login(req, res);

      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Credenciais inválidas");
    });
  });

  describe("getProfile", () => {
    beforeEach(async () => {
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };
      await authController.register(req, res);

      req.user = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
      };

      res.status.reset();
      res.json.reset();
    });

    it("deve retornar perfil do usuário autenticado", async () => {
      await authController.getProfile(req, res);

      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.user.id).to.equal(1);
      expect(responseData.data.user.email).to.equal("joao@example.com");
      expect(responseData.data.user.name).to.equal("João Silva");
    });
  });
});
