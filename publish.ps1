# ConfUtils Advanced Publish Script
# Usage: ./publish.ps1 -BumpType patch (default) | minor | major

param(
    [Parameter(Position=0)]
    [ValidateSet("patch", "minor", "major")]
    [string]$BumpType = "patch"
)

# 1. Check if required config files exist
if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] Could not find package.json in the current directory." -ForegroundColor Red
    exit 1
}
$TauriConfigPath = "src-tauri/tauri.conf.json"
if (!(Test-Path $TauriConfigPath)) {
    Write-Host "[ERROR] Could not find tauri.conf.json at $TauriConfigPath" -ForegroundColor Red
    exit 1
}

Write-Host ">>> Creating release with version bump: $BumpType" -ForegroundColor Cyan

# 2. Get current version and bump it
Write-Host "`n[1/4] Bouncing version..." -ForegroundColor Yellow
$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$OldVersion = $PackageJson.version

$versionParts = $OldVersion.Split('.')
if ($versionParts.Count -ne 3) {
    Write-Host "[ERROR] Could not parse version $OldVersion. Expected format X.Y.Z" -ForegroundColor Red
    exit 1
}

[int]$major = $versionParts[0]
[int]$minor = $versionParts[1]
[int]$patch = $versionParts[2]

switch ($BumpType) {
    "major" { 
        $major++
        $minor = 0
        $patch = 0
    }
    "minor" { 
        $minor++
        $patch = 0
    }
    "patch" { 
        $patch++
    }
}

$NewVersion = "$major.$minor.$patch"
$TagVersion = "v$NewVersion"

# 3. Update Config Files
Write-Host "Updating package.json: $OldVersion -> $NewVersion" -ForegroundColor Green
$PackageJson.version = $NewVersion
$PackageJson | ConvertTo-Json | Set-Content "package.json"

Write-Host "Updating tauri.conf.json: -> $NewVersion" -ForegroundColor Green
$TauriJson = Get-Content $TauriConfigPath | ConvertFrom-Json
$TauriJson.version = $NewVersion
$TauriJson | ConvertTo-Json | Set-Content $TauriConfigPath

# 4. Git operations
Write-Host "`n[2/4] Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "chore: bump version to $NewVersion and sync all configs"

Write-Host "`n[3/4] Creating tag $TagVersion..." -ForegroundColor Yellow
git tag -a $TagVersion -m "Release $TagVersion"

# 5. Pushing to GitHub
Write-Host "`n[4/4] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
git push origin $TagVersion

Write-Host "`nSUCCESS: Release created! GitHub Actions will build and publish the release." -ForegroundColor Green
Write-Host "Release URL: https://github.com/3mreconf/confutils/releases/tag/$TagVersion" -ForegroundColor Cyan
