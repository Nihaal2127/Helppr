module.exports = function override(config) {
  // Fix resolution of React JSX runtime in strict ESM modules like @floating-ui/react
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    "react/jsx-runtime": "react/jsx-runtime.js",
    "react/jsx-dev-runtime": "react/jsx-dev-runtime.js",
  };

  return config;
}

