import { useNavigate } from "react-router-dom";
import "./App.css";

function Login() {
  const navigate = useNavigate();

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="logo login-logo">
          <span className="logo-icon">S</span>
          <span>Sahāyu</span>
        </div>

        <h1>
          Welcome to <span>Sahāyu</span>
        </h1>

        <p className="login-description">
          Choose how you want to use Sahāyu.
        </p>


        <div className="role-options">

          <button
            className="role-card"
            onClick={() => navigate("/customer")}
          >
            <div className="role-icon">
              🏠
            </div>

            <div>
              <h2>I'm a Customer</h2>
              <p>
                Find trusted workers for your household needs.
              </p>
            </div>

            <span className="role-arrow">
              →
            </span>
          </button>


          <button
            className="role-card"
            onClick={() => navigate("/worker")}
          >
            <div className="role-icon">
              🛠️
            </div>

            <div>
              <h2>I'm a Worker</h2>
              <p>
                Find local opportunities and grow your work.
              </p>
            </div>

            <span className="role-arrow">
              →
            </span>
          </button>

        </div>


        <button
          className="back-home-btn"
          onClick={() => navigate("/")}
        >
          ← Back to Home
        </button>

      </div>

    </div>
  );
}

export default Login;