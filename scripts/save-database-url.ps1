$lines = [System.IO.File]::ReadAllLines((Join-Path (Get-Location) "keys.txt"))
$pass = ($lines | Where-Object { $_.StartsWith("SUPABASE_DB_PASSWORD=") } | Select-Object -First 1).Substring(21)
$encoded = [uri]::EscapeDataString($pass)
$url = "postgresql://postgres:" + $encoded + "@db.jnbyyrplxqpvhpfnofhq.supabase.co:5432/postgres"
$out = [System.Collections.Generic.List[string]]::new()
$done = $false
foreach ($line in $lines) {
  if ($line.StartsWith("DATABASE_URL=")) {
    $out.Add("DATABASE_URL=" + $url)
    $done = $true
  } else {
    $out.Add($line)
  }
}
if (-not $done) { $out.Add("DATABASE_URL=" + $url) }
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) "keys.txt"), $out)
Write-Output ("DATABASE_URL guardada (host db.jnbyyrplxqpvhpfnofhq.supabase.co)")
