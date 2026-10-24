function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && (process.env.NEXT_PUBLIC_API_URL?.includes('localhost') || !process.env.NEXT_PUBLIC_API_URL)) {
      return `http://${host}:5000/api/v1`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
}

// Helper to notify UI if server is waking up from an idle cold start
function emitWarmingEvent(isWarming: boolean) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zeroq-server-warming', { detail: { isWarming } }));
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, retries: number = 2): Promise<T> {
  const url = `${getApiUrl()}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Timer to detect cold-start delay (>2.5s)
  let isColdStartTimer: any = null;
  if (typeof window !== 'undefined') {
    isColdStartTimer = setTimeout(() => {
      emitWarmingEvent(true);
    }, 2500);
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (isColdStartTimer) clearTimeout(isColdStartTimer);
    emitWarmingEvent(false);

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Failed to process request`);
    }

    return data as T;
  } catch (error: any) {
    if (isColdStartTimer) clearTimeout(isColdStartTimer);

    // If server is cold-starting or temporarily sleeping, retry with backoff
    if (retries > 0) {
      emitWarmingEvent(true);
      await new Promise((r) => setTimeout(r, 1500));
      return request<T>(endpoint, options, retries - 1);
    }

    emitWarmingEvent(false);
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

// Customer Endpoints
export async function registerCustomer(
  storeSlug: string,
  name: string,
  contact: string,
  serviceType: string = 'GENERAL',
  otpCode?: string
) {
  return request<{
    uuid: string;
    tokenNumber: number;
    tokenCode?: string;
    serviceType?: string;
    priority?: boolean;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    contactType?: 'PHONE' | 'EMAIL';
    status: string;
    queuePosition: number;
    storeSlug: string;
    storeName: string;
    isExisting?: boolean;
    message?: string;
  }>('/queue/register', {
    method: 'POST',
    body: JSON.stringify({ storeSlug, name, contact, phone: contact, serviceType, otpCode })
  });
}

export async function sendOTP(contact: string) {
  return request<{
    success: boolean;
    channel: 'SMS' | 'EMAIL';
    simulated: boolean;
    mockCode?: string;
    message: string;
  }>('/queue/otp/send', {
    method: 'POST',
    body: JSON.stringify({ contact })
  });
}

export async function verifyOTP(contact: string, code: string) {
  return request<{
    success: boolean;
    verified: boolean;
    message?: string;
    error?: string;
  }>('/queue/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ contact, code })
  });
}

export async function getCustomerStatus(tokenUuid: string) {
  return request<{
    uuid: string;
    tokenNumber: number;
    customerName: string;
    status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
    peopleAhead: number;
    assignedCounter: string | null;
    assignedCounterNumber: number | null;
    estimatedWaitMinutes: number;
    calledAt: string | null;
    snoozeCount: number;
    storeId: string;
  }>(`/queue/status/${tokenUuid}`);
}

export async function cancelCustomerToken(tokenUuid: string) {
  return request('/queue/cancel', {
    method: 'POST',
    body: JSON.stringify({ tokenUuid })
  });
}

export async function customerHold(tokenUuid: string, holdMinutes: number = 5) {
  return request<{ success: boolean; message: string; token: any }>('/queue/hold', {
    method: 'POST',
    body: JSON.stringify({ tokenUuid, holdMinutes })
  });
}

export async function customerDone(tokenUuid: string) {
  return request<{ success: boolean; message: string; token: any }>('/queue/done', {
    method: 'POST',
    body: JSON.stringify({ tokenUuid })
  });
}

// Staff Endpoints
export async function callNext(counterId: string) {
  return request<{
    success: boolean;
    token: any;
    message: string;
  }>('/staff/call-next', {
    method: 'POST',
    body: JSON.stringify({ counterId })
  });
}

export async function callNextBatch(counterId: string, batchSize: number = 3) {
  return request<{
    success: boolean;
    tokens: any[];
    count: number;
    message: string;
  }>('/staff/call-batch', {
    method: 'POST',
    body: JSON.stringify({ counterId, batchSize })
  });
}

export async function snooze(tokenId: string) {
  return request<{
    success: boolean;
    token: any;
    message: string;
  }>('/staff/snooze', {
    method: 'POST',
    body: JSON.stringify({ tokenId })
  });
}

export async function complete(tokenId: string) {
  return request<{
    success: boolean;
    token: any;
    message: string;
  }>('/staff/complete', {
    method: 'POST',
    body: JSON.stringify({ tokenId })
  });
}

export async function skip(tokenId: string) {
  return request<{
    success: boolean;
    token: any;
    message: string;
  }>('/staff/skip', {
    method: 'POST',
    body: JSON.stringify({ tokenId })
  });
}

export async function getCounterDetails(counterId: string) {
  return request<{
    counter: any;
    store: any;
    queueState: {
      activeServing: any[];
      upcomingQueue: any[];
      totalWaiting: number;
    };
    allCounters: any[];
  }>(`/staff/counter/${counterId}`);
}

// Store & Admin Endpoints
export async function getStores() {
  return request<any[]>('/stores');
}

export async function getStoreBySlug(slug: string, includeInactive: boolean = false) {
  const query = includeInactive ? '?includeInactive=true' : '';
  const cacheKey = `zeroq_store_${slug}_${includeInactive}`;

  try {
    const data = await request<{
      store: any;
      counters: any[];
      queueState: {
        activeServing: any[];
        upcomingQueue: any[];
        totalWaiting: number;
      };
    }>(`/stores/${slug}${query}`);

    // Update offline/idle cache for fast initial renders
    if (typeof window !== 'undefined' && data?.store) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }));
      } catch (_) {}
    }

    return data;
  } catch (error) {
    // Fallback to cached data if network times out during server cold start
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.warn('[ZeroQ Cache] Serving store from local cache while server connects');
          return parsed.data;
        } catch (_) {}
      }
    }
    throw error;
  }
}

// Synchronous fast helper for initial UI state
export function getCachedStore(slug: string, includeInactive: boolean = false) {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`zeroq_store_${slug}_${includeInactive}`);
    if (cached) {
      return JSON.parse(cached).data;
    }
  } catch (_) {}
  return null;
}

export async function createStore(payload: any) {
  return request('/stores', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function addCounter(slug: string, counterName: string, description: string = '') {
  return request(`/stores/${slug}/counters`, {
    method: 'POST',
    body: JSON.stringify({ counterName, description })
  });
}

export async function updateCounter(
  slug: string,
  counterId: string,
  payload: { counterName?: string; description?: string; isActive?: boolean }
) {
  return request<{ success: boolean; counter: any }>(`/stores/${slug}/counters/${counterId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteCounter(slug: string, counterId: string) {
  return request(`/stores/${slug}/counters/${counterId}`, {
    method: 'DELETE'
  });
}

export async function updateStoreSettings(slug: string, settings: any) {
  return request(`/stores/${slug}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings)
  });
}

export async function seedDemoStore() {
  return request<{ message: string; store: any; counters: any[] }>('/stores/seed', {
    method: 'POST'
  });
}
