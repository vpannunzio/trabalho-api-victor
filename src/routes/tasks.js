const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { taskSchemas, validate } = require("../middleware/validation");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);

// CRUD de tarefas
router.post("/", validate(taskSchemas.create), taskController.createTask);

router.get("/", taskController.getTasks);

router.get("/statistics", taskController.getTaskStatistics);

router.get("/:id", taskController.getTask);

router.put("/:id", validate(taskSchemas.update), taskController.updateTask);

router.patch("/:id/toggle", taskController.toggleTaskCompletion);

router.delete("/:id", taskController.deleteTask);

module.exports = router;
