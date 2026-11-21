$key = (Get-Clipboard -Raw).Trim()
$lines = [System.IO.File]::ReadAllLines((Join-Path (Get-Location) "keys.txt"))
$updated = [System.Collections.Generic.List[string]]::new()
$done = $false
foreach ($line in $lines) {
  if ($line.StartsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
    $updated.Add("SUPABASE_SERVICE_ROLE_KEY=" + $key)
    $done = $true
  } else {
    $updated.Add($line)
  }
}
if (-not $done) { $updated.Add("SUPABASE_SERVICE_ROLE_KEY=" + $key) }
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) "keys.txt"), $updated)
Write-Output ("service_role guardada (tamanho " + $key.Length + ")")
