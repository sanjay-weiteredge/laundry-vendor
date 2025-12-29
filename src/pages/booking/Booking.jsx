import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../../components/Navbar";
import {
  getStoreOrders,
  updateOrderItems,
  updateOrderStatus,
  getServices,
} from "../../services/api";

const STATUS_CONFIG = {
  pending: { variant: "warning", label: "Pending pickup" },
  confirmed: { variant: "info", label: "Confirmed" },
  picked_up: { variant: "secondary", label: "Picked up" },
  processing: { variant: "primary", label: "Processing" },
  ready_for_delivery: { variant: "dark", label: "Ready to deliver" },
  out_for_delivery: { variant: "info", label: "Out for delivery" },
  delivered: { variant: "success", label: "Delivered" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const STATUS_OPTIONS = ["all", "express", ...Object.keys(STATUS_CONFIG)];

const formatDateTime = (value, options) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  });
};

const formatAddress = (address) => {
  if (!address) return { text: "Address not available yet.", query: null };
  const parts = [
    address.house,
    address.street,
    address.address_line,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean);

  const text = parts.join(", ") || "Address not available yet.";
  const query = parts.join(" ");

  return { text, query };
};

const buildMapsUrl = (address) => {
  const { query } = formatAddress(address);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const sumCategoryQuantity = (categories = []) =>
  categories.reduce((sum, category) => sum + (category.quantity ?? 0), 0);

const sumCategorySubtotal = (categories = []) =>
  categories.reduce(
    (sum, category) => {
      if (category.totalAmount !== null && category.totalAmount !== undefined) {
        return sum + Number(category.totalAmount);
      }
      return sum + (category.quantity ?? 0) * (category.unitPrice ?? 0);
    },
    0
  );

const buildCategories = (order) => {
  const normalize = (service, quantity = 0, keyOverride) => {
    const serviceId = service?.id ?? null;
    const key =
      keyOverride ||
      serviceId ||
      service?.name ||
      `service-${Math.random().toString(36).slice(2)}`;

    return {
      key,
      id: key,
      serviceId,
      label: service?.name || "Laundry service",
      description: service?.description || "Standard service",
      quantity: quantity ?? 0,
      unitPrice: Number(service?.price ?? 0),
      totalAmount: null, // Will be set from order item total_amount
    };
  };

  if (Array.isArray(order?.items) && order.items.length > 0) {
    const grouped = order.items.reduce((acc, item) => {
      const service = item?.service;
      if (!service) {
        return acc;
      }

      const key = service.id ?? service.name ?? `service-${item.id}`;
      if (!acc[key]) {
        acc[key] = normalize(service, 0, key);
        acc[key].totalAmount = null;
        acc[key].orderItemId = item.id; // Store the order item ID
      }
      acc[key].quantity += item.quantity ?? 1;
      acc[key].serviceId = service.id ?? acc[key].serviceId ?? null;
      if (item.total_amount !== null && item.total_amount !== undefined) {
        if (acc[key].totalAmount !== null && acc[key].totalAmount !== undefined) {
          acc[key].totalAmount = Number(acc[key].totalAmount) + Number(item.total_amount);
        } else {
          acc[key].totalAmount = Number(item.total_amount);
        }
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }

  if (order?.service) {
    const key = order.service.id ?? order.service.name ?? "service-single";
    const quantity = 1;
    return [normalize(order.service, quantity, key)];
  }

  return [];
};

const mapOrderToCard = (order) => {
  const categories = buildCategories(order);
  const serviceName =
    order.service?.name || categories[0]?.label || "Laundry service";
  const totalItems = sumCategoryQuantity(categories) || order.items?.length || 0;
  const derivedSubtotal = sumCategorySubtotal(categories);

  const subtotal =
    Number(
      typeof order.subtotal !== "undefined" ? order.subtotal : derivedSubtotal
    ) || 0;
  const serviceFee = Number(order.service_fee ?? 0) || 0;
  const total =
    Number(
      typeof order.total_amount !== "undefined"
        ? order.total_amount
        : subtotal + serviceFee
    ) || 0;
  const paymentStatus = order.payment_status ? ` · ${order.payment_status}` : "";

  const addressInfo = formatAddress(order.delivery_address);
  const pickupStart = order.pickup_scheduled_at ? new Date(order.pickup_scheduled_at) : null;
  const pickupEnd = order.pickup_slot_end ? new Date(order.pickup_slot_end) : null;

  let pickupSlot = "Not scheduled";
  if (order.is_walk_in) {
    pickupSlot = formatDateTime(order.created_at);
  } else if (pickupStart && pickupEnd) {
    const startStr = formatDateTime(pickupStart);
    let endStr;
    if (pickupStart.toDateString() === pickupEnd.toDateString()) {
      // Same day, only show time for end
      endStr = pickupEnd.toLocaleString("en-IN", { timeStyle: "short" });
    } else {
      // Different days, show full date and time
      endStr = formatDateTime(pickupEnd);
    }
    pickupSlot = `${startStr} -> ${endStr}`;
  } else if (pickupStart) {
    pickupSlot = formatDateTime(pickupStart);
  }
  const deliverySlot =
    order.order_status === "delivered" && order.delivered_at
      ? formatDateTime(order.delivered_at)
      : null;

  return {
    orderId: order.id,
    id: `ORD-${order.id}`,
    customer:
      order.delivery_address?.full_name ||
      order.user?.name ||
      order.user?.phone_number ||
      "Customer",
    service: serviceName,
    pickupSlot,
    deliverySlot,
    weight: `${totalItems || 0} ${totalItems === 1 ? "item" : "items"}`,
    status: order.order_status || "pending",
    date: formatDateTime(order.created_at, { timeStyle: undefined }),
    isExpress: Boolean(order.is_express || order.isExpress),
    isWalkIn: Boolean(order.is_walk_in || order.isWalkIn),
    userName: order.user?.name || order.delivery_address?.full_name || "Customer",
    userPhone: order.user?.phone_number || order.delivery_address?.phone || "",
    userEmail: order.user?.email || "",
    address: addressInfo.text,
    mapsUrl: buildMapsUrl(order.delivery_address),
    categories,
    payment: {
      subtotal,
      serviceFee,
      total: total || subtotal,
      method: `${order.payment_mode || "cash"}${paymentStatus}`,
    },
    rawCreatedAt: order.created_at,
  };
};

const replaceOrderInState = (setOrders, updatedOrder) => {
  setOrders((prev) =>
    prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
  );
};

const Booking = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [savingItems, setSavingItems] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [services, setServices] = useState([]);
  const [servicesError, setServicesError] = useState("");
  const [servicesLoading, setServicesLoading] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");
  const [removedServiceIds, setRemovedServiceIds] = useState([]);

  const handleCategoryQuantityChange = (categoryKey, delta) => {
    setSelectedBooking((prev) => {
      if (!prev) return prev;

      const updatedCategories = (prev.categories || []).map((category) => {
        const currentKey = category.key ?? category.id ?? category.label;
        if (currentKey !== categoryKey) {
          return category;
        }
        const nextQuantity = Math.max(0, (category.quantity ?? 0) + delta);
        // Recalculate totalAmount when quantity changes (vendor sets this)
        const newTotalAmount = nextQuantity * (category.unitPrice ?? 0);
        return {
          ...category,
          quantity: nextQuantity,
          totalAmount: newTotalAmount, // Always recalculate when quantity changes
        };
      });

      const totalItems = sumCategoryQuantity(updatedCategories);
      const subtotal = sumCategorySubtotal(updatedCategories);
      const serviceFee = Number(prev.payment?.serviceFee ?? 0);
      const updatedPayment = {
        ...prev.payment,
        subtotal,
        total: subtotal + serviceFee,
      };

      return {
        ...prev,
        categories: updatedCategories,
        weight: `${totalItems} ${totalItems === 1 ? "item" : "items"}`,
        payment: updatedPayment,
      };
    });
  };

  const handleCategoryServiceChange = () => {};

  const handleAddServiceLine = () => {
    if (!newServiceId) return;
    const service = services.find((s) => String(s.id) === String(newServiceId));
    if (!service) return;

    setSelectedBooking((prev) => {
      if (!prev) return prev;
      const newCategory = {
        key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id: null,
        serviceId: service.id,
        label: service.name || "Service",
        description: service.description || "Added service",
        quantity: 0,
        unitPrice: Number(service.price ?? 0),
        totalAmount: null,
      };
      return {
        ...prev,
        categories: [...(prev.categories || []), newCategory],
      };
    });

    setNewServiceId("");
    setModalError("");
  };

  const handleRemoveCategory = (categoryKey) => {
    setSelectedBooking((prev) => {
      if (!prev) return prev;
      const categoryToRemove = (prev.categories || []).find((cat) => {
        const currentKey = cat.key ?? cat.id ?? cat.label;
        return currentKey === categoryKey;
      });

      const serviceIdToRemove =
        categoryToRemove?.serviceId ?? categoryToRemove?.id ?? null;
      if (serviceIdToRemove) {
        setRemovedServiceIds((prevRemoved) => [
          ...new Set([...prevRemoved, serviceIdToRemove]),
        ]);
      }

      return {
        ...prev,
        categories: (prev.categories || []).filter((category) => {
          const currentKey = category.key ?? category.id ?? category.label;
          return currentKey !== categoryKey;
        }),
      };
    });
  };

  const openBookingDetails = (booking) => {
    setModalError("");
    setRemovedServiceIds([]);
    setSelectedBooking({
      ...booking,
      categories: (booking.categories || []).map((category) => ({
        ...category,
      })),
    });
  };

  const handleSaveItemQuantities = async () => {
    if (!selectedBooking) return;

    const token = localStorage.getItem("vendorToken");
    if (!token) {
      setModalError("Missing authentication token. Please log in again.");
      return;
    }

    const activeItems = (selectedBooking.categories || []).map((category) => {
      const totalAmount =
        category.totalAmount !== null && category.totalAmount !== undefined
          ? Number(category.totalAmount)
          : (category.quantity ?? 0) * (category.unitPrice ?? 0);
      const item = {
        serviceId: Number(category.serviceId ?? category.id),
        quantity: Number(category.quantity ?? 0),
        total_amount: totalAmount,
      };
      console.log("Saving order item:", item);
      return item;
    });

    const removalItems = removedServiceIds.map((serviceId) => ({
      serviceId: Number(serviceId),
      quantity: 0,
      total_amount: 0,
    }));

    const payload = [...activeItems, ...removalItems].filter(
      (item) => item.serviceId && item.quantity >= 0
    );

    console.log("Payload being sent:", payload);

    if (payload.length === 0) {
      setModalError("No services available to update.");
      return;
    }

    setSavingItems(true);
    setModalError("");

    try {
      const response = await updateOrderItems({
        token,
        orderId: selectedBooking.orderId,
        items: payload,
      });

      const updatedOrder = response.data;
      console.log('Updated order from backend:', updatedOrder); // Debug log
      setOrders((prev) =>
        prev.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
      const updatedBooking = mapOrderToCard(updatedOrder);
      console.log('Mapped booking categories:', updatedBooking.categories); // Debug log
      setSelectedBooking(updatedBooking);
      setRemovedServiceIds([]);
    } catch (apiError) {
      setModalError(
        apiError.message || "Failed to update item quantities."
      );
    } finally {
      setSavingItems(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedBooking || !newStatus) return;

    const token = localStorage.getItem("vendorToken");
    if (!token) {
      setModalError("Missing authentication token. Please log in again.");
      return;
    }

    setSavingStatus(true);
    setModalError("");

    try {
      const response = await updateOrderStatus({
        token,
        orderId: selectedBooking.orderId,
        status: newStatus,
      });
      const updatedOrder = response.data;
      replaceOrderInState(setOrders, updatedOrder);
      const updatedBooking = mapOrderToCard(updatedOrder);
      setSelectedBooking(updatedBooking);
    } catch (apiError) {
      setModalError(
        apiError.message || "Failed to update order status."
      );
    } finally {
      setSavingStatus(false);
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      const token = localStorage.getItem("vendorToken");
      if (!token) return;
      setServicesLoading(true);
      setServicesError("");
      try {
        const response = await getServices({ token, audience: "vendor" });
        setServices(response.data || []);
      } catch (apiError) {
        setServicesError(apiError.message || "Unable to load services.");
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem("vendorToken");
      if (!token) {
        setError("Missing authentication token. Please log in again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const statusParam = statusFilter === "express" ? "all" : statusFilter;
        const response = await getStoreOrders({ token, status: statusParam });
        setOrders(response.data || []);
      } catch (apiError) {
        setError(apiError.message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter]);

  const bookings = useMemo(() => {
    const filteredOrders =
      statusFilter === "express"
        ? orders.filter((order) => order.is_express || order.isExpress)
        : orders;
    const mapped = filteredOrders.map(mapOrderToCard);
    // Sort so latest created orders appear first
    return mapped.sort((a, b) => {
      const aTime = new Date(a.rawCreatedAt || 0).getTime();
      const bTime = new Date(b.rawCreatedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [orders, statusFilter]);

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100">
        <Container className="py-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
            <div>
              <h4 className="mb-0">Booking board</h4>
              <small className="text-muted">
                Tap a card to inspect order contents and delivery flow.
              </small>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Button
                variant="success"
                onClick={() => navigate("/create-order")}
              >
                + Create New Order
              </Button>
              <Form.Select
                aria-label="Filter bookings"
                style={{ width: 240 }}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === "all"
                          ? "All statuses"
                          : option === "express"
                          ? "Express orders"
                          : STATUS_CONFIG[option]?.label || option}
                      </option>
                    ))}
              </Form.Select>
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          <Row className="g-4">
            {loading ? (
              <Col className="d-flex justify-content-center py-5">
                <Spinner animation="border" role="status" />
              </Col>
            ) : bookings.length > 0 ? (
              bookings.map((booking) => {
                const badge = STATUS_CONFIG[booking.status] || {
                  variant: "secondary",
                  label: booking.status,
                };
                return (
                  <Col md={4} key={booking.orderId}>
                    <Card
                      className="shadow-sm h-100 border-0 position-relative hover-overlay"
                      onClick={() => openBookingDetails(booking)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: booking.isWalkIn
                          ? "#e6f0ff"
                          : booking.isExpress
                          ? "#fff4e5"
                          : undefined,
                      }}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <p className="text-muted mb-1">{booking.date}</p>
                            <h5 className="mb-0">{booking.customer}</h5>
                            {booking.isWalkIn && (
                              <div className="small text-primary fw-semibold">
                                Walk-in order
                              </div>
                            )}
                            {booking.isExpress && (
                              <div className="small text-warning fw-semibold">
                                Express service
                              </div>
                            )}
                            <small className="text-muted">
                              {booking.userName}
                              {booking.userPhone ? ` · ${booking.userPhone}` : ""}
                            </small>
                          </div>
                          <Badge bg={badge.variant}>{badge.label}</Badge>
                        </div>
                        <p className="text-muted mb-2">
                          {booking.service} · {booking.weight}
                        </p>
                        <div className="d-flex flex-column gap-1 small">
                          <span>
                            Pickup: <strong>{booking.pickupSlot}</strong>
                          </span>
                          {booking.deliverySlot && (
                            <span>
                              Delivery: <strong>{booking.deliverySlot}</strong>
                            </span>
                          )}
                        </div>
                      </Card.Body>
                      <Card.Footer className="bg-transparent border-0 text-primary fw-semibold">
                        View order details →
                      </Card.Footer>
                    </Card>
                  </Col>
                );
              })
            ) : (
              <Col>
                <Card className="shadow-sm border-0 text-center py-5">
                  <Card.Body>
                    <p className="text-muted mb-0">
                      No orders match this status right now.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Container>
      </div>

      <Modal
        show={!!selectedBooking}
        onHide={() => {
          setSelectedBooking(null);
          setModalError("");
          setRemovedServiceIds([]);
        }}
        size="lg"
        centered
      >
        {selectedBooking && (
          <>
            <Modal.Header closeButton>
              <div>
                <h5 className="mb-0">
                  {selectedBooking.customer} · {selectedBooking.id}
                </h5>
                <small className="text-muted">{selectedBooking.date}</small>
              </div>
            </Modal.Header>
            <Modal.Body>
              <Row className="g-4">
                <Col md={6}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <p className="text-muted mb-1">Service window</p>
                      <p className="mb-1">
                        Pickup: <strong>{selectedBooking.pickupSlot}</strong>
                      </p>
                      {selectedBooking.deliverySlot && (
                        <p className="mb-1">
                          Delivery: <strong>{selectedBooking.deliverySlot}</strong>
                        </p>
                      )}
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <span className="text-muted">Status:</span>
                        <Badge
                          bg={
                            STATUS_CONFIG[selectedBooking.status]?.variant ||
                            "secondary"
                          }
                        >
                          {STATUS_CONFIG[selectedBooking.status]?.label ||
                            selectedBooking.status}
                        </Badge>
                      </div>
                      <Form.Select
                        aria-label="Update status"
                        size="sm"
                        className="mt-2"
                        value={selectedBooking.status}
                        disabled={savingStatus}
                        onChange={(event) =>
                          handleUpdateStatus(event.target.value)
                        }
                      >
                        {Object.keys(STATUS_CONFIG).map((status) => (
                          <option key={status} value={status}>
                            {STATUS_CONFIG[status].label}
                          </option>
                        ))}
                      </Form.Select>
                    </Card.Body>
                  </Card>
                  <Card className="border-0 mt-3">
                    <Card.Body>
                      <p className="text-muted mb-1">Customer contact</p>
                      <p className="mb-0 fw-semibold">{selectedBooking.userName}</p>
                      {selectedBooking.userPhone && (
                        <p className="mb-0 small text-muted">{selectedBooking.userPhone}</p>
                      )}
                      {selectedBooking.userEmail && (
                        <p className="mb-0 small text-muted">{selectedBooking.userEmail}</p>
                      )}
                    </Card.Body>
                  </Card>
                  <Card className="border-0 mt-3">
                    <Card.Body>
                      <p className="text-muted mb-1">Drop-off location</p>
                      <div className="d-flex justify-content-between align-items-center gap-3">
                        <p className="mb-0 flex-grow-1">{selectedBooking.address}</p>
                        {selectedBooking.mapsUrl && (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => window.open(selectedBooking.mapsUrl, "_blank")}
                          >
                            <span role="img" aria-label="location">
                              📍
                            </span>{" "}
                            Directions
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-light h-100">
                    <Card.Body>
                      <p className="text-muted">Items & categories</p>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                        <Form.Select
                          size="sm"
                          style={{ width: "220px" }}
                          disabled={servicesLoading || services.length === 0}
                          value={newServiceId}
                          onChange={(e) => setNewServiceId(e.target.value)}
                        >
                          <option value="">
                            {servicesLoading
                              ? "Loading services..."
                              : services.length === 0
                              ? "No services available"
                              : "Select service to add"}
                          </option>
                          {services.map((svc) => (
                            <option key={svc.id} value={svc.id}>
                              {svc.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          disabled={
                            servicesLoading || services.length === 0 || !newServiceId
                          }
                          onClick={handleAddServiceLine}
                        >
                          Add service
                        </Button>
                      </div>
                      {servicesError && (
                        <div className="text-danger small mb-2">
                          {servicesError}
                        </div>
                      )}
                      {servicesLoading && (
                        <div className="text-muted small mb-2">
                          Loading services...
                        </div>
                      )}
                      {modalError && (
                        <Alert variant="danger" className="py-2">
                          {modalError}
                        </Alert>
                      )}
                      <div className="d-flex flex-column gap-3">
                        {selectedBooking.categories.length > 0 ? (
                          selectedBooking.categories.map((category) => {
                            const categoryKey =
                              category.key ?? category.id ?? category.label;
                            // Use totalAmount from backend if available, otherwise calculate
                            const lineTotal = category.totalAmount !== null && category.totalAmount !== undefined
                              ? Number(category.totalAmount)
                              : (category.quantity ?? 0) * (category.unitPrice ?? 0);
                            return (
                              <div
                                key={categoryKey}
                                className="p-3 bg-white rounded border"
                              >
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <strong>{category.label}</strong>
                                    <p className="mb-0 small text-muted">
                                      {category.description}
                                    </p>
                                  </div>
                                  <div className="d-flex align-items-start gap-2">
                                    <div className="text-end">
                                      <small className="text-muted d-block">
                                        {formatCurrency(category.unitPrice || 0)} each
                                      </small>
                                      <span className="fw-semibold">
                                        {formatCurrency(lineTotal)}
                                      </span>
                                    </div>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleRemoveCategory(categoryKey)}
                                      title="Remove item"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-2">
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    disabled={(category.quantity ?? 0) === 0}
                                    onClick={() =>
                                      handleCategoryQuantityChange(
                                        categoryKey,
                                        -1
                                      )
                                    }
                                  >
                                    -
                                  </Button>
                                  <span className="fw-semibold">
                                    {category.quantity ?? 0}
                                  </span>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() =>
                                      handleCategoryQuantityChange(
                                        categoryKey,
                                        1
                                      )
                                    }
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-muted small mb-0">
                            No specific garments recorded for this order.
                          </p>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <Card className="border-0 mt-4">
                <Card.Body className="d-flex flex-wrap justify-content-between gap-3">
                  <div>
                    <p className="text-muted mb-1">Payment summary</p>
                    <p className="mb-0">
                      Subtotal: ₹{selectedBooking.payment.subtotal}
                    </p>
                    <p className="mb-0">
                      Service fee: ₹{selectedBooking.payment.serviceFee}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-muted mb-1">Total billed</p>
                    <h4 className="mb-1">₹{selectedBooking.payment.total}</h4>
                    <small className="text-success">
                      {selectedBooking.payment.method}
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-between">
              <Button
                variant="primary"
                size="sm"
                disabled={savingItems}
                onClick={handleSaveItemQuantities}
              >
                {savingItems ? "Saving..." : "Save quantities"}
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => {
                  setSelectedBooking(null);
                  setModalError("");
                  setRemovedServiceIds([]);
                }}
              >
                Done
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
};

export default Booking;

