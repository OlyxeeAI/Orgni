const orgModel = require('../models/organization.model');

module.exports = async (req, res, next) => {
  const orgId = req.params.orgId;
  if (!orgId) return next();
  const org = await orgModel.findById(orgId);
  if (!org) return res.status(404).json({ error: `Organization not found: ${orgId}` });
  req.org = org;
  next();
};
