$ErrorActionPreference = "Continue"
$env:VERCEL_TOKEN = (Get-Content (Join-Path (Get-Location) "vercel-token.txt") -Raw).Trim()
$values = @{}
foreach ($line in (Get-Content (Join-Path (Get-Location) "keys.txt"))) {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}
$defaults = @{
  "APP_URL" = "https://lubacortes.vercel.app"
  "TRANSCRIPTION_PROVIDER" = "groq"
  "TRANSLATION_PROVIDER" = "groq"
  "GROQ_TRANSCRIBE_MODEL" = "whisper-large-v3-turbo"
  "GROQ_CHAT_MODEL" = "openai/gpt-oss-20b"
  "PAYMENT_MODE" = "test"
  "PAYMENT_REFERENCE_ENABLED" = "true"
  "PAYMENT_EXPRESS_ENABLED" = "true"
  "MAIL_FROM" = "noreply@lubacortes.local"
  "AUTOFOCUS_PROVIDER" = "none"
}
$names = @("APP_URL","APP_SECRET","DATABASE_URL","SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_STORAGE_BUCKET","NEXT_PUBLIC_SUPABASE_URL","GROQ_API_KEY","GROQ_TRANSCRIBE_MODEL","GROQ_CHAT_MODEL","TRANSCRIPTION_PROVIDER","TRANSLATION_PROVIDER","AUTOFOCUS_PROVIDER","PAYMENT_MODE","PAYMENT_REFERENCE_ENABLED","PAYMENT_EXPRESS_ENABLED","PAYMENT_TRANSFER_IBAN","PAYMENT_TRANSFER_BANK","PAYMENT_TRANSFER_ACCOUNT_NAME","PAYMENT_TEST_CONFIRM_TOKEN","PAYMENT_WEBHOOK_SECRET","SMTP_URL","MAIL_FROM","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REDIRECT_URI")
foreach ($name in $names) {
  $value = $values[$name]
  if (-not $value) { $value = $defaults[$name] }
  if (-not $value) { $value = "" }
  $value | & vercel.cmd env add $name production --force 2>&1 | Out-Null
  Write-Output ("OK " + $name)
}
