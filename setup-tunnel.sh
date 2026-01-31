#!/bin/bash
set -e

echo "Updating Cloudflare tunnel config..."
sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: 98713d2f-8a08-44dc-8467-8d9c75e415a4
credentials-file: /Users/jriddle/.cloudflared/98713d2f-8a08-44dc-8467-8d9c75e415a4.json

ingress:
  - hostname: hello.ghost0x.com
    service: http://localhost:80
  - hostname: claude.ghost0x.com
    service: http://localhost:8080
  - service: http_status:404
EOF

echo "Restarting cloudflared service..."
sudo launchctl stop com.cloudflare.cloudflared
sudo launchctl start com.cloudflare.cloudflared

echo "Done! https://claude.ghost0x.com should be live."
