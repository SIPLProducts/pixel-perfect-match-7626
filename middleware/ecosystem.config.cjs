module.exports = {
  apps: [{
    name: "qr-sap-proxy",
    script: "server.js",
    cwd: __dirname,
    env: {
      PORT: 3012,
      PROXY_SECRET: "set-on-server",
      ALLOWED_SAP_HOSTS: "",
      SAP_INSECURE_TLS: "0",
    },
  }],
};
