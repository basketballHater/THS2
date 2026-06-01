// Simple hash-less client-side router
const Router = (() => {
  const routes = {};
  let current = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(path, params = {}) {
    current = { path, params };
    if (routes[path]) {
      routes[path](params);
    } else {
      document.getElementById('page-content').innerHTML =
        `<div style="padding:40px;color:#c00">Page not found: ${path}</div>`;
    }
  }

  function getCurrent() { return current; }

  return { register, navigate, getCurrent };
})();
