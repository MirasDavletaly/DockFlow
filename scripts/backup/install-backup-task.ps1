<#
.SYNOPSIS
  Ставит ночной бэкап DocFlow в планировщик Windows: каждый день в 00:00.

.DESCRIPTION
  Задача работает от имени текущего пользователя, пока он вошёл в Windows.
  Если в 00:00 компьютер выключен или спит, бэкап запустится при следующем
  включении (StartWhenAvailable). Снять задачу: -Remove.

  Перед установкой репозиторий на GitHub должен быть приватным: снимок
  отправляется туда целиком (docs/backup.md).
#>
param([switch]$Remove)

$ErrorActionPreference = 'Stop'
$name = 'DocFlow nightly backup'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
  Write-Output "Задача «$name» снята."
  exit 0
}

$script = Join-Path $PSScriptRoot 'backup.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $script)
$trigger = New-ScheduledTaskTrigger -Daily -At '00:00'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Снимок исходного кода DocFlow в ветку backup/ГГГГ-ММ-ДД на GitHub; хранятся 7 последних.' `
  -Force | Out-Null

Write-Output "Задача «$name» поставлена: каждый день в 00:00. Журнал: $env:LOCALAPPDATA\DocFlow\backup.log"
