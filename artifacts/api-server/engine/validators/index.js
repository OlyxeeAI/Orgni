const Joi = require('joi');

const createOrgSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  businessType: Joi.string().min(2).max(100).required(),
  departments: Joi.array().items(Joi.string()).default([]),
  roles: Joi.array().items(Joi.object({
    role: Joi.string().required(),
    responsibilities: Joi.array().items(Joi.string()).default([])
  })).default([]),
  keyWorkflows: Joi.array().items(Joi.string()).default([]),
  currentTools: Joi.array().items(Joi.string()).default([]),
  mainProblems: Joi.array().items(Joi.string()).default([])
});

const updateOrgSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  businessType: Joi.string().min(2).max(100),
  departments: Joi.array().items(Joi.string()),
  roles: Joi.array().items(Joi.object({ role: Joi.string().required(), responsibilities: Joi.array().items(Joi.string()).default([]) })),
  keyWorkflows: Joi.array().items(Joi.string()),
  currentTools: Joi.array().items(Joi.string()),
  mainProblems: Joi.array().items(Joi.string())
}).min(1);

const askSchema = Joi.object({
  question: Joi.string().min(5).max(1000).required()
});

const chatSchema = Joi.object({
  messages: Joi.array().items(Joi.object({
    role: Joi.string().valid('user', 'assistant').required(),
    content: Joi.string().min(1).max(4000).required()
  })).min(1).max(50).required()
});

const actionSchema = Joi.object({
  type: Joi.string()
    .valid('task_list', 'draft_message', 'workflow_summary', 'flag_missing', 'next_step')
    .required(),
  context: Joi.string().max(500).optional().allow('')
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { createOrgSchema, updateOrgSchema, askSchema, chatSchema, actionSchema, validate };
