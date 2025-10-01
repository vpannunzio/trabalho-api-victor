const request = require("supertest");
const { expect } = require("chai");
const app = require("../../src/app");
const database = require("../../src/config/database");

describe("AuthController - Testes Unitários com Supertest", () => {
  let authToken;

  beforeEach(() => {
    // Limpar banco de dados
    database.users.clear();
    database.tasks.clear();
    database.nextUserId = 1;
    database.nextTaskId = 1;
  });

  describe("POST /api/auth/register", () => {
    it("deve registrar um novo usuário com sucesso", async () => {
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.user.name).to.equal("João Silva");
      expect(response.body.data.user.email).to.equal("joao@example.com");
      expect(response.body.data.user.password).to.be.undefined; // Senha não deve ser retornada
      expect(response.body.data.token).to.be.a("string");
    });

    it("deve retornar erro ao tentar registrar email duplicado", async () => {
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Primeiro registro
      await request(app).post("/api/auth/register").send(userData);

      // Tentativa de registro duplicado
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).to.equal(409);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Email já está em uso");
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      const invalidData = {
        name: "A", // Nome muito curto
        email: "email-invalido", // Email inválido
        password: "123", // Senha muito curta
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Dados inválidos");
      expect(response.body.errors).to.be.an("array");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Criar usuário para testes de login
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      authToken = response.body.data.token;
    });

    it("deve fazer login com credenciais válidas", async () => {
      const loginData = {
        email: "joao@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal("joao@example.com");
      expect(response.body.data.token).to.be.a("string");
    });

    it("deve retornar erro com email inexistente", async () => {
      const loginData = {
        email: "inexistente@example.com",
        password: "123456",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Credenciais inválidas");
    });

    it("deve retornar erro com senha incorreta", async () => {
      const loginData = {
        email: "joao@example.com",
        password: "senha-errada",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal("Credenciais inválidas");
    });
  });

  describe("GET /api/auth/profile", () => {
    beforeEach(async () => {
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
    });

    it("deve retornar perfil do usuário autenticado", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.user.name).to.equal("João Silva");
      expect(response.body.data.user.email).to.equal("joao@example.com");
      expect(response.body.data.user.password).to.be.undefined;
    });

    it("deve retornar erro sem token de autenticação", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });

    it("deve retornar erro com token inválido", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token-invalido");

      // Token inválido pode retornar qualquer status de erro
      expect(response.status).to.be.greaterThanOrEqual(400);
      expect(response.body.success).to.be.false;
    });
  });

  describe("PUT /api/auth/profile", () => {
    beforeEach(async () => {
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
    });

    it("deve atualizar perfil com dados válidos", async () => {
      const updateData = {
        name: "João Santos",
        email: "joao.santos@example.com",
      };

      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.user.name).to.equal("João Santos");
      expect(response.body.data.user.email).to.equal("joao.santos@example.com");
    });

    it("deve retornar erro ao tentar usar email já existente", async () => {
      // Criar segundo usuário
      await request(app).post("/api/auth/register").send({
        name: "Maria Silva",
        email: "maria@example.com",
        password: "123456",
      });

      const updateData = {
        email: "maria@example.com", // Email já em uso
      };

      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).to.equal(409);
      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal(
        "Email já está em uso por outro usuário"
      );
    });
  });

  describe("DELETE /api/auth/account", () => {
    beforeEach(async () => {
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
    });

    it("deve deletar conta do usuário", async () => {
      const response = await request(app)
        .delete("/api/auth/account")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal("Conta deletada com sucesso");

      // Verificar se o usuário foi realmente deletado
      const profileResponse = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      // Após deletar, pode retornar qualquer status de erro
      expect(profileResponse.status).to.be.greaterThanOrEqual(400);
    });
  });
});
