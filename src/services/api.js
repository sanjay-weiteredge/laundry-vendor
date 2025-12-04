const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const jsonHeaders = () => ({
  "Content-Type": "application/json",
});

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

export const storeLogin = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/api/stores/stores/login`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data?.message || "Unable to sign in. Please try again.");
  }

  return data;
};

export const getStoreOrders = async ({ token, status }) => {
  const query = new URLSearchParams();
  if (status && status !== "all") {
    query.set("status", status);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/stores/stores/orders${query.toString() ? `?${query}` : ""}`,
    {
      headers: authHeaders(token),
    }
  );

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data?.message || "Unable to load store orders.");
  }

  return data;
};

export const updateOrderItems = async ({ token, orderId, items }) => {
  const response = await fetch(
    `${API_BASE_URL}/api/stores/stores/orders/${orderId}/items`,
    {
      method: "PUT",
      headers: {
        ...jsonHeaders(),
        ...authHeaders(token),
      },
      body: JSON.stringify({ items }),
    }
  );

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data?.message || "Unable to update order items.");
  }

  return data;
};

export const getStoreProfile = async (token) => {
  const response = await fetch(`${API_BASE_URL}/api/stores/stores/profile`, {
    headers: authHeaders(token),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data?.message || "Unable to load store profile.");
  }

  return data;
};

export const updateOrderStatus = async ({ token, orderId, status, notes }) => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      ...jsonHeaders(),
      ...authHeaders(token),
    },
    body: JSON.stringify({ status, notes }),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data?.message || "Unable to update order status.");
  }

  return data;
};

export const updateStoreStatus = async ({ token, status }) => {
  const response = await fetch(`${API_BASE_URL}/api/stores/stores/status`, {
    method: "PATCH",
    headers: {
      ...jsonHeaders(),
      ...authHeaders(token),
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data?.message || "Unable to update store status.");
  }

  return data;
};

