const sinon = require("sinon");
const bcrypt = require("bcryptjs");
const database = require("../../src/config/database");

describe("Exemplo de Testes Unitários com Sinon", () => {
  let sandbox;

  beforeEach(() => {
    database.users.clear();
    database.nextUserId = 1;

    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("Testando bcrypt com Sinon", () => {
    it("deve testar hash de senha com stub", async () => {
      const bcryptHashStub = sandbox.stub(bcrypt, "hash");
      bcryptHashStub.resolves("hashed_password_123");

      const result = await bcrypt.hash("123456", 10);

      expect(result).to.equal("hashed_password_123");
      sinon.assert.calledWith(bcryptHashStub, "123456", 10);
    });

    it("deve testar comparação de senha com stub", async () => {
      const bcryptCompareStub = sandbox.stub(bcrypt, "compare");
      bcryptCompareStub.resolves(true);

      const result = await bcrypt.compare("123456", "hashed_password");

      expect(result).to.be.true;
      sinon.assert.calledWith(bcryptCompareStub, "123456", "hashed_password");
    });
  });

  describe("Testando database com Sinon", () => {
    it("deve testar criação de usuário com stub", () => {
      const createUserStub = sandbox.stub(database, "createUser");
      createUserStub.returns({
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashed_password",
      });

      const user = database.createUser({
        name: "João Silva",
        email: "joao@example.com",
        password: "hashed_password",
      });

      expect(user.id).to.equal(1);
      expect(user.name).to.equal("João Silva");
      expect(user.email).to.equal("joao@example.com");
      sinon.assert.calledOnce(createUserStub);
    });

    it("deve testar busca de usuário por email com stub", () => {
      const findUserByEmailStub = sandbox.stub(database, "findUserByEmail");
      findUserByEmailStub.returns({
        id: 1,
        name: "João Silva",
        email: "joao@example.com",
        password: "hashed_password",
      });

      const user = database.findUserByEmail("joao@example.com");

      expect(user).to.not.be.undefined;
      expect(user.email).to.equal("joao@example.com");
      sinon.assert.calledWith(findUserByEmailStub, "joao@example.com");
    });
  });

  describe("Testando funções com spies", () => {
    it("deve testar se função foi chamada com spy", () => {
      const callback = sandbox.spy();

      callback("teste");

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWith(callback, "teste");
    });

    it("deve testar múltiplas chamadas com spy", () => {
      const callback = sandbox.spy();

      callback("primeira");
      callback("segunda");
      callback("terceira");

      sinon.assert.calledThrice(callback);
      sinon.assert.calledWith(callback, "primeira");
      sinon.assert.calledWith(callback, "segunda");
      sinon.assert.calledWith(callback, "terceira");
    });
  });

  describe("Testando com mocks", () => {
    it("deve testar objeto mock completo", () => {
      const mockResponse = {
        status: sandbox.stub().returnsThis(),
        json: sandbox.stub().returnsThis(),
        send: sandbox.stub().returnsThis(),
      };

      mockResponse.status(200).json({ success: true });

      sinon.assert.calledWith(mockResponse.status, 200);
      sinon.assert.calledWith(mockResponse.json, { success: true });
    });
  });

  describe("Testando cenários de erro", () => {
    it("deve testar erro com stub que rejeita", async () => {
      const errorStub = sandbox.stub(bcrypt, "hash");
      errorStub.rejects(new Error("Erro de hash"));

      try {
        await bcrypt.hash("123456", 10);
        expect.fail("Deveria ter lançado erro");
      } catch (error) {
        expect(error.message).to.equal("Erro de hash");
      }

      sinon.assert.calledOnce(errorStub);
    });
  });
});
