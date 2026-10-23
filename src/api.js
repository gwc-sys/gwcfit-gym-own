const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

export async function request(path, options = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const requestId = globalThis.crypto?.randomUUID?.() || `web_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...options.headers,
      },
    });
    const responseText = await response.text();
    let body = {};
    try { body = responseText ? JSON.parse(responseText) : {}; }
    catch {
      if (response.ok) throw new Error('The server returned an unexpected response. Please try again.');
    }
    if (body === null || typeof body !== 'object') {
      if (response.ok) throw new Error('The server returned an unexpected response. Please try again.');
      body = {};
    }
    if (!response.ok) {
      const validationMessage = Array.isArray(body.detail) ? body.detail.filter((item) => item && typeof item.msg === 'string').map((item) => `${Array.isArray(item.loc) ? item.loc.filter((part) => part !== 'body').join(' ') : 'Field'}: ${item.msg}`).join(' · ') : '';
      const error = new Error(validationMessage || body?.error?.message || (typeof body.detail === 'string' ? body.detail : 'Unable to complete the request. Please try again.'));
      error.status = response.status;
      error.code = body?.error?.code;
      error.requestId = body?.error?.requestId || response.headers.get('x-request-id');
      if (response.status === 401 && options.headers?.Authorization && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pulsefit:session-expired', { detail: { authorization: options.headers.Authorization } }));
      }
      throw error;
    }
    return body;
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error('The request timed out. Please try again.');
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    if (error instanceof TypeError) throw new Error('Unable to connect. Check your connection and try again.');
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

export const ownerApi = {
  login(email, password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  me(accessToken) {
    return request('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  logout(accessToken) {
    return request('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
  },
  publicPlans() {
    return request('/platform-plans/public');
  },
  publicGymWebsite(gymId) {
    return request(`/gyms/public/${encodeURIComponent(gymId)}/website`);
  },
  gymWebsiteEditor(gymId, token) {
    return request(`/gyms/${encodeURIComponent(gymId)}/website`, { headers: { Authorization: `Bearer ${token}` } });
  },
  saveGymWebsite(gymId, payload, token) {
    return request(`/gyms/${encodeURIComponent(gymId)}/website`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  },
  publicGyms(location) {
    const params = location ? `?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}` : '';
    return request(`/gyms/public/directory${params}`);
  },
  plans(accessToken) {
    return request('/platform-plans', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  updatePlan(planId, changes, accessToken) {
    return request(`/platform-plans/${planId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(changes),
    });
  },
  submitInquiry(payload) {
    return request('/gym-inquiries', { method: 'POST', body: JSON.stringify(payload) });
  },
  inquiries(accessToken) {
    return request('/developer/inquiries', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  invitations(accessToken) {
    return request('/invitations', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  updateInquiry(inquiryId, changes, accessToken) {
    return request(`/developer/inquiries/${inquiryId}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(changes),
    });
  },
  inviteInquiry(inquiryId, accessToken) {
    return request(`/developer/inquiries/${inquiryId}/invite`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  gyms(accessToken) {
    return request('/developer/gyms', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  freeTrials(accessToken) {
    return request('/developer/free-trials', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  loginEvents(accessToken) {
    return request('/developer/login-events?limit=100', { headers: { Authorization: `Bearer ${accessToken}` } });
  },
  setGymSubscription(gymId, payload, accessToken) {
    return request(`/developer/gyms/${gymId}/subscription`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
    });
  },
};
