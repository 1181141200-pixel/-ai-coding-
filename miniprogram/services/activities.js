const request = require('../utils/request');
const API = require('./api-registry');

async function signupActivity(activityId, payload, options = {}) {
  return request.post(API.activities.signup(activityId), payload, {
    retry: 2,
    showErrorToast: false,
    ...options,
  });
}

function toQS(params = {}) {
  const parts = [];
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null && String(v) !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  });
  return parts.join('&');
}

async function list(params, options = {}) {
  const qs = typeof params === 'string' ? params : toQS(params || {});
  const url = qs ? `${API.activities.list()}?${qs}` : API.activities.list();
  return request.get(url, { retry: 2, showErrorToast: false, ...options });
}

async function getDetail(id, options = {}) {
  return request.get(API.activities.detail(id), { retry: 2, showErrorToast: false, ...options });
}

module.exports = { signupActivity, list, getDetail };