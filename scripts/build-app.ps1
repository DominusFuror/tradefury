param(
    [switch]$SkipInstall,
    [switch]$SkipCleanup
)

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$buildPath = Join-Path $repoRoot "build"

Push-Location $repoRoot

try {
    if (-not $SkipInstall -and -not (Test-Path "$repoRoot\node_modules")) {
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        npm install
    }

    if (-not $SkipCleanup -and (Test-Path $buildPath)) {
        Write-Host "Removing previous build output..." -ForegroundColor Cyan
        Remove-Item $buildPath -Recurse -Force
    }

    Write-Host "Building production bundle..." -ForegroundColor Cyan
    npm run build
}
finally {
    Pop-Location
}

