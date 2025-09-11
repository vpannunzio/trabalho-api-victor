// Simulação de banco de dados

class Database {
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.nextUserId = 1;
    this.nextTaskId = 1;
  }

  createUser(userData) {
    const user = {
      id: this.nextUserId++,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  findUserById(id) {
    return this.users.get(id);
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  updateUser(id, updates) {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date() });
      return user;
    }
    return null;
  }

  deleteUser(id) {
    return this.users.delete(id);
  }

  createTask(taskData) {
    const task = {
      id: this.nextTaskId++,
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  findTaskById(id) {
    return this.tasks.get(id);
  }

  findTasksByUserId(userId) {
    const userTasks = [];
    for (const task of this.tasks.values()) {
      if (task.userId === userId) {
        userTasks.push(task);
      }
    }
    return userTasks.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, updates, { updatedAt: new Date() });
      return task;
    }
    return null;
  }

  deleteTask(id) {
    return this.tasks.delete(id);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }
}

const database = new Database();

module.exports = database;
