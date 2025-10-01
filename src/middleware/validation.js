const Joi = require("joi");

// Esquemas de validação pra usuários
const userSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      "string.min": "Nome deve ter pelo menos 2 caracteres",
      "string.max": "Nome deve ter no máximo 50 caracteres",
      "any.required": "Nome é obrigatório",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Email deve ter um formato válido",
      "any.required": "Email é obrigatório",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Senha deve ter pelo menos 6 caracteres",
      "any.required": "Senha é obrigatória",
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email deve ter um formato válido",
      "any.required": "Email é obrigatório",
    }),
    password: Joi.string().required().messages({
      "any.required": "Senha é obrigatória",
    }),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
  })
    .min(1)
    .messages({
      "object.min": "Pelo menos um campo deve ser fornecido para atualização",
    }),
};

// Esquemas de validação pra tarefas
const taskSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(100).required().messages({
      "string.min": "Título deve ter pelo menos 1 caractere",
      "string.max": "Título deve ter no máximo 100 caracteres",
      "any.required": "Título é obrigatório",
    }),
    description: Joi.string().max(500).optional().messages({
      "string.max": "Descrição deve ter no máximo 500 caracteres",
    }),
    priority: Joi.string()
      .valid("low", "medium", "high")
      .default("medium")
      .messages({
        "any.only": "Prioridade deve ser: low, medium ou high",
      }),
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    priority: Joi.string().valid("low", "medium", "high").optional(),
    completed: Joi.boolean().optional(),
  })
    .min(1)
    .messages({
      "object.min": "Pelo menos um campo deve ser fornecido para atualização",
    }),
};

// Middleware de validação genérico
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors,
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  userSchemas,
  taskSchemas,
  validate,
};
