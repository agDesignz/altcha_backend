export function logSecurityEvent(event, details = {}) {
  const logEntry = {
    type: "security_event",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };

  console.warn(JSON.stringify(logEntry));
}
