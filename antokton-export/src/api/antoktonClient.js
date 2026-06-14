import { appParams } from '@/lib/app-params';

const appId = appParams.appId || import.meta.env.VITE_ANTOKTON_APP_ID || '6991d40eddf82cc25ec834a7';
const DEV_LOGGED_OUT_KEY = 'antokton_dev_logged_out';
const POST_VIEW_SESSION_KEY = 'antokton_post_view_session';

function getToken() {
  const storedToken = localStorage.getItem('antokton_access_token') ||
    localStorage.getItem('base44_access_token') ||
    localStorage.getItem('token');

  if (storedToken) return storedToken;
  if (localStorage.getItem(DEV_LOGGED_OUT_KEY) === 'true') return null;
  if (import.meta.env.DEV) return `dev:${import.meta.env.VITE_ANTOKTON_DEV_USER_EMAIL || 'admin@antokton.local'}`;
  return null;
}

function setToken(token) {
  if (!token) return;
  localStorage.removeItem(DEV_LOGGED_OUT_KEY);
  localStorage.setItem('antokton_access_token', token);
  localStorage.setItem('base44_access_token', token);
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('antokton_access_token');
  localStorage.removeItem('base44_access_token');
  localStorage.removeItem('token');
  if (import.meta.env.DEV) localStorage.setItem(DEV_LOGGED_OUT_KEY, 'true');
}

function hasToken() {
  return Boolean(getToken());
}

function getPostViewSessionId() {
  let sessionId = localStorage.getItem(POST_VIEW_SESSION_KEY);
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(POST_VIEW_SESSION_KEY, sessionId);
  }
  return sessionId;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const body = options.body;

  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
    body: body instanceof FormData || typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.blob();

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Request failed with ${response.status}`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

function entityApi(entity) {
  const base = `/api/apps/${appId}/entities/${entity}`;
  return {
    list(sort, limit, skip, fields) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      if (skip) params.set('skip', skip);
      if (fields) params.set('fields', Array.isArray(fields) ? fields.join(',') : fields);
      return request(`${base}${params.toString() ? `?${params}` : ''}`);
    },
    filter(query, sort, limit, skip, fields) {
      const params = new URLSearchParams();
      params.set('q', JSON.stringify(query || {}));
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      if (skip) params.set('skip', skip);
      if (fields) params.set('fields', Array.isArray(fields) ? fields.join(',') : fields);
      return request(`${base}?${params}`);
    },
    get(id) {
      return request(`${base}/${encodeURIComponent(id)}`);
    },
    create(data) {
      return request(base, { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    delete(id) {
      return request(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    deleteMany(ids) {
      return request(base, { method: 'DELETE', body: Array.isArray(ids) ? ids : { ids } });
    },
    bulkCreate(items) {
      return request(`${base}/bulk`, { method: 'POST', body: items });
    },
    bulkUpdate(items) {
      return request(`${base}/bulk`, { method: 'PUT', body: items });
    },
    updateMany(query, data) {
      return request(`${base}/update-many`, { method: 'PATCH', body: { query, data } });
    },
    importEntities(file) {
      const form = new FormData();
      form.append('file', file, file.name);
      return request(`${base}/import`, { method: 'POST', body: form });
    },
    subscribe() {
      return { unsubscribe() {} };
    }
  };
}

const entities = new Proxy({}, {
  get(_target, entity) {
    if (typeof entity !== 'string' || entity === 'then') return undefined;
    return entityApi(entity);
  }
});

const auth = {
  async me() {
    return request(`/api/apps/${appId}/entities/User/me`);
  },
  async updateMe(data) {
    return request(`/api/apps/${appId}/entities/User/me`, { method: 'PUT', body: data });
  },
  async isAuthenticated() {
    try {
      await this.me();
      return true;
    } catch {
      return false;
    }
  },
  async loginViaEmailPassword(email, password) {
    const result = await request(`/api/apps/${appId}/auth/login`, {
      method: 'POST',
      body: { email, password }
    });
    setToken(result.access_token);
    return result;
  },
  async register(data) {
    const result = await request(`/api/apps/${appId}/auth/register`, {
      method: 'POST',
      body: data
    });
    setToken(result.access_token);
    return result;
  },
  async requestPasswordReset(email) {
    return request(`/api/apps/${appId}/auth/reset-password-request`, {
      method: 'POST',
      body: { email }
    });
  },
  async resetPassword({ email, token, password }) {
    return request(`/api/apps/${appId}/auth/reset-password`, {
      method: 'POST',
      body: { email, token, password }
    });
  },
  redirectToLogin(fromUrl = window.location.href, mode = "login") {
    if (import.meta.env.DEV && localStorage.getItem(DEV_LOGGED_OUT_KEY) !== 'true') {
      const email = import.meta.env.VITE_ANTOKTON_DEV_USER_EMAIL || 'admin@antokton.local';
      setToken(`dev:${email}`);
      window.location.href = fromUrl;
      return;
    }
    if (window.location.pathname.toLowerCase() === '/login') return;
    const target = new URL('/Login', window.location.origin);
    target.searchParams.set('from_url', fromUrl);
    if (mode === "register") target.searchParams.set('mode', 'register');
    window.location.href = target.toString();
  },
  logout(fromUrl) {
    const token = getToken();
    fetch(`/api/apps/${appId}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'same-origin',
      keepalive: true,
      body: '{}'
    }).catch(() => {});
    clearToken();
    window.location.replace(fromUrl || '/Login');
  },
  hasToken,
  setToken,
  clearToken
};

