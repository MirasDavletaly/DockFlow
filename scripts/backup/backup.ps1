<#
.SYNOPSIS
  Ночной бэкап исходного кода DocFlow на GitHub.

.DESCRIPTION
  «Тест день 3»: «автобэкап на сервера: сохраняет копию, но не трогает
  оригинал, каждые 24 часа в 00:00, а старый автоматом удалять».

  Снимок – всё, что лежит в папке проекта, с учётом .gitignore (без
  node_modules, dist, .env), включая ещё не закоммиченные правки. Он
  собирается во временном индексе git: рабочие файлы, настоящий индекс и
  текущая ветка не меняются. Снимок уходит в ветку backup/ГГГГ-ММ-ДД на
  GitHub; хранятся последние -Keep снимков, более старые ветки удаляются.

  Восстановление и установка – docs/backup.md.

.PARAMETER Keep
  Сколько последних снимков хранить на GitHub. По умолчанию 7.

.PARAMETER DryRun
  Собрать снимок и показать, что было бы отправлено, ничего не отправляя.
#>
param(
  [int]$Keep = 7,
  [string]$Remote = 'origin',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logDir = Join-Path $env:LOCALAPPDATA 'DocFlow'
$log = Join-Path $logDir 'backup.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log([string]$message) {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
  Write-Output $line
  Add-Content -Path $log -Value $line -Encoding UTF8
}

# Успех git решает код возврата. Предупреждения git пишет в поток ошибок, и
# Windows PowerShell 5.1 при $ErrorActionPreference = 'Stop' принял бы их за
# сбой, поэтому поток ошибок здесь только собирается для сообщения.
function Invoke-Git {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & git -C $repo @args 2>&1
  }
  finally {
    $ErrorActionPreference = $previous
  }
  $isError = { $_ -is [System.Management.Automation.ErrorRecord] }
  $stdout = @($output | Where-Object { -not (& $isError) } | ForEach-Object { "$_" })
  $stderr = @($output | Where-Object $isError | ForEach-Object { "$_" })
  if ($LASTEXITCODE -ne 0) { throw "git $($args -join ' '): $($stderr -join ' ')" }
  return $stdout
}

try {
  $date = Get-Date -Format 'yyyy-MM-dd'
  $branch = "backup/$date"

  # Временный индекс: настоящий индекс и рабочие файлы не трогаются.
  $tempIndex = Join-Path $env:TEMP ("docflow-backup-index-{0}" -f $PID)
  $env:GIT_INDEX_FILE = $tempIndex
  try {
    Invoke-Git read-tree HEAD | Out-Null
    Invoke-Git add -A | Out-Null
    $tree = (Invoke-Git write-tree).Trim()
  }
  finally {
    Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
    Remove-Item $tempIndex -ErrorAction SilentlyContinue
  }

  $head = (Invoke-Git rev-parse HEAD).Trim()
  $messageFile = Join-Path $env:TEMP ("docflow-backup-message-{0}.txt" -f $PID)
  [IO.File]::WriteAllText(
    $messageFile,
    "backup: снимок рабочей папки $date`n`nСоздан scripts/backup/backup.ps1. Родитель – текущий HEAD.`n",
    (New-Object Text.UTF8Encoding $false)
  )
  try {
    $commit = (Invoke-Git commit-tree $tree -p $head -F $messageFile).Trim()
  }
  finally {
    Remove-Item $messageFile -ErrorAction SilentlyContinue
  }

  $changed = (Invoke-Git diff --name-only $head $commit) | Where-Object { $_ -ne '' }
  Write-Log ("снимок {0}: поверх {1}, изменённых файлов {2}" -f $commit.Substring(0, 8), $head.Substring(0, 8), @($changed).Count)

  if ($DryRun) {
    Write-Log "проверка вхолостую: в $Remote ушла бы ветка $branch; ничего не отправлено"
    exit 0
  }

  Invoke-Git push --force $Remote "${commit}:refs/heads/$branch" | Out-Null
  Write-Log "отправлено: $Remote/$branch"

  # Старые снимки: хранятся последние $Keep по дате в имени ветки.
  $backups = Invoke-Git ls-remote --heads $Remote 'refs/heads/backup/*' |
    ForEach-Object { ($_ -split '\s+')[1] -replace '^refs/heads/', '' } |
    Where-Object { $_ -match '^backup/\d{4}-\d{2}-\d{2}$' } |
    Sort-Object -Descending
  foreach ($old in ($backups | Select-Object -Skip $Keep)) {
    Invoke-Git push $Remote --delete $old | Out-Null
    Write-Log "удалён старый снимок: $old"
  }
}
catch {
  Write-Log "ОШИБКА: $($_.Exception.Message)"
  exit 1
}
