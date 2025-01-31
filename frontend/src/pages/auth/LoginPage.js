import React, { useState } from 'react';

const LoginPage = () => {
  // State to store input values
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Do something with the form values (send them to the server, etc.)
    console.log('User ID:', userId);
    console.log('Password:', password);
  };

  return (
    <div className="container-fluid">
      <div className="row custom-row">
        {/* Left side with background image */}
        <div className="col-md-6 text-center bg-image d-none d-md-block">
          <img src={`${process.env.PUBLIC_URL}assets/icons/login-bg-logo.svg`} className="img-fluid" alt="Background Logo" />
        </div>

        {/* Right side with login form */}
        <div className="col-md-6 login-container">
          <div className="login-box text-center p-4 shadow">
            <div className="logo mb-3">
              <img src={`${process.env.PUBLIC_URL}assets/icons/login-logo.svg`} alt="Logo" />
            </div>
            <h2 className="mb-4 title">helper!</h2>
            <form onSubmit={handleSubmit}>
              {/* User ID Input */}
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter User ID"
                  name="user_id"
                  id="user_id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)} // Update state on change
                />
              </div>

              {/* Password Input */}
              <div className="input-group mb-3">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter Password"
                  name="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} // Update state on change
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-button">
                Login
              </button>

              {/* Forgot Password Link */}
              <a href="#" className="forgot-pwd">Forgot Password</a>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
