import json

with open('vercel.json', 'r') as f:
    config = json.load(f)

# Ensure rewrites exist
if 'rewrites' not in config:
    config['rewrites'] = []

# Check if /api/(.*) is already there
has_api_rewrite = any(r.get('source') == '/api/(.*)' for r in config['rewrites'])

if not has_api_rewrite:
    # Insert at the beginning so it takes precedence
    config['rewrites'].insert(0, {
        "source": "/api/(.*)",
        "destination": "/api/index"
    })

with open('vercel.json', 'w') as f:
    json.dump(config, f, indent=2)

print("done")
