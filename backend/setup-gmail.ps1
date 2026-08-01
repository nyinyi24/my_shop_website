param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[^@\s]+@gmail\.com$')]
    [string] $GmailAddress
)

$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'

if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Missing Laravel environment file: $envPath"
}

$securePassword = Read-Host 'Google App Password (16 characters)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) -replace '\s', ''

    if ($appPassword.Length -ne 16) {
        throw 'Google App Password must contain exactly 16 characters (spaces are ignored).'
    }

    $settings = [ordered]@{
        MAIL_MAILER      = 'smtp'
        MAIL_SCHEME      = 'null'
        MAIL_HOST        = 'smtp.gmail.com'
        MAIL_PORT        = '587'
        MAIL_USERNAME    = $GmailAddress
        MAIL_PASSWORD    = $appPassword
        MAIL_FROM_ADDRESS = $GmailAddress
        MAIL_FROM_NAME   = '"${APP_NAME}"'
    }

    $content = Get-Content -LiteralPath $envPath -Raw
    foreach ($entry in $settings.GetEnumerator()) {
        $line = "$($entry.Key)=$($entry.Value)"
        $pattern = "(?m)^$([regex]::Escape($entry.Key))=.*$"

        if ($content -match $pattern) {
            $content = [regex]::Replace($content, $pattern, $line)
        } else {
            $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
        }
    }

    Set-Content -LiteralPath $envPath -Value $content -Encoding utf8
    Push-Location $PSScriptRoot
    try {
        php artisan config:clear
    } finally {
        Pop-Location
    }

    Write-Host 'Gmail SMTP is configured. Restart the Laravel server, then resend the verification email.' -ForegroundColor Green
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $appPassword = $null
}
