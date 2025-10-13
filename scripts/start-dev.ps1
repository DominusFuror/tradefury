param(
    [switch]$SkipInstall
)

$repoRoot = Resolve-Path "$PSScriptRoot\.."

Push-Location $repoRoot

try {
    if (-not $SkipInstall -and -not (Test-Path "$repoRoot\node_modules")) {
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        npm install
    }

    Write-Host "Starting development server..." -ForegroundColor Cyan
    npm start
}
finally {
    Pop-Location
}

