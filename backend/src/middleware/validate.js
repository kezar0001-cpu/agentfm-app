// Simple Zod validation middleware.  Pass a Zod schema to validate
// request bodies.  If validation fails, respond with a 400 and the
// validation errors.
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // If body is undefined, parse will throw; provide empty object.
      const data = schema.parse(req.body || {});
      req.body = data;
      return next();
    } catch (err) {
      return res.status(400).json({ error: 'Invalid request', details: err.errors });
    }
  };
};

module.exports = validate;