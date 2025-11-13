import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  preferredLanguage: Joi.string().valid("ARABIC", "FRENCH").default("FRENCH"),
  role: Joi.string().valid("CLIENT", "DOCTOR").default("CLIENT"),
}).or("email", "phone");

export const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  password: Joi.string().required(),
}).or("email", "phone");

export const bookingSchema = Joi.object({
  doctorId: Joi.string().required(),
  sessionDate: Joi.date().greater("now").required(),
  sessionDuration: Joi.number().integer().min(30).max(180).default(60),
  sessionType: Joi.string()
    .valid("video", "chat", "in-person")
    .default("video"),
  notes: Joi.string().max(500).optional(),
});

export const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).optional(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
}).or("email", "phone");

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: req.t("validation.error") || "Validation error",
        errors,
      });
    }

    next();
  };
};
