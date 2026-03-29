const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// 简易鉴权：模拟登录与令牌校验
function parseToken(req) {
  const h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!h) return null;
  const m = String(h).match(/Bearer\s+(.+)/i);
  const token = m ? m[1] : String(h).trim();
  return token || null;
}

function requireAuth(req, res) {
  const token = parseToken(req);
  if (!token || !/^mock-token-/.test(token)) {
    res.status(401).json({ code: 40101, message: '未登录或登录态失效' });
    return null;
  }
  // 从 token 派生一个演示 member_id（真实项目应通过后端校验并发放）
  const phoneTail = Number(String(token).replace('mock-token-', '').slice(-2));
  const memberId = 600 + (Number.isFinite(phoneTail) ? phoneTail : 1);
  return { token, memberId };
}

// Mock data
const lines = [
  { id: 1, name: '亲子夏令营' },
  { id: 2, name: '研学线路 A' },
  { id: 3, name: '周末自然探索' },
  { id: 4, name: '森林探索营' },
  { id: 5, name: '科学实践路线' },
];

const activities = [
  { id: 11, name: '营地培训体验' },
  { id: 12, name: '户外安全课' },
  { id: 13, name: '自然课堂' },
  { id: 14, name: '团队协作活动' },
];

// 报名容量与计数（模拟）
const activityCapacity = { 11: 50, 12: 30, 13: 100, 14: 20 };
const activitySignupCounts = { 11: 48, 12: 29, 13: 95, 14: 20 };

const bases = [
  { id: 101, name: '松湖营地' },
  { id: 102, name: '海滨基地' },
  { id: 103, name: '山野营地' },
  { id: 104, name: '城郊农场' },
];

// 订单 Mock 数据（对齐后端 OrdersService 返回结构）
const orders = [
  {
    id: 1001,
    status: 'paid',
    verify_status: 'unverified',
    quantity: 2,
    expire_at: '2025-12-31T23:59:59Z',
    created_at: '2025-10-01T10:00:00Z',
    member_id: 501,
    line: { id: 1, name: '亲子夏令营' },
  },
  {
    id: 1002,
    status: 'used',
    verify_status: 'verified',
    quantity: 1,
    expire_at: '2025-08-10T23:59:59Z',
    created_at: '2025-09-20T09:30:00Z',
    member_id: 502,
    line: { id: 2, name: '研学线路 A' },
  },
  {
    id: 1003,
    status: 'refunding',
    verify_status: 'unverified',
    quantity: 1,
    expire_at: '2025-11-15T23:59:59Z',
    created_at: '2025-09-25T12:00:00Z',
    member_id: 503,
    line: { id: 3, name: '周末自然探索' },
  },
  {
    id: 1004,
    status: 'expired',
    verify_status: 'unverified',
    quantity: 3,
    expire_at: '2025-09-01T00:00:00Z',
    created_at: '2025-07-30T08:00:00Z',
    member_id: 504,
    line: { id: 4, name: '森林探索营' },
  },
  {
    id: 1005,
    status: 'paid',
    verify_status: 'unverified',
    quantity: 1,
    expire_at: '2026-01-10T23:59:59Z',
    created_at: '2025-10-15T14:20:00Z',
    member_id: 505,
    line: { id: 5, name: '科学实践路线' },
  },
];

function paginate(arr, query) {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const pageSize = Math.max(parseInt(query.pageSize || '2', 10), 1);
  const total = arr.length;
  const start = (page - 1) * pageSize;
  const list = arr.slice(start, start + pageSize);
  return { list, total, page, pageSize };
}

function paginateItems(arr, query) {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const pageSize = Math.max(parseInt(query.pageSize || '20', 10), 1);
  const total = arr.length;
  const start = (page - 1) * pageSize;
  const items = arr.slice(start, start + pageSize);
  return { items, total, page, pageSize };
}

app.get('/lines', (req, res) => {
  res.json(paginate(lines, req.query));
});

// 线路详情
app.get('/lines/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = lines.find((l) => Number(l.id) === id);
  if (!item) return res.status(404).json({ code: 40401, message: '资源不存在：线路未找到' });
  // 详情扩展字段（示例）
  res.json({
    ...item,
    period: '3天2晚',
    status: 'on',
    available_count: 20,
    sold_count: 180,
    content_richtext: '<p>线路详情富文本示例</p>'
  });
});

