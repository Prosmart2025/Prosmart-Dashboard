// api/tuya.js - Vercel Serverless Function for Tuya Cloud OpenAPI
import crypto from 'crypto';

const REGION_HOSTS = {
  'eu-central-1': 'openapi.tuyaeu.com',
  'us-east-1': 'openapi.tuyaus.com',
  'us-west-2': 'openapi-weaz.tuyaus.com',
  'cn-north-1': 'openapi.tuyacn.com',
  'in-south-1': 'openapi.tuyain.com'
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

  const host = REGION_HOSTS[region] || 'openapi.tuyaeu.com';

  try {
    // 1. Get Token from Tuya
    const tokenRes = await tuyaRequest(host, clientId, clientSecret, 'GET', '/v1.0/token?grant_type=1');
    if (!tokenRes.success) {
      return res.status(200).json({ 
        success: false, 
        error: `Tuya Auth Failed: ${tokenRes.msg || 'Check Client ID & Secret in Tuya Console'}` 
      });
    }

    const token = tokenRes.result.access_token;
    const uid = tokenRes.result.uid;

    // Action A: Test Handshake
    if (action === 'test') {
      return res.status(200).json({ success: true, message: 'Tuya Cloud Handshake Successful!', uid });
    }

    // Action B: Auto-Import ALL Devices (100+ devices in one click)
    if (action === 'get_all_devices') {
      // First try fetching devices linked to the developer UID or Cloud Project
      let devRes = await tuyaRequest(host, clientId, clientSecret, 'GET', `/v1.0/users/${uid}/devices`, null, token);
      
      // If user endpoint is empty, query cloud project device list
      if (!devRes.success || !devRes.result || devRes.result.length === 0) {
        devRes = await tuyaRequest(host, clientId, clientSecret, 'GET', `/v1.0/devices`, null, token);
      }

      const devices = (devRes.result && (devRes.result.devices || devRes.result)) || [];
      return res.status(200).json({ success: true, devices });
    }

    // Action C: Send Control Command (Toggle, dim, temp)
    if (action === 'command' && deviceId) {
      const payload = {
        commands: [
          { code: commandCode || 'switch_1', value: value }
        ]
      };
      const cmdRes = await tuyaRequest(host, clientId, clientSecret, 'POST', `/v1.0/devices/${deviceId}/commands`, payload, token);
      return res.status(200).json({ success: cmdRes.success, msg: cmdRes.msg });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
