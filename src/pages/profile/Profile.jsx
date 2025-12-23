import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import AppNavbar from "../../components/Navbar";
import {
  getStoreProfile,
  updateStoreStatus,
} from "../../services/api";

const formatAddress = (store) => {
  if (!store) return "Address not available.";
  const parts = [
    store.address,
    store.city,
    store.state,
    store.pincode,
    store.country,
  ]
    .filter(Boolean)
    .join(", ");
  return parts || "Address not available.";
};

const buildMapsUrl = (store) => {
  if (!store) return null;
  const query = [
    store.address,
    store.city,
    store.state,
    store.pincode,
    store.country,
  ]
    .filter(Boolean)
    .join(" ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
};

const formatDate = (value) => {
  if (!value) return "–";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Profile = () => {
  const cachedStore = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("storeData"));
    } catch {
      return null;
    }
  }, []);

  const [profile, setProfile] = useState(cachedStore);
  const [loading, setLoading] = useState(!cachedStore);
  const [error, setError] = useState("");
  const [statusValue, setStatusValue] = useState(
    cachedStore?.is_active ? "active" : "inactive"
  );
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("vendorToken");
    if (!token) {
      setError("Missing authentication token. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getStoreProfile(token);
      setProfile(response.data);
      localStorage.setItem("storeData", JSON.stringify(response.data));
      setStatusValue(response.data.is_active ? "active" : "inactive");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setStatusValue(profile.is_active ? "active" : "inactive");
    }
  }, [profile]);

  const handleStatusChange = async (event) => {
    const nextValue = event.target.value;
    const token = localStorage.getItem("vendorToken");

    if (!token) {
      setError("Missing authentication token. Please log in again.");
      return;
    }

     if (profile?.is_admin_locked) {
       setError("Store status is locked by admin. Please contact support.");
       return;
     }

    setStatusValue(nextValue);
    setStatusUpdating(true);
    setStatusMessage("");

    try {
      const response = await updateStoreStatus({ token, status: nextValue });
      setProfile(response.data);
      localStorage.setItem("storeData", JSON.stringify(response.data));
      setStatusMessage(
        `Store status updated to ${nextValue === "active" ? "Active" : "Inactive"}.`
      );
    } catch (apiError) {
      setError(apiError.message);
      setStatusValue(profile?.is_active ? "active" : "inactive");
    } finally {
      setStatusUpdating(false);
    }
  };

  const mapsUrl = buildMapsUrl(profile);
  const adminLocked = Boolean(profile?.is_admin_locked);
  const statusHelperText = adminLocked
    ? "Status locked by admin"
    : statusUpdating
    ? "Saving status..."
    : "Change store status";

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100">
        <Container className="py-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
              <h4 className="mb-0">Store profile</h4>
              <small className="text-muted">
                Review and share key store details with your operations team.
              </small>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => window.history.back()}>
                Back
              </Button>
              <Button variant="primary" onClick={fetchProfile} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" role="status" />
            </div>
          ) : profile ? (
            <Row className="g-4">
              <Col lg={8}>
                <Card className="shadow-sm border-0 mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <p className="text-muted mb-1">Store name</p>
                        <h4 className="mb-0">{profile.name}</h4>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-2">
                        <Badge bg={profile.is_active ? "success" : "secondary"}>
                          {profile.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Form.Select
                          size="sm"
                          value={statusValue}
                          onChange={handleStatusChange}
                          disabled={statusUpdating || adminLocked}
                          aria-label="Store status selector"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </Form.Select>
                        <small className={adminLocked ? "text-danger" : "text-muted"}>
                          {statusHelperText}
                        </small>
                      </div>
                    </div>
                    {adminLocked && (
                      <Alert variant="warning" className="py-2">
                        Store status is controlled by your admin. Contact support to
                        make changes.
                      </Alert>
                    )}
                    {statusMessage && !adminLocked && (
                      <Alert variant="success" className="py-2">
                        {statusMessage}
                      </Alert>
                    )}
                    <Row className="g-3">
                      <Col md={6}>
                        <small className="text-muted d-block">Email</small>
                        <span className="fw-semibold">{profile.email || "–"}</span>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted d-block">Phone</small>
                        <span className="fw-semibold">{profile.phone || "–"}</span>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted d-block">Admin ID</small>
                        <span>{profile.admin_id}</span>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted d-block">Store ID</small>
                        <span>{profile.id}</span>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="shadow-sm border-0">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <p className="text-muted mb-1">Primary address</p>
                        <h5 className="mb-0">{profile.address || "Not set"}</h5>
                      </div>
                      {mapsUrl && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => window.open(mapsUrl, "_blank")}
                        >
                          <span role="img" aria-label="location">
                            📍
                          </span>{" "}
                          Open in Maps
                        </Button>
                      )}
                    </div>
                    <p className="text-muted mb-2">{formatAddress(profile)}</p>
                    <Row className="g-3">
                      <Col md={4}>
                        <small className="text-muted d-block">Latitude</small>
                        <span>{profile.latitude ?? "–"}</span>
                      </Col>
                      <Col md={4}>
                        <small className="text-muted d-block">Longitude</small>
                        <span>{profile.longitude ?? "–"}</span>
                      </Col>
                      <Col md={4}>
                        <small className="text-muted d-block">Pincode</small>
                        <span>{profile.pincode ?? "–"}</span>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4}>
                <Card className="shadow-sm border-0 mb-4">
                  <Card.Body>
                    <p className="text-muted mb-1">Account timeline</p>
                    <div className="d-flex flex-column gap-2">
                      <div>
                        <small className="text-muted d-block">Created at</small>
                        <span>{formatDate(profile.created_at)}</span>
                      </div>
                      <div>
                        <small className="text-muted d-block">Updated at</small>
                        <span>{formatDate(profile.updated_at)}</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                <Card className="shadow-sm border-0">
                  <Card.Body>
                    <p className="text-muted mb-1">Quick actions</p>
                    <div className="d-grid gap-2">
                      <Button variant="outline-secondary" size="sm" onClick={fetchProfile}>
                        Refresh profile
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => window.location.assign("/booking")}
                      >
                        View bookings
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          ) : (
            <Card className="shadow-sm border-0 text-center py-5">
              <Card.Body>
                <p className="text-muted mb-3">No profile data available right now.</p>
                <Button variant="primary" onClick={fetchProfile}>
                  Try again
                </Button>
              </Card.Body>
            </Card>
          )}
        </Container>
      </div>
    </>
  );
};

export default Profile;