app.get('/activities', (req, res) => {
  res.json(paginate(activities, req.query));
});

// 活动详情
app.get('/activities/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = activities.find((a) => Number(a.id) === id);
  if (!item) return res.status(404).json({ code: 40401, message: '资源不存在：活动未找到' });
  res.json({
    ...item,
    activity_time_range: '2025-11-01 ~ 2025-11-02',
    signup_time_range: '2025-10-20 ~ 2025-10-31',
    capacity: activityCapacity[id] ?? 30,
    signup_count: activitySignupCounts[id] ?? 0,
    content: '活动详情说明……'
  });
});

// 活动报名：参数校验与容量冲突（SPEC-B）
app.post('/activities/:id/signup', (req, res) => {
  // 需要鉴权
  const authInfo = requireAuth(req, res);
  if (!authInfo) return; // 已返回 401

  const id = Number(req.params.id);
  const act = activities.find((a) => Number(a.id) === id);
  if (!act) return res.status(404).json({ code: 40401, message: '资源不存在：活动未找到' });
  const { member_id, phone } = req.body || {};
  const useMemberId = Number(member_id || authInfo.memberId);
  if (!useMemberId) return res.status(422).json({ code: 42201, message: '参数错误：member_id 必填' });
  const cap = activityCapacity[id] ?? 30;
  const count = activitySignupCounts[id] ?? 0;
  if (count >= cap) return res.status(409).json({ code: 56001, message: '容量不足：报名名额已满' });
  activitySignupCounts[id] = count + 1;
  return res.json({ ok: true, signup_id: Math.floor(Math.random() * 100000) + 1, member_id: useMemberId, phone: phone || null });
});

app.get('/bases', (req, res) => {
  res.json(paginate(bases, req.query));
});

// 基地详情
app.get('/bases/:id', (req, res) => {
  const id = Number(req.params.id);
  const item = bases.find((b) => Number(b.id) === id);
  if (!item) return res.status(404).json({ code: 40401, message: '资源不存在：基地未找到' });
  res.json({
    ...item,
    province_city: '广东·东莞',
    facilities: '宿营/餐饮/教室/操场',
    surroundings: '湖泊/树林/步道',
    banner: ['https://example.com/banner1.jpg']
  });
});

// 订单列表：支持 status/verifyStatus/lineId 筛选与排序
app.get('/orders', (req, res) => {
  const { status, verifyStatus, lineId, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  let data = orders.slice();

  if (status) data = data.filter((o) => String(o.status) === String(status));
  if (verifyStatus) data = data.filter((o) => String(o.verify_status) === String(verifyStatus));
  if (lineId) data = data.filter((o) => Number(o.line?.id) === Number(lineId));

  const allowedSortBy = new Set(['created_at', 'status', 'verify_status']);
  const key = allowedSortBy.has(sortBy) ? sortBy : 'created_at';
  const dir = String(sortOrder).toUpperCase() === 'ASC' ? 1 : -1;

  data.sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === vb) return 0;
    return va > vb ? dir : -dir;
  });

  res.json(paginateItems(data, req.query));
});

// 下单：参数校验与库存容量（SPEC-B）
app.post('/orders', (req, res) => {
  const { line_id, quantity } = req.body || {};
  if (!line_id || typeof quantity !== 'number') {
    return res.status(422).json({ code: 42201, message: '参数错误：line_id/quantity 必填' });
  }
  if (quantity <= 0) {
    return res.status(422).json({ code: 42201, message: '参数错误：quantity 必须大于 0' });
  }
  // 简化库存容量规则：单次下单最多 3 份
  if (quantity > 3) {
    return res.status(409).json({ code: 56001, message: '库存不足：超出可售数量' });
  }
  const newId = 2000 + Math.floor(Math.random() * 900);
  // 将新订单加入内存列表，便于后续查询与支付/核销模拟
  const line = lines.find((l) => Number(l.id) === Number(line_id));
  orders.push({
    id: newId,
    status: 'pending_pay',
    verify_status: 'unverified',
    quantity: Number(quantity),
    expire_at: null,
    created_at: new Date().toISOString(),
    member_id: 600,
    line: line ? { id: line.id, name: line.name } : { id: Number(line_id), name: `线路#${line_id}` },
  });
  return res.json({ order_id: newId, status: 'pending_pay' });
});

