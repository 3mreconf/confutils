# ConfUtils Publish Script
# Usage: ./publish.ps1 (auto-increments patch) or ./publish.ps1 "v2.1.2"

param (
    [Parameter(Mandatory=$false)]
    [string]$Version
)

# 1. Get current version from package.json
if (!(Test-Path "package.json")) {
    Write-Error "package.json not found!"
    exit 1
}

$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$OldVersion = $PackageJson.version

# 2. Determine new version
if ([string]::IsNullOrWhiteSpace($Version)) {
    # Auto-increment patch version (e.g., 2.1.1 -> 2.1.2)
    $versionParts = $OldVersion.Split('.')
    if ($versionParts.Count -eq 3) {
        $patch = [int]$versionParts[2] + 1
        $NewVersion = "$($versionParts[0]).$($versionParts[1]).$patch"
    } else {
        Write-Error "Could not parse version: $OldVersion"
        exit 1
    }
} else {
    # Use provided version (remove leading 'v' if present)
    $NewVersion = $Version.Replace('v', '')
}

$TagVersion = "v" + $NewVersion

Write-Host "--- Starting Publish Process for $TagVersion ---" -ForegroundColor Cyan

# 3. Update package.json
Write-Host "Updating package.json: $OldVersion -> $NewVersion" -ForegroundColor Yellow
$PackageJson.version = $NewVersion
$PackageJson | ConvertTo-Json | Set-Content "package.json"

# 4. Git process
Write-Host "Staging changes..." -ForegroundColor Gray
git add .

Write-Host "Committing changes..." -ForegroundColor Gray
git commit -m "Release $TagVersion"

Write-Host "Creating tag $TagVersion..." -ForegroundColor Gray
git tag -a $TagVersion -m "Release $TagVersion"

Write-Host "Pushing to GitHub..." -ForegroundColor Magenta
git push origin main
git push origin $TagVersion

Write-Host "--- Publish Complete! ---" -ForegroundColor Green
