const database = require("../config/database");

class TaskController {
  async createTask(req, res) {
    try {
      const { title, description, priority } = req.body;
      const userId = req.user.id;

      const task = database.createTask({
        title,
        description,
        priority,
        completed: false,
        userId,
      });

      res.status(201).json({
        success: true,
        message: "Tarefa criada com sucesso",
        data: {
          task,
        },
      });
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getTasks(req, res) {
    try {
      const userId = req.user.id;
      const { completed, priority, page = 1, limit = 10 } = req.query;

      let tasks = database.findTasksByUserId(userId);

      if (completed !== undefined) {
        const isCompleted = completed === "true";
        tasks = tasks.filter((task) => task.completed === isCompleted);
      }

      if (priority) {
        tasks = tasks.filter((task) => task.priority === priority);
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTasks = tasks.slice(startIndex, endIndex);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => task.completed).length;
      const pendingTasks = totalTasks - completedTasks;

      res.json({
        success: true,
        data: {
          tasks: paginatedTasks,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalTasks / limit),
            totalTasks,
            hasNextPage: endIndex < totalTasks,
            hasPrevPage: page > 1,
          },
          statistics: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            completionRate:
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao listar tarefas:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = database.findTaskById(parseInt(id));
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tarefa não encontrada",
        });
      }

      if (task.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Acesso negado a esta tarefa",
        });
      }

      res.json({
        success: true,
        data: {
          task,
        },
      });
    } catch (error) {
      console.error("Erro ao obter tarefa:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const task = database.findTaskById(parseInt(id));
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tarefa não encontrada",
        });
      }

      if (task.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Acesso negado a esta tarefa",
        });
      }

      const updatedTask = database.updateTask(parseInt(id), updates);
      if (!updatedTask) {
        return res.status(404).json({
          success: false,
          message: "Erro ao atualizar tarefa",
        });
      }

      res.json({
        success: true,
        message: "Tarefa atualizada com sucesso",
        data: {
          task: updatedTask,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = database.findTaskById(parseInt(id));
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tarefa não encontrada",
        });
      }

      if (task.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Acesso negado a esta tarefa",
        });
      }

      const deleted = database.deleteTask(parseInt(id));
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Erro ao deletar tarefa",
        });
      }

      res.json({
        success: true,
        message: "Tarefa deletada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar tarefa:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async toggleTaskCompletion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = database.findTaskById(parseInt(id));
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Tarefa não encontrada",
        });
      }

      if (task.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Acesso negado a esta tarefa",
        });
      }

      const updatedTask = database.updateTask(parseInt(id), {
        completed: !task.completed,
      });

      res.json({
        success: true,
        message: `Tarefa ${
          updatedTask.completed ? "concluída" : "reaberta"
        } com sucesso`,
        data: {
          task: updatedTask,
        },
      });
    } catch (error) {
      console.error("Erro ao alterar status da tarefa:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }

  async getTaskStatistics(req, res) {
    try {
      const userId = req.user.id;
      const tasks = database.findTasksByUserId(userId);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => task.completed).length;
      const pendingTasks = totalTasks - completedTasks;

      const priorityStats = {
        high: tasks.filter((task) => task.priority === "high").length,
        medium: tasks.filter((task) => task.priority === "medium").length,
        low: tasks.filter((task) => task.priority === "low").length,
      };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentTasks = tasks.filter(
        (task) => new Date(task.createdAt) >= sevenDaysAgo
      );

      res.json({
        success: true,
        data: {
          overview: {
            total: totalTasks,
            completed: completedTasks,
            pending: pendingTasks,
            completionRate:
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0,
          },
          priority: priorityStats,
          recent: {
            last7Days: recentTasks.length,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor",
      });
    }
  }
}

module.exports = new TaskController();
