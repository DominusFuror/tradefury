param(
    [switch]$SkipInstall,
    [string]$ClientHost = "192.168.0.113",
    [int]$Port = 3000,
    [string]$StorageHost = "192.168.0.113",
    [int]$StoragePort = 3001
)

$repoRoot = Resolve-Path "$PSScriptRoot\.."

Push-Location $repoRoot

$storageJob = $null

try {
    $shouldInstall = $true
    if ($SkipInstall) {
        $shouldInstall = $false
    } elseif (Test-Path "$repoRoot\node_modules") {
        $shouldInstall = $false
    }

    if (-not $shouldInstall) {
        $requiredModules = @("cors", "express")
        foreach ($moduleName in $requiredModules) {
            $modulePath = Join-Path $repoRoot "node_modules\$moduleName"
            if (-not (Test-Path $modulePath)) {
                $shouldInstall = $true
                break
            }
        }
    }

    if ($shouldInstall) {
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        & npm install
        $installExitCode = $LASTEXITCODE
        if ($installExitCode -ne 0) {
            Write-Warning "npm install failed with exit code $installExitCode. Retrying with --legacy-peer-deps..."
            & npm install --legacy-peer-deps
            $installExitCode = $LASTEXITCODE
            if ($installExitCode -ne 0) {
                throw "npm install failed with exit code $installExitCode (including legacy retry)."
            }
        }
    } else {
        Write-Host "Using existing node_modules (pass -SkipInstall to suppress this check)." -ForegroundColor DarkGray
    }

    Write-Host "Starting shared storage service on port $StoragePort ..." -ForegroundColor Cyan
    $storageJob = Start-Job -Name "TradeFuryStorage" -ScriptBlock {
        param($rootPath, $port)
        Push-Location $rootPath
        try {
            $env:PORT = "$port"
            $env:DATA_DIR = Join-Path $rootPath "server\data"
            node server/index.js
        }
        finally {
            Pop-Location
        }
    } -ArgumentList $repoRoot, $StoragePort

    Start-Sleep -Seconds 2
    $jobState = (Get-Job -Id $storageJob.Id).State
    if ($jobState -eq 'Failed' -or $jobState -eq 'Stopped') {
        Write-Error "Failed to start shared storage service."
        Receive-Job -Id $storageJob.Id -Keep | ForEach-Object { Write-Error $_ }
        throw "Storage service failed to start."
    }

    $storageUrl = "http://$StorageHost`:$StoragePort/api"
    Write-Host "Shared storage available at $storageUrl" -ForegroundColor Green

    $env:HOST = $ClientHost
    $env:PORT = "$Port"
    $env:REACT_APP_ENABLE_SHARED_STORAGE = "true"
    $env:REACT_APP_API_URL = $storageUrl

    Write-Host "Starting React development server on http://$ClientHost`:$Port ..." -ForegroundColor Cyan
    npm run start
}
finally {
    if ($storageJob) {
        Write-Host "`nStopping shared storage service..." -ForegroundColor Cyan
        Stop-Job -Id $storageJob.Id -ErrorAction SilentlyContinue | Out-Null
        Receive-Job -Id $storageJob.Id -Keep | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                Write-Error $_
            } elseif ($_ -ne $null) {
                Write-Host $_
            }
        }
        Remove-Job -Id $storageJob.Id -ErrorAction SilentlyContinue
    }

    Pop-Location
}