function coreOperation(operation, payload = {}) {
  if (payload instanceof FormData) {
    return request(`/api/apps/${appId}/integration-endpoints/Core/${operation}`, {
      method: 'POST',
      body: payload
    });
  }

  const hasFile = typeof File !== 'undefined' && Object.values(payload).some((value) => value instanceof File);
  if (hasFile) {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (value instanceof File) form.append(key, value, value.name);
      else form.append(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    }
    return request(`/api/apps/${appId}/integration-endpoints/Core/${operation}`, {
      method: 'POST',
      body: form
    });
  }

  return request(`/api/apps/${appId}/integration-endpoints/Core/${operation}`, {
    method: 'POST',
    body: payload
  });
}

export const antoktonApi = {
  entities,
  asServiceRole: { entities },
  auth,
  integrations: {
    Core: new Proxy({}, {
      get(_target, operation) {
        if (typeof operation !== 'string' || operation === 'then') return undefined;
        return (payload) => coreOperation(operation, payload);
      }
    })
  },
  functions: {
    async invoke(name, payload = {}) {
      const data = await request(`/api/apps/${appId}/functions/${name}`, {
        method: 'POST',
        body: payload
      });
      return { data };
    },
    fetch(path, options = {}) {
      return fetch(`/api/apps/${appId}/functions${path.startsWith('/') ? path : `/${path}`}`, options);
    }
  },
  users: {
    inviteUser(userEmail, role) {
      return request(`/api/apps/${appId}/users/invite-user`, {
        method: 'POST',
        body: { user_email: userEmail, role }
      });
    }
  },
  appLogs: {
    logUserInApp(pageName) {
      return request(`/api/app-logs/${appId}/log-user-in-app/${encodeURIComponent(pageName)}`, {
        method: 'POST',
        body: {}
      });
    }
  },
  postViews: {
    record(postId) {
      if (!postId) return Promise.resolve({ success: false });
      return request(`/api/posts/${encodeURIComponent(postId)}/view`, {
        method: 'POST',
        body: { sessionId: getPostViewSessionId() }
      });
    }
  }
};

// Compatibility alias kept while old feature modules are migrated gradually.
export const base44 = antoktonApi;
