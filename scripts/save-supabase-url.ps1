$values = @{
  "SUPABASE_URL" = "https://jnbyyrplxqpvhpfnofhq.supabase.co"
  "NEXT_PUBLIC_SUPABASE_URL" = "https://jnbyyrplxqpvhpfnofhq.supabase.co"
  "SUPABASE_PROJECT_REF" = "jnbyyrplxqpvhpfnofhq"
  "SUPABASE_STORAGE_BUCKET" = "lubacortes-private"
}
$lines = [System.IO.File]::ReadAllLines((Join-Path (Get-Location) "keys.txt"))
$updated = [System.Collections.Generic.List[string]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new()
foreach ($line in $lines) {
  $key = ($line -split "=", 2)[0]
  if ($values.ContainsKey($key)) {
    $updated.Add($key + "=" + $values[$key])
    [void]$seen.Add($key)
  } else {
    $updated.Add($line)
  }
}
foreach ($k in $values.Keys) {
  if (-not $seen.Contains($k)) { $updated.Add($k + "=" + $values[$k]) }
}
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) "keys.txt"), $updated)
Write-Output "URL do projecto e bucket guardados"
