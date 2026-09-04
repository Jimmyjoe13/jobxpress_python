# -*- coding: utf-8 -*-
# Genere un JWT 'authenticated' signe avec le JWT_SECRET du VPS (simule better-auth)
import hmac, hashlib, base64, json, time, sys

def b64(d):
    return base64.urlsafe_b64encode(d).rstrip(b"=").decode()

secret = sys.argv[1]
sub = sys.argv[2]
h = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
p = b64(json.dumps({
    "sub": sub, "role": "authenticated", "aud": "authenticated",
    "email": "test@test.com", "iat": int(time.time()), "exp": int(time.time()) + 3600,
}, separators=(",", ":")).encode())
sig = b64(hmac.new(secret.encode(), (h + "." + p).encode(), hashlib.sha256).digest())
print(h + "." + p + "." + sig)
