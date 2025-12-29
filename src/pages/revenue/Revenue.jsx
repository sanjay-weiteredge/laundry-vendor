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
  setRevenuePassword,
  verifyRevenuePassword,
  getTransactionHistory,
  getTransactionHistoryByDateRange,
} from "../../services/api";

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }
};

const formatDate = (value) => {
  if (!value) return "–";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Revenue = () => {
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

  const [hasRevenuePassword, setHasRevenuePassword] = useState(
    Boolean(cachedStore?.revenue_password_hash)
  );
  const [revenueUnlocked, setRevenueUnlocked] = useState(
    !cachedStore?.revenue_password_hash
  );

  const [revenuePassword, setRevenuePasswordInput] = useState("");
  const [revenueVerifyError, setRevenueVerifyError] = useState("");
  const [revenueVerifyMessage, setRevenueVerifyMessage] = useState("");
  const [verifyingRevenue, setVerifyingRevenue] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newRevenuePassword, setNewRevenuePassword] = useState("");
  const [revenueSetError, setRevenueSetError] = useState("");
  const [revenueSetMessage, setRevenueSetMessage] = useState("");
  const [settingRevenuePassword, setSettingRevenuePassword] = useState(false);

  const [transactionPeriod, setTransactionPeriod] = useState("30");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [useDateRange, setUseDateRange] = useState(true);
  const [transactionData, setTransactionData] = useState(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");

  const revenueCards = useMemo(() => {
    const lockedDisplay = "●●●";
    const showValues = revenueUnlocked || !hasRevenuePassword;
    return [
      {
        label: "Current month revenue",
        value: showValues
          ? formatCurrency(profile?.revenue?.currentMonth)
          : lockedDisplay,
        tone: "linear-gradient(135deg, #e3f2fd, #fff)",
      },
      {
        label: "Last 90 days revenue",
        value: showValues
          ? formatCurrency(profile?.revenue?.last90Days)
          : lockedDisplay,
        tone: "linear-gradient(135deg, #e8f5e9, #fff)",
      },
      {
        label: "Last year revenue",
        value: showValues
          ? formatCurrency(profile?.revenue?.lastYear)
          : lockedDisplay,
        tone: "linear-gradient(135deg, #fff3e0, #fff)",
      },
    ];
  }, [hasRevenuePassword, profile?.revenue, revenueUnlocked]);

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
      const hasPwd = Boolean(response.data?.revenue_password_hash);
      const { revenue_password_hash, ...cleanData } = response.data || {};

      setProfile(cleanData);
      setHasRevenuePassword(hasPwd);
      setRevenueUnlocked(!hasPwd);
      localStorage.setItem("storeData", JSON.stringify(cleanData));
      setRevenueVerifyError("");
      setRevenueVerifyMessage("");
    } catch (apiError) {
      setError(apiError.message || "Unable to load revenue details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchTransactionHistory = useCallback(async () => {
    if (!revenueUnlocked && hasRevenuePassword) {
      return;
    }

    setTransactionLoading(true);
    setTransactionError("");

    try {
      const token = localStorage.getItem("vendorToken");
      if (!token) {
        setTransactionError("Missing authentication token. Please log in again.");
        return;
      }

      const response = await getTransactionHistoryByDateRange({ 
        token, 
        startDate,
        endDate
      });
      setTransactionData(response.data);
    } catch (apiError) {
      setTransactionError(apiError.message || "Unable to load transaction history.");
      setTransactionData(null);
    } finally {
      setTransactionLoading(false);
    }
  }, [startDate, endDate, revenueUnlocked, hasRevenuePassword]);

  // Initial load when component mounts and revenue is unlocked
  useEffect(() => {
    if (revenueUnlocked || !hasRevenuePassword) {
      fetchTransactionHistory();
    }
  }, [revenueUnlocked, hasRevenuePassword]);

  const handleVerifyRevenue = async (event) => {
    event.preventDefault();
    setRevenueVerifyError("");
    setRevenueVerifyMessage("");

    const token = localStorage.getItem("vendorToken");
    if (!token) {
      setRevenueVerifyError("Missing authentication token. Please log in again.");
      return;
    }

    if (!revenuePassword) {
      setRevenueVerifyError("Please enter your revenue password to continue.");
      return;
    }

    setVerifyingRevenue(true);
    try {
      await verifyRevenuePassword({ token, revenuePassword });
      setRevenueUnlocked(true);
      setRevenueVerifyMessage("Revenue access granted.");
      setRevenuePasswordInput("");
    } catch (apiError) {
      setRevenueVerifyError(apiError.message || "Unable to verify revenue password.");
      setRevenueUnlocked(false);
    } finally {
      setVerifyingRevenue(false);
    }
  };

  const handleSetRevenuePassword = async (event) => {
    event.preventDefault();
    setRevenueSetError("");
    setRevenueSetMessage("");

    const token = localStorage.getItem("vendorToken");
    if (!token) {
      setRevenueSetError("Missing authentication token. Please log in again.");
      return;
    }

    if (!currentPassword || !newRevenuePassword) {
      setRevenueSetError("Both current password and new revenue password are required.");
      return;
    }

    setSettingRevenuePassword(true);
    try {
      await setRevenuePassword({
        token,
        currentPassword,
        newPassword: newRevenuePassword,
      });
      setRevenueSetMessage("Revenue password updated successfully.");
      setHasRevenuePassword(true);
      setRevenueUnlocked(false);
      setCurrentPassword("");
      setNewRevenuePassword("");
    } catch (apiError) {
      setRevenueSetError(apiError.message || "Unable to update revenue password.");
    } finally {
      setSettingRevenuePassword(false);
    }
  };

  return (
    <>
      <AppNavbar />
      <div className="bg-light min-vh-100">
        <Container className="py-4">
          <Card className="border-0 shadow-sm mb-4" style={{ background: "linear-gradient(135deg, #f8f9ff, #f3f6ff)" }}>
            <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <p className="text-primary fw-semibold mb-1">Revenue dashboard</p>
                <h4 className="mb-1">Securely view your earnings</h4>
                <small className="text-muted">
                  Unlock totals with your revenue password or set a new one for your team.
                </small>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={() => window.location.assign("/booking")}
                >
                  Go to bookings
                </Button>
                <Button variant="primary" onClick={fetchProfile} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </Card.Body>
          </Card>

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
              <Col xs={12}>
                <Card className="shadow-sm border-0 mb-3">
                  <Card.Body>
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                      <div>
                        <p className="text-muted mb-1">Revenue visibility</p>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <Badge bg={revenueUnlocked || !hasRevenuePassword ? "success" : "secondary"}>
                            {revenueUnlocked || !hasRevenuePassword ? "Visible" : "Locked"}
                          </Badge>
                          <small className="text-muted">
                            {hasRevenuePassword
                              ? "Enter revenue password to view revenue amounts."
                              : "Set a revenue password to protect your revenue numbers."}
                          </small>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg={revenueUnlocked || !hasRevenuePassword ? "success" : "warning"}>
                          {revenueUnlocked || !hasRevenuePassword ? "Visible" : "Locked"}
                        </Badge>
                        <small className="text-muted">
                          {hasRevenuePassword
                            ? "Locked until password verified."
                            : "Set a password to lock totals."}
                        </small>
                      </div>
                    </div>
                    {revenueVerifyError && (
                      <Alert variant="danger" className="mt-3 mb-2 py-2">
                        {revenueVerifyError}
                      </Alert>
                    )}
                    {revenueVerifyMessage && (
                      <Alert variant="success" className="mt-3 mb-2 py-2">
                        {revenueVerifyMessage}
                      </Alert>
                    )}
                    {hasRevenuePassword && (
                      <Form className="mt-3" onSubmit={handleVerifyRevenue}>
                        <Row className="g-2 align-items-end">
                          <Col md={6}>
                            <Form.Label className="small text-muted mb-1">
                              Revenue password
                            </Form.Label>
                            <Form.Control
                              type="password"
                              value={revenuePassword}
                              onChange={(e) => setRevenuePasswordInput(e.target.value)}
                              placeholder="Enter revenue password"
                              autoComplete="current-password"
                            />
                          </Col>
                          <Col md="auto">
                            <Button type="submit" variant="primary" disabled={verifyingRevenue}>
                              {verifyingRevenue ? "Verifying..." : "Unlock revenue"}
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    )}

                    <hr className="text-muted" />
                    {revenueSetError && (
                      <Alert variant="danger" className="mb-2 py-2">
                        {revenueSetError}
                      </Alert>
                    )}
                    {revenueSetMessage && (
                      <Alert variant="success" className="mb-2 py-2">
                        {revenueSetMessage}
                      </Alert>
                    )}
                    <Form onSubmit={handleSetRevenuePassword} className="mt-2">
                      <p className="text-muted mb-2">Reset revenue password</p>
                      <Row className="g-2 align-items-end">
                        <Col md={4}>
                          <Form.Label className="small text-muted mb-1">
                            Current login password
                          </Form.Label>
                          <Form.Control
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Current store password"
                            autoComplete="current-password"
                          />
                        </Col>
                        <Col md={4}>
                          <Form.Label className="small text-muted mb-1">
                            New revenue password
                          </Form.Label>
                          <Form.Control
                            type="password"
                            value={newRevenuePassword}
                            onChange={(e) => setNewRevenuePassword(e.target.value)}
                            placeholder="Set revenue password"
                            autoComplete="new-password"
                          />
                        </Col>
                        <Col md="auto">
                          <Button
                            type="submit"
                            variant="outline-primary"
                            disabled={settingRevenuePassword}
                          >
                            {settingRevenuePassword ? "Saving..." : "Save password"}
                          </Button>
                        </Col>
                      </Row>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12}>
                <Card className="shadow-sm border-0">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <p className="text-muted mb-0">Revenue summary</p>
                      {!revenueUnlocked && hasRevenuePassword && (
                        <small className="text-danger">Locked — verify to reveal</small>
                      )}
                    </div>
                    <Row className="g-3">
                      {revenueCards.map((card) => (
                        <Col md={4} key={card.label}>
                          <Card
                            className="border-0 h-100 shadow-sm"
                            style={{ background: card.tone }}
                          >
                            <Card.Body>
                              <small className="text-muted d-block">{card.label}</small>
                              <h4 className="mb-1 mt-1">{card.value}</h4>
                              {hasRevenuePassword && !revenueUnlocked && (
                                <small className="text-muted">Unlock to view</small>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              {(revenueUnlocked || !hasRevenuePassword) && (
                <Col xs={12}>
                  <Card className="shadow-sm border-0">
                    <Card.Body>
                      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-3">
                        <div>
                          <h5 className="mb-1">Transaction history</h5>
                          <small className="text-muted">
                            View detailed transaction records for delivered orders
                          </small>
                        </div>
                        <div className="d-flex gap-2 align-items-end">
                          <div>
                            <Form.Label className="small text-muted mb-1">Start Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              max={endDate}
                            />
                          </div>
                          <div>
                            <Form.Label className="small text-muted mb-1">End Date</Form.Label>
                            <Form.Control
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate}
                              max={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <Button 
                            variant="primary" 
                            onClick={fetchTransactionHistory}
                            disabled={transactionLoading}
                          >
                            {transactionLoading ? 'Loading...' : 'Apply'}
                          </Button>
                        </div>
                      </div>

                      {transactionError && (
                        <Alert variant="danger" className="mb-3">
                          {transactionError}
                        </Alert>
                      )}

                      {transactionLoading ? (
                        <div className="d-flex justify-content-center py-4">
                          <Spinner animation="border" role="status" />
                        </div>
                      ) : transactionData ? (
                        <>
                          <Row className="g-3 mb-4">
                            <Col md={6}>
                              <Card className="border-0 bg-light">
                                <Card.Body>
                                  <small className="text-muted d-block">Total transactions</small>
                                  <h4 className="mb-0 mt-1">
                                    {transactionData.summary?.totalTransactions || 0}
                                  </h4>
                                </Card.Body>
                              </Card>
                            </Col>
                            <Col md={6}>
                              <Card className="border-0 bg-light">
                                <Card.Body>
                                  <small className="text-muted d-block">Total revenue</small>
                                  <h4 className="mb-0 mt-1">
                                    {formatCurrency(transactionData.summary?.totalRevenue || 0)}
                                  </h4>
                                </Card.Body>
                              </Card>
                            </Col>
                          </Row>

                          {transactionData.transactions && transactionData.transactions.length > 0 ? (
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead>
                                  <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Delivered Date</th>
                                    <th className="text-end">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transactionData.transactions.map((transaction, index) => (
                                    <tr key={transaction.orderId || index}>
                                      <td>
                                        <strong>ORD-{transaction.orderId}</strong>
                                      </td>
                                      <td>{transaction.userName || "Customer"}</td>
                                      <td>{formatDate(transaction.deliveredDate)}</td>
                                      <td className="text-end fw-semibold">
                                        {formatCurrency(transaction.totalAmount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <Card className="border-0 bg-light text-center py-4">
                              <Card.Body>
                                <p className="text-muted mb-0">
                                  No transactions found for the selected period.
                                </p>
                              </Card.Body>
                            </Card>
                          )}
                        </>
                      ) : null}
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          ) : (
            <Card className="shadow-sm border-0 text-center py-5">
              <Card.Body>
                <p className="text-muted mb-3">No revenue data available right now.</p>
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

export default Revenue;

