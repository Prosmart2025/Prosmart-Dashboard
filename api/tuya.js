// api/tuya.js - Vercel Serverless Function for Tuya Cloud OpenAPI
import crypto from 'crypto';

const REGION_HOSTS = {
  // Regional endpoints (AWS region aliases):
  'eu-central-1': 'openapi.tuyaeu.com',     // Central Europe
  'central-europe': 'openapi.tuyaeu.com',
  'Central Europe Data Center': 'openapi.tuyaeu.com',
  'eu-west-1': 'openapi-weaz.tuyaeu.com',    // Western Europe
  'us-east-1': 'openapi-ueaz.tuyaus.com',    // Eastern America
  'us-west-2': 'openapi.tuyaus.com',         // Western America
  'us-west-1': 'openapi.tuyaus.com',         // Western America alias
  'cn-north-1': 'openapi.tuyacn.com',        // China
  'in-south-1': 'openapi.tuyain.com',        // India
  // Standard Tuya codes:
  'eu': 'openapi.tuyaeu.com',
  'eu-w': 'openapi-weaz.tuyaeu.com',
  'us': 'openapi.tuyaus.com',
  'us-e': 'openapi-ueaz.tuyaus.com',
  'cn': 'openapi.tuyacn.com',
  'in': 'openapi.tuyain.com'
};

function calcSign(clientId, secret, timestamp, nonce, method, path, body = '', accessToken = '') {
  const contentHash = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = [method.toUpperCase(), contentHash, '', path].join('\n');
  const str = clientId + (accessToken ? accessToken : '') + timestamp + (nonce ? nonce : '') + stringToSign;
  return crypto.createHmac('sha256', secret).update(str).digest('hex').toUpperCase();
}

async function tuyaRequest(host, clientId, secret, method, path, body = null, token = '') {
  const timestamp = Date.now().toString();
  const nonce = '';
  const bodyStr = body ? JSON.stringify(body) : '';
  const sign = calcSign(clientId, secret, timestamp, nonce, method, path, bodyStr, token);

  const headers = {
    'client_id': clientId,
    'sign': sign,
    'sign_method': 'HMAC-SHA256',
    't': timestamp,
    'Content-Type': 'application/json'
  };
  if (token) headers['access_token'] = token;

  const url = `https://${host}${path}`;
  const response = await fetch(url, {
    method: method,
    headers: headers,
    body: method === 'GET' ? undefined : bodyStr
  });
  return await response.json();
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { clientId, clientSecret, region = 'eu-central-1', action, deviceId, commandCode, value } = req.body || {};

  if (!clientId || !clientSecret) {
    return res.status(400).json({ success: false, error: 'Missing Client ID or Secret' });
  }

  const host = REGION_HOSTS[region] || (region.includes('.') ? region : 'openapi.tuyaeu.com');

  try {
    // 1. Get Token from Tuya
    const tokenRes = await tuyaRequest(host, clientId, clientSecret, 'GET', '/v1.0/token?grant_type=1');
    if (!tokenRes.success) {
      return res.status(200).json({ 
        success: false, 
        error: `Tuya Auth Failed [Code ${tokenRes.code || 'UNKNOWN'}]: ${tokenRes.msg || 'Check Client ID, Secret, and selected Region'}`,
        details: tokenRes
      });
    }

    const token = tokenRes.result.access_token;
    const uid = tokenRes.result.uid;

    // Action A: Test Handshake
    if (action === 'test') {
      return res.status(200).json({ 
        success: true, 
        message: 'Tuya Cloud Handshake Successful!', 
        uid,
        endpoint: host
      });
    }

    // Action B: Auto-Import ALL Devices
    if (action === 'get_all_devices') {
      let devRes = await tuyaRequest(host, clientId, clientSecret, 'GET', `/v1.0/users/${uid}/devices`, null, token);
      
      let devices = [];
      if (devRes.success && devRes.result) {
        devices = Array.isArray(devRes.result) ? devRes.result : (devRes.result.devices || devRes.result.list || []);
      }

      if (!devRes.success) {
        return res.status(200).json({
          success: false,
          error: `Tuya Device Fetch Error [Code ${devRes.code || 'UNKNOWN'}]: ${devRes.msg || 'Unable to fetch devices for UID ' + uid}. Ensure your Smart Life / Tuya mobile app account is linked in your Tuya Cloud Project under "Link Tuya App Account".`,
          details: devRes
        });
      }

      return res.status(200).json({ success: true, devices, total: devices.length });
    }

    // Action C: Send Control Command (Toggle, dim, temp)
    if (action === 'command' && deviceId) {
      const payload = {
        commands: [
          { code: commandCode || 'switch_1', value: value }
        ]
      };
      const cmdRes = await tuyaRequest(host, clientId, clientSecret, 'POST', `/v1.0/devices/${deviceId}/commands`, payload, token);
      return res.status(200).json({ 
        success: cmdRes.success, 
        msg: cmdRes.msg,
        code: cmdRes.code,
        details: cmdRes 
      });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: `Connection Error: ${err.message}. If running in a restricted sandbox, external outbound HTTPS to Tuya Cloud may be blocked; deploy to Vercel for live production sync.`
    });
  }
}

