# ConfUtils Publish Script
# Usage: ./publish.ps1 "v2.0.6"

param (
    [Parameter(Mandatory=$true)]
    [string]$Version
)

# Ensure version starts with 'v' if it's just numbers
if ($Version -notmatch "^v") {
    $Version = "v" + $Version
}

Write-Host "--- Starting Publish Process for $Version ---" -ForegroundColor Cyan

# 1. Sync files (optional if you want to update package.json automatically)
$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$OldVersion = $PackageJson.version
Write-Host "Updating package.json: $OldVersion -> $($Version.Replace('v', ''))" -ForegroundColor Yellow
$PackageJson.version = $Version.Replace('v', '')
$PackageJson | ConvertTo-Json | Set-Content "package.json"

# 2. Git process
Write-Host "Staging changes..." -ForegroundColor Gray
git add .

Write-Host "Committing changes..." -ForegroundColor Gray
git commit -m "Release $Version"

Write-Host "Creating tag $Version..." -ForegroundColor Gray
git tag -a $Version -m "Release $Version"

Write-Host "Pushing to GitHub..." -ForegroundColor Magenta
git push origin main
git push origin $Version

Write-Host "--- Publish Complete! ---" -ForegroundColor Green
