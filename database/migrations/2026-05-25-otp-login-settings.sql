-- OTP login (MSG91) system settings — disabled by default
INSERT INTO system_settings (key, value, type, description, created_at, updated_at)
VALUES
  (
    'otp_login_enabled',
    'false',
    'boolean',
    'When true and MSG91 credentials are configured, phone OTP login appears on the login page.',
    NOW(),
    NOW()
  ),
  (
    'MSG91_AUTH_KEY',
    '',
    'string',
    'MSG91 authentication key (authkey).',
    NOW(),
    NOW()
  ),
  (
    'MSG91_TEMPLATE_ID',
    '',
    'string',
    'MSG91 OTP template ID.',
    NOW(),
    NOW()
  ),
  (
    'MSG91_OTP_LENGTH',
    '6',
    'number',
    'OTP digit length sent via MSG91.',
    NOW(),
    NOW()
  ),
  (
    'MSG91_OTP_EXPIRY',
    '5',
    'number',
    'OTP expiry in minutes.',
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
