import { getPolicies, setPolicies, clearPolicies } from '../services/policy.service.js';

export const getAllPolicies = (req, res) => {
  const policies = getPolicies();
  res.json({ policies });
};

export const updatePolicies = (req, res) => {
  const { policies } = req.body;
  
  if (!policies || !Array.isArray(policies)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'policies must be an array'
    });
  }
  
  setPolicies(policies);
  res.json({
    message: 'Policies updated',
    count: policies.length
  });
};

export const deletePolicies = (req, res) => {
  clearPolicies();
  res.json({
    message: 'All policies cleared'
  });
};
