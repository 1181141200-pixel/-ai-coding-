const request = require('../utils/request');
const API = require('./api-registry');

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
  return request.get(`${API.orders.list()}?${qs}`, { retry: 2, showErrorToast: false, ...options });
}

async function getDetail(id, options = {}) {
  return request.get(API.orders.detail(id), { retry: 2, showErrorToast: false, ...options });
}

async function verify(id, options = {}) {
  return request.post(API.orders.verify(id), {}, { retry: 2, showErrorToast: false, ...options });
}

async function unverify(id, options = {}) {
  return request.post(API.orders.unverify(id), {}, { retry: 2, showErrorToast: false, ...options });
}

async function refund(id, options = {}) {
  return request.post(API.orders.refund(id), {}, { retry: 2, showErrorToast: false, ...options });
}

async function pay(id, options = {}) {
  return request.post(API.orders.pay(id), {}, { retry: 2, showErrorToast: false, ...options });
}

async function createOrder(payload, options = {}) {
  return request.post(API.orders.create(), payload, { retry: 2, showErrorToast: false, ...options });
}

module.exports = { list, getDetail, verify, unverify, refund, pay, createOrder };