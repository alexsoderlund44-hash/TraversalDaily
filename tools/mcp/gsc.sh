#!/bin/sh
# Starts the Google Search Console MCP server (AminForou/mcp-gsc, PyPI mcp-search-console).
# Credentials, first match wins:
#   GSC_SERVICE_ACCOUNT_JSON   the service-account key JSON itself (cloud sessions: store it as an environment secret)
#   GSC_CREDENTIALS_PATH       path to a service-account key file
#   GSC_OAUTH_CLIENT_SECRETS_FILE  path to an OAuth desktop-client file (local machine; opens a browser once)
# Give the service account "Restricted" (read-only) access in Search Console. Destructive tools stay off.
set -e
dir="${GSC_CONFIG_DIR:-$HOME/.config/mcp-gsc}"
mkdir -p "$dir"
if [ -n "$GSC_SERVICE_ACCOUNT_JSON" ]; then
  umask 077
  printf '%s' "$GSC_SERVICE_ACCOUNT_JSON" > "$dir/service_account.json"
  export GSC_CREDENTIALS_PATH="$dir/service_account.json" GSC_SKIP_OAUTH=true
fi
export GSC_ALLOW_DESTRUCTIVE=false
exec uvx mcp-search-console@0.4.1
