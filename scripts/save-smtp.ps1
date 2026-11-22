$key = (Get-Clipboard -Raw).Trim()
if (-not $key.StartsWith("xsmtpsib-")) { throw "Chave SMTP inválida" }
$smtp = "smtps://c475de001%40smtp-brevo.com:$key@smtp-relay.brevo.com:587"
$keys = Join-Path (Get-Location) "keys.txt"
$lines = [System.IO.File]::ReadAllLines($keys)
$out = [System.Collections.Generic.List[string]]::new()
$done = $false
foreach ($line in $lines) {
  if ($line.StartsWith("SMTP_URL=")) { $out.Add("SMTP_URL=" + $smtp); $done = $true }
  else { $out.Add($line) }
}
if (-not $done) { $out.Add("SMTP_URL=" + $smtp) }
[System.IO.File]::WriteAllLines($keys, $out)
Write-Output ("SMTP_URL guardada (chave com " + $key.Length + " caracteres)")
