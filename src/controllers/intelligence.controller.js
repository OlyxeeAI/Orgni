const activityModel = require('../models/activity.model');
const { asyncHandler } = require('../middleware/errorHandler');

const getActivity = asyncHandler(async (req, res) => {
  const activity = await activityModel.findByOrg(req.org.id, 20);
  res.json({ activity, count: activity.length });
});

module.exports = { getActivity };
