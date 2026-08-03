# TMS App Platform Agent (placeholder)
# Replace this file with the real agent binary when available.

$ErrorActionPreference = "Stop"

$configPath = if ($env:TMS_AGENT_CONFIG) { $env:TMS_AGENT_CONFIG } else { "C:\ProgramData\tms-agent\config.json" }

if (-not (Test-Path $configPath)) {
  Write-Error "Config not found: $configPath"
}

Write-Host "TMS App Platform Agent placeholder"
Write-Host "Config: $configPath"
Write-Host "Waiting for real agent binary..."
