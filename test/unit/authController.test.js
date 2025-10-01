const sinon = require("sinon");
const bcrypt = require("bcryptjs");
const authController = require("../../src/controllers/authController");
const database = require("../../src/config/database");
const { generateToken } = require("../../src/middleware/auth");

describe("AuthController - Testes Unitários", () => {
  let req, res, sandbox;

  beforeEach(() => {
    // Limpar banco de dados
    database.users.clear();
    database.nextUserId = 1;

    // Criar sandbox para stubs
    sandbox = sinon.createSandbox();

    // Mock do objeto request
    req = {
      body: {},
      user: {},
    };

    // Criar um mock mais robusto para res
    res = {
      status: sandbox.stub(),
      json: sandbox.stub(),
    };

    // Configurar o mock para que res.status().json() funcione
    res.status.returns(res);
    res.json.returns(res);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("register", () => {
    it("deve registrar um novo usuário com sucesso", async () => {
      // Arrange
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.register(req, res);

      // Assert
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
      // Arrange
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Registrar primeiro usuário
      await authController.register(req, res);
      res.status.reset();
      res.json.reset();

      // Tentar registrar com mesmo email
      req.body = {
        name: "João Santos",
        email: "joao@example.com",
        password: "654321",
      };

      // Act
      await authController.register(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 409);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Email já está em uso");
    });

    it("deve hash da senha corretamente", async () => {
      // Arrange
      const bcryptHashStub = sandbox.stub(bcrypt, "hash");
      bcryptHashStub.resolves("hashed_password");

      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.register(req, res);

      // Assert
      sinon.assert.calledWith(bcryptHashStub, "123456", 12);
    });

    it("deve gerar token JWT corretamente", async () => {
      // Arrange
      const generateTokenStub = sandbox.stub(
        require("../../src/middleware/auth"),
        "generateToken"
      );
      generateTokenStub.returns("mock_jwt_token");

      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.register(req, res);

      // Assert
      sinon.assert.calledOnce(generateTokenStub);
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.data.token).to.equal("mock_jwt_token");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      // Criar usuário para testes de login
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
      // Arrange
      req.body = {
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.login(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.user.email).to.equal("joao@example.com");
      expect(responseData.data).to.have.property("token");
    });

    it("deve retornar erro com email inexistente", async () => {
      // Arrange
      req.body = {
        email: "inexistente@example.com",
        password: "123456",
      };

      // Act
      await authController.login(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Credenciais inválidas");
    });

    it("deve retornar erro com senha incorreta", async () => {
      // Arrange
      req.body = {
        email: "joao@example.com",
        password: "senha_errada",
      };

      // Act
      await authController.login(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 401);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Credenciais inválidas");
    });

    it("deve comparar senha com bcrypt corretamente", async () => {
      // Arrange
      const bcryptCompareStub = sandbox.stub(bcrypt, "compare");
      bcryptCompareStub.resolves(true);

      req.body = {
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.login(req, res);

      // Assert
      sinon.assert.calledOnce(bcryptCompareStub);
    });
  });

  describe("getProfile", () => {
    beforeEach(async () => {
      // Criar usuário e fazer login
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };
      await authController.register(req, res);

      // Simular usuário autenticado
      req.user = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
      };

      res.status.reset();
      res.json.reset();
    });

    it("deve retornar perfil do usuário autenticado", async () => {
      // Act
      await authController.getProfile(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.user.id).to.equal(1);
      expect(responseData.data.user.email).to.equal("joao@example.com");
      expect(responseData.data.user.name).to.equal("João Silva");
    });
  });

  describe("updateProfile", () => {
    beforeEach(async () => {
      // Criar usuário
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };
      await authController.register(req, res);

      // Simular usuário autenticado
      req.user = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
      };

      res.status.reset();
      res.json.reset();
    });

    it("deve atualizar perfil com dados válidos", async () => {
      // Arrange
      req.body = {
        name: "João Santos",
        email: "joao.santos@example.com",
      };

      // Act
      await authController.updateProfile(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.user.name).to.equal("João Santos");
      expect(responseData.data.user.email).to.equal("joao.santos@example.com");
    });

    it("deve retornar erro ao tentar usar email já existente", async () => {
      // Arrange - criar segundo usuário
      const secondReq = {
        body: { name: "Maria", email: "maria@example.com", password: "123456" },
      };
      const secondRes = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub().returnsThis(),
      };
      await authController.register(secondReq, secondRes);

      // Tentar atualizar com email já existente
      req.body = {
        email: "maria@example.com",
      };

      // Act
      await authController.updateProfile(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 409);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal(
        "Email já está em uso por outro usuário"
      );
    });
  });

  describe("deleteAccount", () => {
    beforeEach(async () => {
      // Criar usuário
      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };
      await authController.register(req, res);

      // Simular usuário autenticado
      req.user = {
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
      };

      res.status.reset();
      res.json.reset();
    });

    it("deve deletar conta do usuário", async () => {
      // Act
      await authController.deleteAccount(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 200);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.message).to.equal("Conta deletada com sucesso");

      // Verificar se usuário foi removido do banco
      const user = database.findUserById(1);
      expect(user).to.be.undefined;
    });
  });

  describe("Cenários de Erro", () => {
    it("deve lidar com erro de hash de senha", async () => {
      // Arrange
      const bcryptHashStub = sandbox.stub(bcrypt, "hash");
      bcryptHashStub.rejects(new Error("Erro de hash"));

      req.body = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.register(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Erro interno do servidor");
    });

    it("deve lidar com erro de comparação de senha", async () => {
      // Arrange
      const bcryptCompareStub = sandbox.stub(bcrypt, "compare");
      bcryptCompareStub.rejects(new Error("Erro de comparação"));

      req.body = {
        email: "joao@example.com",
        password: "123456",
      };

      // Act
      await authController.login(req, res);

      // Assert
      sinon.assert.calledWith(res.status, 500);
      sinon.assert.calledOnce(res.json);

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.message).to.equal("Erro interno do servidor");
    });
  });
});
