const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const database = require("../config/database");
const { generateToken } = require("../middleware/auth");

class AuthController {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      const existingUser = database.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email já está em uso",
        });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = database.createUser({
        name,
        email,
        password: hashedPassword,
        apiKey: uuidv4(),
      });

      const token = generateToken(user.id);

      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        message: "Usuário criado com sucesso",
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = database.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Credenciais inválidas",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Credenciais inválidas",
        });
      }

      const token = generateToken(user.id);

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: "Login realizado com sucesso",
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getProfile(req, res) {
    try {
      const { password: _, ...userWithoutPassword } = req.user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.error("Erro ao obter perfil:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const userId = req.user.id;

      if (email) {
        const existingUser = database.findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            success: false,
            message: "Email já está em uso por outro usuário",
          });
        }
      }

      const updatedUser = database.updateUser(userId, { name, email });
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        message: "Perfil atualizado com sucesso",
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      const userTasks = database.findTasksByUserId(userId);
      userTasks.forEach((task) => database.deleteTask(task.id));

      const deleted = database.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      res.json({
        success: true,
        message: "Conta deletada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
}

module.exports = new AuthController();