// 订单详情
app.get('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const order = orders.find((o) => Number(o.id) === id);
  if (!order) return res.status(404).json({ code: 40401, message: '资源不存在：订单未找到' });
  res.json(order);
});

// 核销
app.post('/orders/:id/verify', (req, res) => {
  const id = Number(req.params.id);
  const order = orders.find((o) => Number(o.id) === id);
  if (!order) return res.status(404).json({ code: 40401, message: '资源不存在：订单未找到' });
  if (order.verify_status === 'verified') return res.status(409).json({ code: 40901, message: '业务冲突：订单已核销' });
  if (!['paid'].includes(order.status)) return res.status(409).json({ code: 40901, message: '业务冲突：当前状态不允许核销', status: order.status });
  order.verify_status = 'verified';
  order.status = 'used';
  res.json({ ok: true, id, verify_status: order.verify_status, status: order.status });
});

// 反核销
app.post('/orders/:id/unverify', (req, res) => {
  const id = Number(req.params.id);
  const order = orders.find((o) => Number(o.id) === id);
  if (!order) return res.status(404).json({ code: 40401, message: '资源不存在：订单未找到' });
  if (order.verify_status !== 'verified') return res.status(409).json({ code: 40901, message: '业务冲突：订单尚未核销' });
  order.verify_status = 'unverified';
  order.status = 'paid';
  res.json({ ok: true, id, verify_status: order.verify_status, status: order.status });
});

// 新增：退款（兼容两种路径）
function handleRefund(req, res) {
  const id = Number(req.params.id);
  const order = orders.find((o) => Number(o.id) === id);
  if (!order) return res.status(404).json({ code: 40401, message: '资源不存在：订单未找到' });
  if (order.status === 'refunding') return res.status(409).json({ code: 40901, message: '业务冲突：订单已处于退款中' });
  if (order.verify_status === 'verified') return res.status(409).json({ code: 40901, message: '业务冲突：已核销订单不可退款' });
  if (!['paid'].includes(order.status)) return res.status(409).json({ code: 40901, message: '业务冲突：当前状态不允许退款', status: order.status });
  order.status = 'refunding';
  res.json({ ok: true, id, status: order.status });
}
app.post('/orders/:id/refund', handleRefund);
app.post('/orders/refund/:id', handleRefund);
console.log('Refund routes installed');

// 新增：支付
app.post('/orders/:id/pay', (req, res) => {
  const id = Number(req.params.id);
  const order = orders.find((o) => Number(o.id) === id);
  if (!order) return res.status(404).json({ code: 40401, message: '资源不存在：订单未找到' });
  if (order.status !== 'pending_pay') return res.status(409).json({ code: 40901, message: '业务冲突：非待支付订单不可支付', status: order.status });
  order.status = 'paid';
  // mock：支付成功后保持未核销
  order.verify_status = 'unverified';
  res.json({ ok: true, id, status: order.status, verify_status: order.verify_status });
});
console.log('Pay route installed');
// 健康检查：用于验证 POST 匹配是否正常
app.post('/healthz', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});
console.log('Healthz route installed');
// Auth 登录：手机号换取 token 与 member（Mock）
app.post('/auth/login', (req, res) => {
  const { phone } = req.body || {};
  if (!phone || !/^1[3-9]\d{9}$/.test(String(phone))) {
    return res.status(422).json({ code: 42201, message: '参数错误：请输入有效手机号' });
  }
  const token = `mock-token-${String(phone).trim()}`;
  const tail = Number(String(phone).slice(-2));
  const memberId = 600 + (Number.isFinite(tail) ? tail : 1);
  res.json({ token, member: { id: memberId, phone: String(phone).trim(), roles: ['member'] } });
});
const port = Number(process.env.PORT || process.argv[2] || 3000);
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Mock server running at http://localhost:${port}`);
  });
}
// 路由列表调试
app.get('/__routes', (req, res) => {
  try {
    const stack = (app && app._router && app._router.stack) ? app._router.stack : [];
    const routes = stack
      .filter((layer) => layer && layer.route)
      .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) }));
    res.json(routes);
  } catch (e) {
    res.status(500).json({ ok: false, message: 'route list error', error: String(e) });
  }
});
module.exports = app;