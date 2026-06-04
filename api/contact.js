const DEFAULT_TO = "info@addvaluerenovations.co.nz";

function clean(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || ""));
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let body = {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }
  } else if (typeof req.body === "object" && req.body) {
    body = req.body;
  }
  const honeypot = clean(body.company);
  if (honeypot) return sendJson(res, 200, { ok: true });

  const name = clean(body.name);
  const phone = clean(body.phone);
  const email = clean(body.email);
  const address = clean(body.address);
  const service = clean(body.service, "Not specified");
  const listDate = clean(body.listDate, "Not specified");
  const page = clean(body.page);
  const source = clean(body.source, "Add Value Refresh — Contact form");

  if (!name) return sendJson(res, 400, { error: "Name is required" });
  if (!phone && !email) return sendJson(res, 400, { error: "Phone or email is required" });
  if (email && !isEmail(email)) return sendJson(res, 400, { error: "Invalid email" });

  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;
  const token = process.env.EMAIL_WEBHOOK_TOKEN;
  if (!webhookUrl || !token) {
    return sendJson(res, 500, { error: "Contact form is not configured" });
  }

  const to = process.env.CONTACT_TO_EMAIL || DEFAULT_TO;
  const subject = `Add Value Refresh enquiry - ${name}`;
  const message = [
    "New Add Value Refresh website enquiry.",
    "",
    `Name: ${name}`,
    `Phone: ${phone || "-"}`,
    `Email: ${email || "-"}`,
    `Property: ${address || "-"}`,
    `Service: ${service}`,
    `Listing timing: ${listDate}`,
    "",
    `Source: ${source}`,
    `Page: ${page || "-"}`,
    `Submitted: ${new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}`
  ].join("\n");

  const payload = {
    token,
    action: "send",
    to,
    subject,
    body: message,
    fromName: "Add Value Refresh Website"
  };

  let response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual"
    });
  } catch {
    return sendJson(res, 502, { error: "Email service failed" });
  }

  if (response.status < 200 || response.status >= 400) {
    return sendJson(res, 502, { error: "Email service failed" });
  }

  return sendJson(res, 200, { ok: true });
};
