import { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import AppNavbar from "../../components/Navbar";
import { createOrder, getServices } from "../../services/api";
import { useNavigate } from "react-router-dom";

const CreateOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Address details
  const [deliveryType, setDeliveryType] = useState("pickup"); // 'pickup' or 'delivery'
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [house, setHouse] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Order details
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState("");
  const [isExpress, setIsExpress] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      const token = localStorage.getItem("vendorToken");
      if (!token) return;

      setServicesLoading(true);
      try {
        const response = await getServices({ token, audience: "vendor" });
        setServices(response.data || []);
      } catch (apiError) {
        setError(apiError.message || "Unable to load services.");
      } finally {
        setServicesLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Auto-fill address fields when customer name/phone changes
  useEffect(() => {
    if (customerName && !fullName) {
      setFullName(customerName);
    }
    if (customerPhone && !phone) {
      setPhone(customerPhone);
    }
  }, [customerName, customerPhone, fullName, phone]);

  const handleServiceToggle = (serviceId) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId);
      if (exists) {
        return prev.filter((s) => s.serviceId !== serviceId);
      } else {
        const service = services.find((s) => s.id === serviceId);
        return [
          ...prev,
          {
            serviceId: serviceId,
            id: serviceId,
            quantity: 1,
            name: service?.name || "",
            price: service?.price || 0,
          },
        ];
      }
    });
  };

  const handleQuantityChange = (serviceId, delta) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId
          ? { ...s, quantity: Math.max(1, s.quantity + delta) }
          : s
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = localStorage.getItem("vendorToken");
    if (!token) {
      setError("Missing authentication token. Please log in again.");
      setLoading(false);
      return;
    }

    // Validation
    if (!customerName || !customerPhone) {
      setError("Customer name and phone are required");
      setLoading(false);
      return;
    }

    if (deliveryType === "delivery") {
      if (!addressLine || !house || !street || !city || !state || !pincode) {
        setError("All address fields are required for delivery");
        setLoading(false);
        return;
      }
    }

    if (selectedServices.length === 0) {
      setError("Please select at least one service");
      setLoading(false);
      return;
    }

    try {
      const orderData = {
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        deliveryType,
        fullName: fullName || customerName,
        phone: phone || customerPhone,
        altPhone: altPhone || null,
        addressLine: deliveryType === "delivery" ? addressLine : null,
        house: deliveryType === "delivery" ? house : null,
        street: deliveryType === "delivery" ? street : null,
        city: deliveryType === "delivery" ? city : null,
        state: deliveryType === "delivery" ? state : null,
        pincode: deliveryType === "delivery" ? pincode : null,
        landmark: deliveryType === "delivery" ? (landmark || null) : null,
        latitude: deliveryType === "delivery" ? (latitude ? parseFloat(latitude) : null) : null,
        longitude: deliveryType === "delivery" ? (longitude ? parseFloat(longitude) : null) : null,
        services: selectedServices.map((s) => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
        })),
        notes: notes || null,
        isExpress,
        paymentMode: "cash",
      };

      const response = await createOrder({ token, orderData });

      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setFullName("");
      setPhone("");
      setAltPhone("");
      setAddressLine("");
      setHouse("");
      setStreet("");
      setCity("");
      setState("");
      setPincode("");
      setLandmark("");
      setLatitude("");
      setLongitude("");
      setSelectedServices([]);
      setNotes("");
      setIsExpress(false);
      setDeliveryType("pickup");

      // Navigate to orders page
      navigate("/booking");
    } catch (apiError) {
      setError(apiError.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const selectedServicesList = selectedServices.map((s) => {
    const service = services.find((svc) => svc.id === s.serviceId);
    return { ...s, ...service };
  });

  const totalAmount = selectedServicesList.reduce(
    (sum, s) => sum + (s.quantity || 1) * (parseFloat(s.price) || 0),
    0
  );

  return (
    <>
      <AppNavbar />
      <Container className="mt-4">
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="mb-0">Create New Order</h4>
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate("/booking")}
                  >
                    Back to Orders
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>Customer Details</Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Customer Name *</Form.Label>
                            <Form.Control
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Phone Number *</Form.Label>
                            <Form.Control
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              required
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                              type="email"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                            />
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>Delivery Type</Card.Header>
                        <Card.Body>
                          <Form.Group className="mb-3">
                            <Form.Label>Order Type *</Form.Label>
                            <Form.Select
                              value={deliveryType}
                              onChange={(e) => setDeliveryType(e.target.value)}
                              required
                            >
                              <option value="pickup">Store Pickup</option>
                              <option value="delivery">Home Delivery</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                              Select pickup if customer will collect from store, or delivery for home delivery.
                            </Form.Text>
                          </Form.Group>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  {deliveryType === "delivery" && (
                    <Card className="mb-3">
                      <Card.Header>Delivery Address</Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Full Name *</Form.Label>
                              <Form.Control
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required={deliveryType === "delivery"}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Phone *</Form.Label>
                              <Form.Control
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required={deliveryType === "delivery"}
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Alternate Phone</Form.Label>
                          <Form.Control
                            type="tel"
                            value={altPhone}
                            onChange={(e) => setAltPhone(e.target.value)}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>House/Building *</Form.Label>
                          <Form.Control
                            type="text"
                            value={house}
                            onChange={(e) => setHouse(e.target.value)}
                            required={deliveryType === "delivery"}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Street *</Form.Label>
                          <Form.Control
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            required={deliveryType === "delivery"}
                          />
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Address Line *</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            value={addressLine}
                            onChange={(e) => setAddressLine(e.target.value)}
                            required={deliveryType === "delivery"}
                          />
                        </Form.Group>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>City *</Form.Label>
                              <Form.Control
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required={deliveryType === "delivery"}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>State *</Form.Label>
                              <Form.Control
                                type="text"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                required={deliveryType === "delivery"}
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Pincode *</Form.Label>
                              <Form.Control
                                type="text"
                                value={pincode}
                                onChange={(e) => setPincode(e.target.value)}
                                required={deliveryType === "delivery"}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Landmark</Form.Label>
                              <Form.Control
                                type="text"
                                value={landmark}
                                onChange={(e) => setLandmark(e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Latitude (Optional)</Form.Label>
                              <Form.Control
                                type="number"
                                step="any"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Longitude (Optional)</Form.Label>
                              <Form.Control
                                type="number"
                                step="any"
                                value={longitude}
                                onChange={(e) => setLongitude(e.target.value)}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  )}

                  <Card className="mb-3">
                    <Card.Header>Services</Card.Header>
                    <Card.Body>
                      {servicesLoading ? (
                        <Spinner animation="border" />
                      ) : (
                        <>
                          <Form.Group className="mb-3">
                            <Form.Label>Select Services *</Form.Label>
                            <div
                              className="border rounded p-3"
                              style={{ maxHeight: "200px", overflowY: "auto" }}
                            >
                              {services.map((service) => (
                                <Form.Check
                                  key={service.id}
                                  type="checkbox"
                                  label={`${service.name} - ₹${parseFloat(
                                    service.price || 0
                                  ).toFixed(2)}`}
                                  checked={selectedServices.some(
                                    (s) => s.serviceId === service.id
                                  )}
                                  onChange={() =>
                                    handleServiceToggle(service.id)
                                  }
                                />
                              ))}
                            </div>
                          </Form.Group>

                          {selectedServices.length > 0 && (
                            <div className="mb-3">
                              <h6>Selected Services:</h6>
                              <Table striped bordered hover size="sm">
                                <thead>
                                  <tr>
                                    <th>Service</th>
                                    <th>Price</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedServicesList.map((service) => (
                                    <tr key={service.serviceId}>
                                      <td>{service.name}</td>
                                      <td>
                                        ₹{parseFloat(service.price || 0).toFixed(2)}
                                      </td>
                                      <td>{service.quantity}</td>
                                      <td>
                                        ₹{((service.quantity || 1) *
                                          (parseFloat(service.price) || 0)).toFixed(2)}
                                      </td>
                                      <td>
                                        <Button
                                          size="sm"
                                          variant="outline-secondary"
                                          onClick={() =>
                                            handleQuantityChange(
                                              service.serviceId,
                                              -1
                                            )
                                          }
                                        >
                                          -
                                        </Button>
                                        {" "}
                                        <Button
                                          size="sm"
                                          variant="outline-secondary"
                                          onClick={() =>
                                            handleQuantityChange(
                                              service.serviceId,
                                              1
                                            )
                                          }
                                        >
                                          +
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <th colSpan={3}>Total</th>
                                    <th>₹{totalAmount.toFixed(2)}</th>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </Table>
                            </div>
                          )}
                        </>
                      )}
                    </Card.Body>
                  </Card>

                  <Card className="mb-3">
                    <Card.Header>Order Details</Card.Header>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          label="Express Service"
                          checked={isExpress}
                          onChange={(e) => setIsExpress(e.target.checked)}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Notes</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Special instructions or notes..."
                        />
                      </Form.Group>
                    </Card.Body>
                  </Card>

                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => navigate("/booking")}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />
                          Creating...
                        </>
                      ) : (
                        "Create Order"
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default CreateOrder;

