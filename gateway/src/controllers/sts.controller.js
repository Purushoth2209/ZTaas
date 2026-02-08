import { JWTService } from '../services/jwt.service.js';

export const issueToken = (req, res) => {
  try {
    const { sub, aud = 'api-clients', scope = 'read', ...customClaims } = req.body;
    
    if (!sub) {
      return res.status(400).json({ error: 'Subject (sub) is required' });
    }

    const payload = {
      sub,
      aud,
      scope,
      ...customClaims
    };

    const token = JWTService.signToken(payload);
    
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to issue token' });
  }
};

export const verifyToken = (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = JWTService.verifyToken(token);
    res.json({ valid: true, payload: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
};