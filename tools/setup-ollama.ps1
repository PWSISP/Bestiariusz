<#
  Bestiariusz - przygotowanie Ollamy pod Claude Code (Qwen3 Coder 30B, kontekst 64k).

  Uruchom w katalogu projektu (albo kliknij 1-przygotuj-ollame.cmd):
    powershell -ExecutionPolicy Bypass -File bench\setup-ollama.ps1

  Opcje:
    -BaseModel NAZWA      model bazowy w Ollamie; domyslnie wykrywany (qwen3-coder:30b, qwen3-coder:latest, ...)
    -Name qwen3-coder-64k nazwa tworzonego modelu
    -Context 65536        dlugosc kontekstu w tokenach
    -NoKvQuant            bez kompresji pamieci kontekstu (plan B, jesli q8_0 psuje wywolania narzedzi)
    -Persist              zapisz ustawienia Ollamy na stale (zmienne uzytkownika Windows)
    -AllowPull            pozwol pobrac qwen3-coder:30b (okolo 19 GB), jesli go nie ma
    -LogFile PLIK         zapisuj przebieg do pliku

  Bez -Persist ustawienia dzialaja tylko dla serwera Ollamy uruchomionego przez ten skrypt;
  po ponownym uruchomieniu Ollamy wracaja ustawienia domyslne.
#>
param(
  [string]$BaseModel = "",
  [string]$Name = "qwen3-coder-64k",
  [int]$Context = 65536,
  [switch]$NoKvQuant,
  [switch]$Persist,
  [switch]$AllowPull,
  [string]$LogFile = ""
)
$ErrorActionPreference = "Stop"
$url = "http://localhost:11434"

if ($LogFile) {
  $dir = Split-Path -Parent $LogFile
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $LogFile -Value ("setup-ollama " + (Get-Date -Format s)) -Encoding UTF8
}
function Say([string]$msg, [string]$color = "") {
  if ($color) { Write-Host $msg -ForegroundColor $color } else { Write-Host $msg }
  if ($LogFile) { Add-Content -Path $LogFile -Value $msg -Encoding UTF8 }
}
function Fail([string]$msg) { Say $msg "Red"; exit 1 }
# PowerShell 5.1 treats any stderr line of a native program as an error when $ErrorActionPreference is Stop.
function Invoke-Native([scriptblock]$sb) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $text = & $sb 2>&1 | ForEach-Object { "$_" } | Out-String
    $code = $global:LASTEXITCODE
  } finally {
    $ErrorActionPreference = $prev
  }
  return [pscustomobject]@{ Out = $text; Code = $code }
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Fail "Nie znaleziono polecenia 'ollama'. Zainstaluj Ollame z https://ollama.com i uruchom skrypt ponownie."
}

# --- ustawienia serwera ---
$kv = $(if ($NoKvQuant) { $null } else { "q8_0" })
$vars = [ordered]@{
  "OLLAMA_FLASH_ATTENTION" = "1"
  "OLLAMA_NUM_PARALLEL"    = "1"
  "OLLAMA_CONTEXT_LENGTH"  = "$Context"
  "OLLAMA_KV_CACHE_TYPE"   = $kv
}
Say ("Ustawienia Ollamy" + $(if ($Persist) { " (zapisywane na stale):" } else { " (tylko dla tego uruchomienia):" }))
foreach ($k in $vars.Keys) {
  $v = $vars[$k]
  if ($null -eq $v) { Remove-Item -Path "Env:$k" -ErrorAction SilentlyContinue } else { Set-Item -Path "Env:$k" -Value $v }
  if ($Persist) { [Environment]::SetEnvironmentVariable($k, $v, "User") }
  Say ("  {0} = {1}" -f $k, $(if ($null -eq $v) { "(domyslna)" } else { $v }))
}

# --- restart Ollamy z tymi ustawieniami ---
Say "Restartuje Ollame..."
Get-Process -Name "ollama app", "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3
$app = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"
$serverLog = Join-Path $env:LOCALAPPDATA "Ollama\server.log"
$startedAt = Get-Date
if (Test-Path $app) {
  Start-Process -FilePath $app
} else {
  $serveOut = Join-Path $env:TEMP "bestiariusz-ollama-serve.log"
  Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden -RedirectStandardError $serveOut
  $serverLog = $serveOut
}

$v = $null
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 1
  try { $v = Invoke-RestMethod "$url/api/version"; break } catch { }
}
if (-not $v) { Fail "Ollama nie wystartowala w 45 s. Uruchom ja recznie i powtorz." }
Say "Ollama $($v.version) dziala."

