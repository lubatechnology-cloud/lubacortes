# Deploy Lubacortes na Vercel.
# 1. Criar token em https://vercel.com/account/tokens
# 2. Colar o token em vercel-token.txt (na raiz) — ficheiro ignorado pelo git
# 3. Executar: powershell -ExecutionPolicy Bypass -File scripts/vercel-deploy.ps1
$ErrorActionPreference = "Continue"
$root = (Get-Location).Path
$tokenFile = Join-Path $root "vercel-token.txt"
if (-not (Test-Path $tokenFile)) { throw "Falta vercel-token.txt com o token da Vercel" }
$env:VERCEL_TOKEN = (Get-Content $tokenFile -Raw).Trim()

$keysFile = Join-Path $root "keys.txt"
$values = @{}
foreach ($line in (Get-Content $keysFile)) {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}

$names = @(
  "APP_URL", "APP_SECRET", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET", "NEXT_PUBLIC_SUPABASE_URL", "GROQ_API_KEY",
  "GROQ_TRANSCRIBE_MODEL", "GROQ_CHAT_MODEL", "TRANSCRIPTION_PROVIDER", "TRANSLATION_PROVIDER",
  "AUTOFOCUS_PROVIDER", "PAYMENT_MODE", "PAYMENT_REFERENCE_ENABLED", "PAYMENT_EXPRESS_ENABLED",
  "PAYMENT_TRANSFER_IBAN", "PAYMENT_TRANSFER_BANK", "PAYMENT_TRANSFER_ACCOUNT_NAME",
  "PAYMENT_TEST_CONFIRM_TOKEN", "PAYMENT_WEBHOOK_SECRET", "SMTP_URL", "MAIL_FROM",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI",
  "KURSINHA_WEBHOOK_SECRET", "KURSINHA_PRODUCTS"
)

foreach ($name in $names) {
  $value = ""
  if ($values.ContainsKey($name)) { $value = $values[$name] }
  if (-not $value -and $name -eq "APP_URL") { $value = "https://lubacortes.vercel.app" }
  if (-not $value -and $name -eq "APP_SECRET") { $value = -join ((48..57) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ }) }
  if (-not $value -and $name -eq "PAYMENT_TEST_CONFIRM_TOKEN") { $value = -join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) }
  if (-not $value -and $name -eq "PAYMENT_WEBHOOK_SECRET") { $value = -join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) }
  # Valores vazios não são enviados: não apagam configurações existentes na Vercel.
  if (-not $value) { continue }
  $value | & vercel.cmd env add $name production --force 2>$null | Out-Null
  Write-Output ("variável " + $name + " configurada")
}

& vercel.cmd link --yes
& vercel.cmd --prod --yes
