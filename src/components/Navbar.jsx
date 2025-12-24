import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const AppNavbar = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("isAuth");
    navigate("/");
  };

  return (
    <Navbar variant="dark" expand="lg" style={{ backgroundColor: "#efececff" }}>
      <Container>
        <Navbar.Brand as={NavLink} to="/booking">
          <img src={logo} alt="Vendor" style={{ height: 44, objectFit: "contain" }} />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* <Nav.Link as={NavLink} to="/dashboard">
              Dashboard
            </Nav.Link> */}
          </Nav>
          <Nav>
            <Nav.Link as={NavLink} to="/revenue" className="text-black">
              Revenue
            </Nav.Link>
            <Nav.Link as={NavLink} to="/profile" className="text-black">
              Profile
            </Nav.Link>
            <Nav.Link onClick={logout} style={{ cursor: "pointer", color: "black" }}>
              Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
