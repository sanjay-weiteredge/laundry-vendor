import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { storeLogin } from "../../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("isAuth") === "true") {
      navigate("/booking", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please provide both email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await storeLogin({ email, password });
      localStorage.setItem("vendorToken", result.token);
      localStorage.setItem("storeData", JSON.stringify(result.data));
      localStorage.setItem("isAuth", "true");
      navigate("/booking", { replace: true });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light py-5">
      <Container>
        <Row className="justify-content-center">
          <Col sm={10} md={8} lg={5}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <h2 className="text-center mb-3">Vendor Portal</h2>
                <p className="text-muted text-center mb-4">
                  Sign in to manage bookings, slots, and orders.
                </p>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="email">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="vendor@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-4" controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    className="w-100"
                    disabled={isSubmitting}
                    variant="primary"
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                </Form>
                <div className="text-center mt-4">
                  <small className="text-muted">
                    Demo login accepts any credentials.
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;

