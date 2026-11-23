$token = (Get-Clipboard -Raw).Trim()
if (-not $token.StartsWith("ghp_")) { throw "Token GitHub inválido" }
[System.IO.File]::WriteAllText((Join-Path (Get-Location) ".github-token.txt"), $token)
Write-Output ("Token guardado (tamanho " + $token.Length + ")")
