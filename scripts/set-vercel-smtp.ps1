$env:VERCEL_TOKEN = (Get-Content (Join-Path (Get-Location) "vercel-token.txt") -Raw).Trim()
$smtp = (Get-Content (Join-Path (Get-Location) "keys.txt") | Where-Object { $_.StartsWith("SMTP_URL=") } | Select-Object -First 1).Substring(9)
$smtp | & vercel.cmd env add SMTP_URL production --force 2>&1 | Out-Null
Write-Output "SMTP_URL configurada na Vercel"
