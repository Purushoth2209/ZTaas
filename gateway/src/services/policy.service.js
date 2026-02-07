import { log } from '../utils/logger.js';

let policies = [];

export const getPolicies = () => {
  log(`POLICY action=get count=${policies.length}`);
  return policies;
};

export const setPolicies = (newPolicies) => {
  policies = newPolicies;
  log(`POLICY action=set count=${policies.length}`);
};

export const clearPolicies = () => {
  policies = [];
  log(`POLICY action=clear`);
};

export const findMatchingPolicy = (method, path) => {
  return policies.find(policy => 
    policy.path === path && policy.methods.includes(method)
  );
};