Start-Sleep -Seconds 2
if (Test-Path $serverLog) {
  $cfg = Select-String -Path $serverLog -Pattern "server config" -ErrorAction SilentlyContinue | Select-Object -Last 1
  if ($cfg) {
    $line = $cfg.Line
    $show = @()
    foreach ($k in "OLLAMA_FLASH_ATTENTION", "OLLAMA_KV_CACHE_TYPE", "OLLAMA_NUM_PARALLEL", "OLLAMA_CONTEXT_LENGTH") {
      if ($line -match ("{0}:(\S*)" -f $k)) { $show += ("{0}={1}" -f $k, $Matches[1]) }
    }
    Say ("Serwer Ollamy potwierdza: " + ($show -join ", "))
  }
}

# --- model bazowy ---
$models = @((Invoke-RestMethod "$url/api/tags").models | ForEach-Object { $_.name })
Say ("Modele w Ollamie: " + $(if ($models.Count) { $models -join ", " } else { "brak" }))
if (-not $BaseModel) {
  foreach ($p in "qwen3-coder:30b", "qwen3-coder:latest") { if ($models -contains $p) { $BaseModel = $p; break } }
}
if (-not $BaseModel) {
  $BaseModel = $models | Where-Object { $_ -match "qwen3-coder" -and $_ -match "30b" -and $_ -notlike "$Name*" } | Select-Object -First 1
}
if (-not $BaseModel -or ($models -notcontains $BaseModel)) {
  if (-not $BaseModel) { $BaseModel = "qwen3-coder:30b" }
  if (-not $AllowPull) {
    Fail "Nie znalazlem modelu $BaseModel w Ollamie. Pobierz go: ollama pull qwen3-coder:30b (albo uruchom skrypt z -AllowPull)."
  }
  Say "Pobieram $BaseModel (okolo 19 GB)..."
  & ollama pull $BaseModel
  if ($LASTEXITCODE -ne 0) { Fail "Pobieranie nie powiodlo sie." }
}
Say "Model bazowy: $BaseModel"

# --- model z kontekstem 64k ---
Say "Tworze model $Name (kontekst $Context)..."
$modelfile = Join-Path $env:TEMP "bestiariusz-$Name.Modelfile"
Set-Content -Path $modelfile -Value "FROM $BaseModel`nPARAMETER num_ctx $Context" -Encoding ascii
$create = Invoke-Native { ollama create $Name -f $modelfile }
Remove-Item $modelfile -ErrorAction SilentlyContinue
if ($create.Code -ne 0) { Fail ("Tworzenie modelu nie powiodlo sie:`n" + $create.Out) }
Say "Model $Name utworzony."

# --- ladowanie i sprawdzenie pamieci ---
Say "Laduje model, zeby sprawdzic, czy miesci sie w pamieci karty (do kilku minut)..."
Invoke-Native { ollama stop $Name } | Out-Null
$body = @{ model = $Name; prompt = "ok"; stream = $false; options = @{ num_predict = 1 } } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "$url/api/generate" -Body $body -ContentType "application/json" -TimeoutSec 600 | Out-Null
} catch { Fail "Nie udalo sie zaladowac modelu: $_" }

$ps = Invoke-RestMethod "$url/api/ps"
$m = $ps.models | Where-Object { $_.name -like "$Name*" } | Select-Object -First 1
if ($m) {
  $pct = [math]::Round(100 * $m.size_vram / $m.size)
  $ctx = $(if ($m.context_length) { ", kontekst $($m.context_length)" } else { "" })
  Say ("Model zajmuje {0:N1} GB, z czego na GPU {1:N1} GB ({2}%){3}." -f ($m.size / 1e9), ($m.size_vram / 1e9), $pct, $ctx)
  if ($pct -lt 100) {
    Say "Czesc modelu jest w RAM, wiec bedzie wolniejszy. Mozesz sprobowac mniejszego kontekstu: -Context 49152" "Yellow"
  } else {
    Say "Model miesci sie w calosci na GPU." "Green"
  }
} else {
  Say "Nie widze modelu w 'ollama ps'." "Yellow"
}
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  $smi = Invoke-Native { nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader }
  Say ("GPU: " + $smi.Out.Trim())
}
Say ""
Say "Gotowe. Teraz uruchom probe: 2-proba.cmd (albo: node bench/run.mjs --tasks 01)"
