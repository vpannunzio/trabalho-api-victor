const request = require("supertest");
const app = require("../src/app");

describe("Autenticação", () => {
  beforeEach(() => {
    clearDatabase();
  });
  describe("POST /api/auth/register", () => {
    it("deve registrar um novo usuário com dados válidos", async () => {
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      const res = await request(app).post("/api/auth/register").send(userData);

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Usuário criado com sucesso");
      expect(res.body.data.user).to.have.property("id");
      expect(res.body.data.user).to.have.property("name", userData.name);
      expect(res.body.data.user).to.have.property("email", userData.email);
      expect(res.body.data.user).to.not.have.property("password");
      expect(res.body.data).to.have.property("token");
    });

    it("deve retornar erro ao tentar registrar com email duplicado", async () => {
      const userData = {
        name: "João Silva",
        email: "joao@example.com",
        password: "123456",
      };

      // Primeiro registro
      await request(app).post("/api/auth/register").send(userData);

      // Segundo registro com mesmo email
      const res = await request(app).post("/api/auth/register").send(userData);

      expect(res.status).to.equal(409);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Email já está em uso");
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      const invalidData = {
        name: "A",
        email: "email-invalido",
        password: "123",
      };

      const res = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Dados inválidos");
      expect(res.body.errors).to.be.an("array");
      expect(res.body.errors.length).to.be.greaterThan(0);
    });

    it("deve retornar erro ao tentar registrar sem dados obrigatórios", async () => {
      const res = await request(app).post("/api/auth/register").send({});

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.errors).to.be.an("array");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await createTestUser(app, {
        name: "Usuário Login",
        email: "login@example.com",
        password: "123456",
      });
    });

    it("deve fazer login com credenciais válidas", async () => {
      const loginData = {
        email: "login@example.com",
        password: "123456",
      };

      const res = await request(app).post("/api/auth/login").send(loginData);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Login realizado com sucesso");
      expect(res.body.data.user).to.have.property("email", loginData.email);
      expect(res.body.data).to.have.property("token");
    });

    it("deve retornar erro com email inexistente", async () => {
      const loginData = {
        email: "inexistente@example.com",
        password: "123456",
      };

      const res = await request(app).post("/api/auth/login").send(loginData);

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Credenciais inválidas");
    });

    it("deve retornar erro com senha incorreta", async () => {
      const loginData = {
        email: "login@example.com",
        password: "senhaerrada",
      };

      const res = await request(app).post("/api/auth/login").send(loginData);

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Credenciais inválidas");
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      await delay(100);

      const invalidData = {
        email: "email-invalido",
        password: "",
      };

      const res = await request(app).post("/api/auth/login").send(invalidData);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Dados inválidos");
    });
  });

  describe("GET /api/auth/profile", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Perfil Teste",
        email: "perfil@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve retornar perfil do usuário autenticado", async () => {
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.user).to.have.property("id");
      expect(res.body.data.user).to.have.property("name", "Perfil Teste");
      expect(res.body.data.user).to.have.property(
        "email",
        "perfil@example.com"
      );
      expect(res.body.data.user).to.not.have.property("password");
    });

    it("deve retornar erro sem token de autenticação", async () => {
      const res = await request(app).get("/api/auth/profile");

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Token de acesso requerido");
    });

    it("deve retornar erro com token inválido", async () => {
      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer token-invalido");

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Token inválido ou expirado");
    });
  });

  describe("PUT /api/auth/profile", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Atualizar Teste",
        email: "atualizar@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve atualizar perfil com dados válidos", async () => {
      const updateData = {
        name: "Nome Atualizado",
        email: "atualizado@example.com",
      };

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Perfil atualizado com sucesso");
      expect(res.body.data.user).to.have.property("name", updateData.name);
      expect(res.body.data.user).to.have.property("email", updateData.email);
    });

    it("deve retornar erro ao tentar usar email já existente", async () => {
      await createTestUser(app, {
        name: "Outro Usuário",
        email: "outro@example.com",
        password: "123456",
      });

      const updateData = {
        email: "outro@example.com",
      };

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(409);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal(
        "Email já está em uso por outro usuário"
      );
    });

    it("deve retornar erro de validação com dados inválidos", async () => {
      const invalidData = {
        name: "A",
        email: "email-invalido",
      };

      const res = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`)
        .send(invalidData);

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.message).to.equal("Dados inválidos");
    });
  });

  describe("DELETE /api/auth/account", () => {
    let token;

    beforeEach(async () => {
      await delay(100);
      const userData = await createTestUser(app, {
        name: "Deletar Teste",
        email: "deletar@example.com",
        password: "123456",
      });
      token = userData.token;
    });

    it("deve deletar conta do usuário autenticado", async () => {
      const res = await request(app)
        .delete("/api/auth/account")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Conta deletada com sucesso");

      const profileRes = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(profileRes.status).to.equal(403);
    });
  });
});
